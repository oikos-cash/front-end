/**
 * Pure derivations for the admin "Protocol Health" section. Inputs are the
 * on-chain loan positions read by `useProtocolHealth` plus the market data the
 * dashboard already has; no I/O here so everything is unit-testable.
 */

/** One active loan as read from the vault (`getActiveLoan` + `loanLTV`). */
export interface LoanPositionRaw {
  vaultAddress: string;
  vaultSymbol: string;
  borrower: string;
  /** BNB debt (wei). */
  borrowAmount: bigint;
  /** Collateral locked, in token units (wei, 18 decimals). */
  collateralAmount: bigint;
  /** Loan fees prepaid (wei). */
  fees: bigint;
  /** Expiry (unix seconds). */
  expiry: number;
  /** Total loan duration (seconds). */
  duration: number;
  /** collateral × IMV / debt, 1e18-scaled (`loanLTV`); null if unreadable. */
  ltv1e18: bigint | null;
  /** Vault spot price, BNB per token. */
  spotPrice: number;
}

/**
 * Loan lifecycle state. Oikos loans can't be liquidated: collateral is quoted
 * 1:1 at the IMV, which only rises, and an unpaid loan's collateral is burned
 * at expiry with zero net effect on the protocol.
 */
export type LoanStatus = "expired" | "expiring" | "rollable" | "active";

export interface LoanPosition {
  id: string;
  vaultAddress: string;
  vaultSymbol: string;
  borrower: string;
  debtBnb: number;
  collateralTokens: number;
  feesBnb: number;
  expiresAt: Date;
  daysLeft: number;
  durationDays: number;
  /** Collateral at spot, BNB. */
  collateralSpotBnb: number;
  /** Collateral at IMV (floor), BNB. */
  collateralImvBnb: number;
  /** Collateral at IMV / debt. */
  imvCoverage: number | null;
  /** Collateral at spot / debt. */
  spotCoverage: number | null;
  status: LoanStatus;
}

export interface MaturityBucket {
  label: string;
  debtBnb: number;
  loans: number;
}

export interface ProtocolHealth {
  activeLoans: number;
  borrowers: number;
  outstandingDebtBnb: number;
  feesBnb: number;
  collateralSpotBnb: number;
  collateralImvBnb: number;
  /** Σ collateral@IMV / Σ debt. */
  imvCoverage: number | null;
  /** Σ collateral@spot / Σ debt. */
  spotCoverage: number | null;
  marketCapBnb: number;
  /** Outstanding debt as a share of total market cap (0..1+). */
  debtToMarketCap: number | null;
  statusCounts: Record<LoanStatus, number>;
  /** Debt of expired loans whose collateral awaits burning. */
  expiredDebtBnb: number;
  expiringDebtBnb: number;
  maturity: MaturityBucket[];
  positions: LoanPosition[];
}

const WEI = 1e18;
const DAY = 86_400;
export const EXPIRING_DAYS = 7;
/** IMV coverage above this lets the holder roll (borrow more, extend). */
export const ROLLABLE_COVERAGE = 1.001;

const toNum = (wei: bigint) => Number(wei) / WEI;

export function classifyLoan(
  imvCoverage: number | null,
  secondsLeft: number,
): LoanStatus {
  if (secondsLeft <= 0) return "expired";
  if (secondsLeft < EXPIRING_DAYS * DAY) return "expiring";
  if (imvCoverage != null && imvCoverage > ROLLABLE_COVERAGE) return "rollable";
  return "active";
}

