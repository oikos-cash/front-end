import { parseEther } from "viem";

/**
 * Frontend mirror of the contract's `enforceMinTotalSupply` ladder
 * (`SupplyRules.sol`). The factory reverts with `TotalSupplyTooLow` when
 * the deploy params don't satisfy this rule, so the UI has to gate users
 * before they sign — otherwise they hit a wallet pop-up only to watch
 * the tx revert.
 *
 * Live `basePriceDecimals` on the production factory is `1e13` (the
 * deploy script's `1e14` literal was superseded by a later
 * `setProtocolParameters` call). The ladder maps IDOPrice (in wei) to a
 * minimum total supply (in plain tokens, not wei) using strict `>`
 * boundaries:
 *
 *   IDOPrice  > 1e13   → 1M
 *   IDOPrice  > 1e12   → 10M
 *   IDOPrice  > 1e11   → 1B
 *   IDOPrice  > 1e10   → 10B
 *   IDOPrice  > 1e9    → 100B
 *   IDOPrice  > 1e8    → 1T
 *   IDOPrice  > 1e7    → 10T
 *   IDOPrice  > 1e6    → 100T
 *   IDOPrice ≤ 1e6     → 1000T (floor)
 *
 * The contract's WAD scaling (× 1e18) is applied by the caller when it
 * needs the value in wei — this helper returns plain tokens so the UI
 * can format and display it directly.
 */

/** WAD = 10^18 — token decimals scaling factor. */
export const WAD = 10n ** 18n;

/** Below this floor price the contract's price ladder bottoms out. */
export const MIN_FLOOR_PRICE_BNB = 0.00000000001; // 1e-11

/** The IDO/launch price the factory consumes is the user-entered floor
 *  price marked up by 25 %, in BigInt-safe form.
 *
 *  The trailing `+ 1n` is a deliberate 1-wei dust: the contract's tier
 *  boundaries use strict `>` (`SupplyRules.sol:33-40`), so when integer
 *  math lands the markup exactly on a threshold (e.g. floor 0.000008 BNB
 *  → markup 1e13 = t0) the user would slip into the harsher tier. The
 *  extra wei keeps us *strictly above* the boundary in the user's
 *  favour. Economically a no-op (1 wei is dust); UX-wise it removes a
 *  whole class of off-by-one surprises right at every tier edge. */
export function idoPriceFromFloorWei(floorPriceWei: bigint): bigint {
  if (floorPriceWei <= 0n) return 0n;
  return (floorPriceWei * 125n) / 100n + 1n;
}

/**
 * Min total supply (in plain tokens) required for a given IDOPrice (wei).
 * Mirrors `SupplyRules.enforceMinTotalSupply`.
 */
export function minTotalSupplyTokensForIdoPrice(idoPriceWei: bigint): bigint {
  if (idoPriceWei > 10n ** 13n) return 1_000_000n;
  if (idoPriceWei > 10n ** 12n) return 10_000_000n;
  if (idoPriceWei > 10n ** 11n) return 1_000_000_000n;
  if (idoPriceWei > 10n ** 10n) return 10_000_000_000n;
  if (idoPriceWei > 10n ** 9n) return 100_000_000_000n;
  if (idoPriceWei > 10n ** 8n) return 1_000_000_000_000n;
  if (idoPriceWei > 10n ** 7n) return 10_000_000_000_000n;
  if (idoPriceWei > 10n ** 6n) return 100_000_000_000_000n;
  return 1_000_000_000_000_000n;
}

/**
 * Convenience: derive the min supply directly from the user-entered
 * floor price (string from the form). Returns `null` when the floor
 * price isn't yet a positive number.
 */
export function minTotalSupplyTokensForFloor(
  floorPriceStr: string | undefined | null,
): bigint | null {
  if (!floorPriceStr) return null;
  const n = Number(floorPriceStr);
  if (!isFinite(n) || n <= 0) return null;
  try {
    const floorWei = parseEther(String(floorPriceStr));
    const ido = idoPriceFromFloorWei(floorWei);
    return minTotalSupplyTokensForIdoPrice(ido);
  } catch {
    return null;
  }
}

/**
 * True when the user-entered total supply satisfies the contract's
 * minimum for the current floor price. Returns `true` when either field
 * is empty — empty-field validation is the caller's job.
 */
export function meetsMinTotalSupply(
  floorPriceStr: string | undefined | null,
  totalSupplyStr: string | undefined | null,
): boolean {
  const min = minTotalSupplyTokensForFloor(floorPriceStr);
  if (min === null) return true;
  if (!totalSupplyStr) return true;
  const supply = Number(totalSupplyStr);
  if (!isFinite(supply) || supply <= 0) return true;
  return BigInt(Math.floor(supply)) >= min;
}
