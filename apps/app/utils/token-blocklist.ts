import { BLOCKED_TOKENS } from "@/types/constants";

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
