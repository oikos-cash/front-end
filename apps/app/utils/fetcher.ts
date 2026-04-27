import {
  API_BASE_URL,
  VAULT_API_URL,
  SSR_REVALIDATE_DEFAULT,
} from "@/types/constants";

/**
 * Resolve a base URL to an absolute URL.
 * Relative paths like "/api" are prefixed with the app origin for SSR.
 */
function resolveBase(base: string): string {
  if (base.startsWith("http")) return base;
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`;
  return `${origin}${base}`;
}

// =================================================
//            SERVER-SIDE FETCHER (SSR)
// =================================================

/**
 * Fetcher for Server Components using Next.js native fetch with cache.
 * Data is rendered on the server and arrives as HTML to the client.
 *
 * @param path    - API path (e.g. "/vaults", "/tokens")
 * @param options - Override revalidate time or use a different base URL
 *
 * @example
 * // In a Server Component:
 * const vaults = await fetchServer<Vault[]>("/vaults");
 * const tokens = await fetchServer<Token[]>("/tokens", { revalidate: 300 });
 */
export async function fetchServer<T>(
  path: string,
  options?: {
    revalidate?: number;
    baseUrl?: string;
    params?: Record<string, string>;
  },
): Promise<T> {
  const base = resolveBase(options?.baseUrl ?? API_BASE_URL);
  const url = new URL(path, base);

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: options?.revalidate ?? SSR_REVALIDATE_DEFAULT },
  });

  if (!response.ok) {
    throw new Error(
      `[fetchServer] ${response.status} ${response.statusText} — ${url.pathname}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Fetcher for vault-specific API endpoints.
 * Uses the VAULT_API_URL base.
 *
 * @example
 * const vaults = await fetchVaultServer<Vault[]>("/vaults");
 * const vault = await fetchVaultServer<Vault>("/vaults/by-vault/0x123");
 */
export async function fetchVaultServer<T>(
  path: string,
  options?: {
    revalidate?: number;
    params?: Record<string, string>;
  },
): Promise<T> {
  return fetchServer<T>(path, { ...options, baseUrl: VAULT_API_URL });
}

// =================================================
//          CLIENT-SIDE FETCHER (SWR)
// =================================================

/**
 * Default fetcher for SWR. Used by the SWRConfig provider.
 * Receives a full URL or a path (prefixed with the API base URL).
 *
 * @example
 * // SWR uses this automatically via the global config:
 * const { data } = useSWR<Balance[]>(`/balances/${address}`);
 *
 * // Or with a full URL:
 * const { data } = useSWR<HedgeQuote>("https://trollbox.oikos.cash/api/hedge/quote");
 */
export async function swrFetcher<T>(url: string): Promise<T> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  const response = await fetch(fullUrl);

  if (!response.ok) {
    const error = new Error(
      `[swrFetcher] ${response.status} ${response.statusText} — ${url}`,
    );
    throw error;
  }

  return response.json() as Promise<T>;
}
