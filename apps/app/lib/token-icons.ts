/**
 * Static fallback map for token icons. Used when an iconUrl isn't supplied
 * by the markets API — e.g. for the native protocol token OKS, which is
 * served from the local public folder.
 */
const LOCAL_TOKEN_ICONS: Record<string, string> = {
  OKS: "/logo_dark.svg",
};

export function getTokenIconUrl(
  symbol?: string | null,
  fallback?: string | null,
): string | undefined {
  if (fallback) return fallback;
  if (!symbol) return undefined;
  return LOCAL_TOKEN_ICONS[symbol.toUpperCase()];
}