export function toLoanPosition(raw: LoanPositionRaw, nowSec: number): LoanPosition {
  const debtBnb = toNum(raw.borrowAmount);
  const collateralTokens = toNum(raw.collateralAmount);
  const imvCoverage = raw.ltv1e18 != null && debtBnb > 0 ? toNum(raw.ltv1e18) : null;
  const collateralSpotBnb = collateralTokens * raw.spotPrice;
  const secondsLeft = raw.expiry - nowSec;
  return {
    id: `${raw.vaultAddress}:${raw.borrower}`,
    vaultAddress: raw.vaultAddress,
    vaultSymbol: raw.vaultSymbol,
    borrower: raw.borrower,
    debtBnb,
    collateralTokens,
    feesBnb: toNum(raw.fees),
    expiresAt: new Date(raw.expiry * 1000),
    daysLeft: secondsLeft / DAY,
    durationDays: raw.duration / DAY,
    collateralSpotBnb,
    collateralImvBnb: imvCoverage != null ? imvCoverage * debtBnb : 0,
    imvCoverage,
    spotCoverage: debtBnb > 0 ? collateralSpotBnb / debtBnb : null,
    status: classifyLoan(imvCoverage, secondsLeft),
  };
}

const MATURITY: { label: string; maxDays: number }[] = [
  { label: "Expired", maxDays: 0 },
  { label: "< 7d", maxDays: 7 },
  { label: "7–30d", maxDays: 30 },
  { label: "30–90d", maxDays: 90 },
  { label: "90d–1y", maxDays: 365 },
  { label: "> 1y", maxDays: Infinity },
];

export function buildMaturity(positions: LoanPosition[]): MaturityBucket[] {
  const buckets = MATURITY.map((b) => ({ label: b.label, debtBnb: 0, loans: 0 }));
  for (const p of positions) {
    const i = MATURITY.findIndex((b) => p.daysLeft <= b.maxDays);
    const bucket = buckets[i === -1 ? buckets.length - 1 : i];
    bucket.debtBnb += p.debtBnb;
    bucket.loans += 1;
  }
  return buckets;
}

export function deriveProtocolHealth(
  raws: LoanPositionRaw[],
  marketCapBnb: number,
  nowSec = Math.floor(Date.now() / 1000),
): ProtocolHealth {
  const positions = raws
    .filter((r) => r.borrowAmount > BigInt(0))
    .map((r) => toLoanPosition(r, nowSec))
    .sort((a, b) => b.debtBnb - a.debtBnb);

  const statusCounts: Record<LoanStatus, number> = {
    expired: 0,
    expiring: 0,
    rollable: 0,
    active: 0,
  };
  let outstandingDebtBnb = 0;
  let feesBnb = 0;
  let collateralSpotBnb = 0;
  let collateralImvBnb = 0;
  let imvDebt = 0;
  let expiredDebtBnb = 0;
  let expiringDebtBnb = 0;
  const borrowers = new Set<string>();

  for (const p of positions) {
    statusCounts[p.status] += 1;
    outstandingDebtBnb += p.debtBnb;
    feesBnb += p.feesBnb;
    collateralSpotBnb += p.collateralSpotBnb;
    if (p.imvCoverage != null) {
      collateralImvBnb += p.collateralImvBnb;
      imvDebt += p.debtBnb;
    }
    if (p.status === "expired") expiredDebtBnb += p.debtBnb;
    if (p.status === "expiring") expiringDebtBnb += p.debtBnb;
    borrowers.add(p.borrower.toLowerCase());
  }

  return {
    activeLoans: positions.length,
    borrowers: borrowers.size,
    outstandingDebtBnb,
    feesBnb,
    collateralSpotBnb,
    collateralImvBnb,
    imvCoverage: imvDebt > 0 ? collateralImvBnb / imvDebt : null,
    spotCoverage: outstandingDebtBnb > 0 ? collateralSpotBnb / outstandingDebtBnb : null,
    marketCapBnb,
    debtToMarketCap: marketCapBnb > 0 ? outstandingDebtBnb / marketCapBnb : null,
    statusCounts,
    expiredDebtBnb,
    expiringDebtBnb,
    maturity: buildMaturity(positions),
    positions,
  };
}

export interface VaultSolvency {
  vaultAddress: string;
  symbol: string;
  /** (anchor + floor capacity) / circulating supply; > 1 is solvent. */
  ratio: number;
}

