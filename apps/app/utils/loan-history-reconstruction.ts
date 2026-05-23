import type { LoanEvent } from "@/types/interfaces";

/**
 * Recovering Roll-event amounts from legacy vault deployments.
 *
 * Early Oikos vaults emitted `RollLoan(address indexed who)` with no
 * non-indexed payload — neither the amount nor the new duration. Indexers
 * therefore record the event but leave args.amount / args.duration empty.
 * Modern vaults (`ExtVault.sol`, `ExtVaultLending.sol`) emit the full
 * `RollLoan(who, amount, newDuration)` signature.
 *
 * This module is Phase 1 of the recovery work: it handles vaults whose
 * Roll events are missing values but whose Payback events are intact
 * (which is the common case for users who interacted across both eras).
 * Phase 1 also assumes no silent migration injection — see [[migrateLoan]]
 * notes in core_contracts/src/vault/LendingOpsVault.sol.
 *
 * Algorithm:
 *   1. Walk the event log forward using only KNOWN decoded values to
 *      establish a running borrow principal at each missing Roll point.
 *   2. Infer each missing Roll's duration from the gap to the next
 *      Roll/Borrow event (or the active loan's expiry for the last roll).
 *   3. Have the caller batch `LendingVault.calculateLoanFees(borrow_before,
 *      duration)` for each missing Roll — that's the contract-true fee
 *      that got capitalised into principal under the legacy semantics.
 *   4. Reconcile the sum of computed fees against the conservation-law
 *      residual `currentBorrowed − ΣBorrows − ΣRolls_known + ΣPaybacks`.
 *      Scale uniformly when off, distribute wei dust to the first event
 *      so the total matches exactly.
 *
 * Pure functions; the React hook owns the contract reads.
 */

/** Fallback duration when neither neighbouring events nor expiry help. */
const DEFAULT_DURATION_SEC = 30n * 86400n;

/** Tolerance for the "scaling barely needed" sanity warning (basis points). */
const RECONCILE_TOLERANCE_BPS = 100n; // 1%

function tsToSec(t: number): bigint {
  return BigInt(t > 1e12 ? Math.floor(t / 1000) : t);
}

function parseBig(v: string | undefined): bigint {
  if (v == null || v === "") return 0n;
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
}

function isMissingRoll(ev: LoanEvent): boolean {
  if (ev.eventName !== "RollLoan") return false;
  return ev.args.amount == null || ev.args.amount === "";
}

function isMissingPayback(ev: LoanEvent): boolean {
  if (ev.eventName !== "Payback") return false;
  return ev.args.amount == null || ev.args.amount === "";
}

export interface MissingRollInfo {
  /** Index of the event inside ReconstructionPlan.sortedEvents. */
  index: number;
  /** Stable LoanEvent.id, useful for keying contract reads on the React side. */
  eventId: string;
  /** Running principal immediately before this roll, using only decoded
   *  events. This is the `amount` to pass to calculateLoanFees. */
  borrowBeforeWei: bigint;
  /** Inferred duration in seconds, to pass to calculateLoanFees. */
  durationSec: bigint;
}

export type ReconstructionBailReason =
  | "no_missing"
  | "negative_residual"
  | "legacy_payback";

export interface ReconstructionPlan {
  /** Events sorted ascending by (blockNumber, logIndex). */
  sortedEvents: LoanEvent[];
  missingRolls: MissingRollInfo[];
  /** Σ of values the missing rolls must add up to, derived from the
   *  conservation law. Zero when bail is set. */
  missingRollSumWei: bigint;
  bail?: ReconstructionBailReason;
}

