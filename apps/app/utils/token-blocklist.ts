import { BLOCKED_TOKENS } from "@/types/constants";
import type { VaultInfo, TokenInfo } from "@/types/interfaces";

/**
 * Predicates and filters for the frontend token blocklist defined in
 * `types/constants.ts`. Matching is case-insensitive on both symbol and
 * address — supplying either side of an entry is enough to block a token.
 *
 * These helpers run in service-layer fetchers so the blocklist applies
 * uniformly to Markets, Swap/Exchange, Studio, presale, direct
 * `/trade/<symbol>` routes, and pool lists.
 */

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

const blockedSymbols = new Set(
  BLOCKED_TOKENS.map((e) => norm(e.symbol)).filter(Boolean),
);
const blockedAddresses = new Set(
  BLOCKED_TOKENS.map((e) => norm(e.address)).filter(Boolean),
);

export function isBlockedSymbol(symbol: string | undefined | null): boolean {
  const s = norm(symbol);
  return s !== "" && blockedSymbols.has(s);
}

export function isBlockedAddress(address: string | undefined | null): boolean {
  const a = norm(address);
  return a !== "" && blockedAddresses.has(a);
}

/**
 * True when ANY of the supplied identifiers match an entry in the
 * blocklist. Pass all fields you have — symbol + every address variant
 * (token, contract, vault, pool) — to be safe.
 */
export function isTokenBlocked(ids: {
  symbol?: string | null;
  addresses?: ReadonlyArray<string | undefined | null>;
}): boolean {
  if (isBlockedSymbol(ids.symbol)) return true;
  for (const a of ids.addresses ?? []) {
    if (isBlockedAddress(a)) return true;
  }
  return false;
}

/**
 * Filter helper for the vault-driven list pipelines (Markets, Swap,
 * Exchange, Price table). The blocklist on `services/token.ts` only
 * scrubs the `/api/tokens` metadata feed — every list view actually
 * builds its rows from `/vaults`, so unfiltered vaults still slipped
 * through. Apply this to the raw `VaultInfo[]` before any merge step.
 */
export function filterBlockedVaults<T extends VaultInfo>(vaults: T[]): T[] {
  return vaults.filter(
    (v) =>
      !isTokenBlocked({
        symbol: v.tokenSymbol,
        addresses: [v.token0, v.address, v.poolAddress],
      }),
  );
}

/**
 * Parallel filter for the `/api/tokens` metadata feed when a caller can't
 * route through `services/token.ts` (e.g. SSR via `fetchServer`). Returns
 * a new array — never mutates the input.
 */
export function filterBlockedTokenInfo<T extends TokenInfo>(tokens: T[]): T[] {
  return tokens.filter(
    (t) =>
      !isTokenBlocked({
        symbol: t.tokenSymbol,
        addresses: [
          (t as { tokenAddress?: string }).tokenAddress,
          (t as { contractAddress?: string }).contractAddress,
          (t as { vaultAddress?: string }).vaultAddress,
          (t as { poolAddress?: string }).poolAddress,
        ],
      }),
  );
}
