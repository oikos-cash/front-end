/**
 * Local-first token icon map. We prefer assets shipped from /public over
 * whatever iconUrl the markets API supplies, so brand presentation stays
 * consistent and we don't depend on third-party CDNs (Trustwallet etc.)
 * for the everyday tokens.
 */
const LOCAL_TOKEN_ICONS: Record<string, string> = {
  OKS: "/logo_dark.svg",
  BNB: "/bnb.png",
  WBNB: "/bnb-logo.png",
};

export function getTokenIconUrl(
  symbol?: string | null,
  fallback?: string | null,
): string | undefined {
  if (symbol) {
    const local = LOCAL_TOKEN_ICONS[symbol.toUpperCase()];
    if (local) return local;
  }
  return fallback ?? undefined;
}