/**
 * On-chain solvency invariant, as enforced by
 * `ModelHelper.enforceSolvencyInvariant`: a vault stays solvent while
 * anchorCapacity + floorCapacity > circulatingSupply. Capacities are in token
 * units per vault, so vaults can't be summed; the protocol figure is the
 * weakest vault.
 */
export function deriveSolvency(
  vaults: {
    address: string;
    tokenSymbol: string;
    anchorCapacity: string;
    floorCapacity: string;
    circulatingSupply: string;
  }[],
): { vaults: VaultSolvency[]; weakest: VaultSolvency | null } {
  const rows: VaultSolvency[] = [];
  for (const v of vaults) {
    const circulating = Number(v.circulatingSupply || "0");
    if (!(circulating > 0)) continue;
    const capacity = Number(v.anchorCapacity || "0") + Number(v.floorCapacity || "0");
    rows.push({ vaultAddress: v.address, symbol: v.tokenSymbol, ratio: capacity / circulating });
  }
  rows.sort((a, b) => a.ratio - b.ratio);
  return { vaults: rows, weakest: rows[0] ?? null };
}

export interface VaultHealthRow {
  vaultAddress: string;
  symbol: string;
  anchorCapacity: number;
  floorCapacity: number;
  circulatingSupply: number;
  /** (anchor + floor) / circulating; null when nothing circulates. */
  solvency: number | null;
  marketCapBnb: number;
  activeLoans: number;
  expiringLoans: number;
  expiredLoans: number;
  debtBnb: number;
  debtToMarketCap: number | null;
  /** Σ collateral@IMV / Σ debt for this vault's loans. */
  imvCoverage: number | null;
  spotCoverage: number | null;
}

/** Per-vault solvency + loan book, joining /vaults, market caps and positions. */
export function buildVaultHealth(
  vaults: {
    address: string;
    tokenSymbol: string;
    anchorCapacity: string;
    floorCapacity: string;
    circulatingSupply: string;
  }[],
  positions: LoanPosition[],
  marketCapByVault: Map<string, number>,
): VaultHealthRow[] {
  return vaults
    .map((v) => {
      const key = v.address.toLowerCase();
      const mine = positions.filter((p) => p.vaultAddress.toLowerCase() === key);
      const anchorCapacity = Number(v.anchorCapacity || "0") / WEI;
      const floorCapacity = Number(v.floorCapacity || "0") / WEI;
      const circulatingSupply = Number(v.circulatingSupply || "0") / WEI;
      let debtBnb = 0;
      let imvBnb = 0;
      let imvDebt = 0;
      let spotBnb = 0;
      for (const p of mine) {
        debtBnb += p.debtBnb;
        spotBnb += p.collateralSpotBnb;
        if (p.imvCoverage != null) {
          imvBnb += p.collateralImvBnb;
          imvDebt += p.debtBnb;
        }
      }
      const marketCapBnb = marketCapByVault.get(key) ?? 0;
      return {
        vaultAddress: v.address,
        symbol: v.tokenSymbol,
        anchorCapacity,
        floorCapacity,
        circulatingSupply,
        solvency:
          circulatingSupply > 0 ? (anchorCapacity + floorCapacity) / circulatingSupply : null,
        marketCapBnb,
        activeLoans: mine.length,
        expiringLoans: mine.filter((p) => p.status === "expiring").length,
        expiredLoans: mine.filter((p) => p.status === "expired").length,
        debtBnb,
        debtToMarketCap: marketCapBnb > 0 ? debtBnb / marketCapBnb : null,
        imvCoverage: imvDebt > 0 ? imvBnb / imvDebt : null,
        spotCoverage: debtBnb > 0 ? spotBnb / debtBnb : null,
      };
    })
    .sort((a, b) => b.marketCapBnb - a.marketCapBnb);
}

export function formatRatio(value: number | null, digits = 2): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(digits)}×`;
}

export function formatPct(value: number | null, digits = 1): string {
  return value == null || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(digits)}%`;
}