export function planRollReconstruction(
  events: LoanEvent[],
  currentBorrowedWei: bigint,
  currentExpiresSec: bigint,
): ReconstructionPlan {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
    return a.logIndex - b.logIndex;
  });

  // Phase 1 bail: if any Payback is also missing its amount, the
  // conservation system is under-determined. Punt; render legacy rows as
  // "—" in the table.
  if (sortedEvents.some(isMissingPayback)) {
    return {
      sortedEvents,
      missingRolls: [],
      missingRollSumWei: 0n,
      bail: "legacy_payback",
    };
  }

  const missingRolls: MissingRollInfo[] = [];
  let runningBorrow = 0n;
  let sumBorrowsKnown = 0n;
  let sumRollsKnown = 0n;
  let sumPaybacksKnown = 0n;

  for (let i = 0; i < sortedEvents.length; i++) {
    const ev = sortedEvents[i]!;
    switch (ev.eventName) {
      case "Borrow": {
        const amt = parseBig(ev.args.borrowAmount);
        runningBorrow += amt;
        sumBorrowsKnown += amt;
        break;
      }
      case "Payback": {
        const amt = parseBig(ev.args.amount);
        runningBorrow = runningBorrow > amt ? runningBorrow - amt : 0n;
        sumPaybacksKnown += amt;
        break;
      }
      case "RollLoan": {
        if (isMissingRoll(ev)) {
          missingRolls.push({
            index: i,
            eventId: ev.id,
            borrowBeforeWei: runningBorrow,
            durationSec: 0n,
          });
        } else {
          const amt = parseBig(ev.args.amount);
          runningBorrow += amt;
          sumRollsKnown += amt;
        }
        break;
      }
      case "DefaultLoans": {
        // Vault-wide reset; if the user was defaulted their principal
        // goes to zero.
        runningBorrow = 0n;
        break;
      }
    }
  }

  if (missingRolls.length === 0) {
    return {
      sortedEvents,
      missingRolls: [],
      missingRollSumWei: 0n,
      bail: "no_missing",
    };
  }

  const missingRollSumWei =
    currentBorrowedWei -
    sumBorrowsKnown -
    sumRollsKnown +
    sumPaybacksKnown;

  if (missingRollSumWei <= 0n) {
    return {
      sortedEvents,
      missingRolls: [],
      missingRollSumWei,
      bail: "negative_residual",
    };
  }

  // Infer durations: prefer declared, else gap to next Roll/Borrow, else
  // expiry-anchored for the last roll, else median of the others, else
  // DEFAULT_DURATION_SEC.
  const inferred: (bigint | undefined)[] = missingRolls.map((mr) => {
    const ev = sortedEvents[mr.index]!;

    const declared = parseBig(ev.args.duration);
    if (declared > 0n) return declared;

    const next = sortedEvents[mr.index + 1];
    if (
      next &&
      (next.eventName === "RollLoan" || next.eventName === "Borrow")
    ) {
      const gap = tsToSec(next.timestamp) - tsToSec(ev.timestamp);
      if (gap > 0n) return gap;
    }

    // Last roll → anchor to the active loan's expiry.
    const isLastRoll = sortedEvents
      .slice(mr.index + 1)
      .every((e) => e.eventName !== "RollLoan");
    if (isLastRoll && currentExpiresSec > 0n) {
      const gap = currentExpiresSec - tsToSec(ev.timestamp);
      if (gap > 0n) return gap;
    }

    return undefined;
  });

  const known = inferred
    .filter((d): d is bigint => d != null)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const median = known.length > 0
    ? known[Math.floor(known.length / 2)]!
    : DEFAULT_DURATION_SEC;

  missingRolls.forEach((mr, i) => {
    mr.durationSec = inferred[i] ?? median;
  });

  return { sortedEvents, missingRolls, missingRollSumWei };
}

export function applyRollReconstruction(
  plan: ReconstructionPlan,
  feeResultsWei: bigint[],
): LoanEvent[] {
  const { sortedEvents, missingRolls, missingRollSumWei, bail } = plan;
  if (bail || missingRolls.length === 0) return sortedEvents;

  if (feeResultsWei.length !== missingRolls.length) {
    console.warn(
      "[reconstructRollAmounts] feeResults length mismatch",
      feeResultsWei.length,
      "vs",
      missingRolls.length,
    );
    return sortedEvents;
  }

  const sumFees = feeResultsWei.reduce((s, f) => s + f, 0n);
  let assigned: bigint[];

  if (sumFees === 0n) {
    // Contract returned zero on every entry — equal-split the residual.
    const n = BigInt(missingRolls.length);
    const share = missingRollSumWei / n;
    const remainder = missingRollSumWei - share * n;
    assigned = missingRolls.map((_, i) => (i === 0 ? share + remainder : share));
  } else {
    assigned = feeResultsWei.map(
      (f) => (f * missingRollSumWei) / sumFees,
    );
    const drift = missingRollSumWei - assigned.reduce((s, a) => s + a, 0n);
    if (drift !== 0n) assigned[0] = (assigned[0] ?? 0n) + drift;
  }

  if (sumFees > 0n) {
    const diff =
      sumFees > missingRollSumWei
        ? sumFees - missingRollSumWei
        : missingRollSumWei - sumFees;
    const driftBps = (diff * 10000n) / missingRollSumWei;
    if (driftBps > RECONCILE_TOLERANCE_BPS) {
      console.warn(
        `[reconstructRollAmounts] computed fees off by ${driftBps}bps — scaling applied (sumFees=${sumFees}, missingRollSum=${missingRollSumWei})`,
      );
    }
  }

  const out = sortedEvents.slice();
  missingRolls.forEach((mr, i) => {
    const ev = out[mr.index]!;
    out[mr.index] = {
      ...ev,
      args: { ...ev.args, amount: (assigned[i] ?? 0n).toString() },
    };
  });

  return out;
}
