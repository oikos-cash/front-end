/**
 * Token-scoped routes carry the project token's symbol as the trailing
 * path segment (e.g. `/en/trade/dws`, `/en/borrow/oks`). The wallet
 * store, trade panel, and nav dropdown all need to read this slug so
 * they can keep their state in sync with the page the user is on.
 *
 * The locale prefix (`/en`, `/es`) is stripped before parsing.
 */
export const TOKEN_SCOPED_ROUTES = [
  "trade",
  "borrow",
  "liquidity",
  "stake",
  "presale",
  "dividends",
  "studio",
] as const;

/**
 * Extract the token slug from a Next.js pathname. Returns `null` when
 * the user isn't on a token-scoped route (e.g. `/markets`, `/launchpad`,
 * `/`). The returned slug is lower-cased so callers can compare it to
 * `tokenSymbol.toLowerCase()` directly.
 */
export function tokenSlugFromPathname(
  pathname: string | null | undefined,
): string | null {
  if (!pathname) return null;
  // parts[0] = locale, parts[1] = route, parts[2] = token slug.
  const parts = pathname.split("/").filter(Boolean);
  if (
    parts.length >= 3 &&
    (TOKEN_SCOPED_ROUTES as readonly string[]).includes(parts[1])
  ) {
    return parts[2].toLowerCase();
  }
  return null;
}
