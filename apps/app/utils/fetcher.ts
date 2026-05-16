import {
  API_BASE_URL,
  VAULT_API_URL,
  SSR_REVALIDATE_DEFAULT,
} from "@/types/constants";

/**
 * NestJS TransformInterceptor envelope.
 * Most endpoints wrap their response as { data: T, timestamp: string }.
 * Endpoints using @Res() (e.g. AI text) bypass this wrapper.
 */
type ApiEnvelope<T> = { data: T; timestamp: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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

/**
 * Unwrap the NestJS TransformInterceptor envelope.
 *
 * The interceptor wraps responses as exactly `{ data, timestamp }`.
 * To avoid mis-unwrapping arbitrary payloads that happen to expose a
 * `data` field, we require BOTH `data` and `timestamp` to be present
 * AND no other own keys. Anything else is returned verbatim.
 *
 * Pass `raw: true` to skip unwrap entirely (e.g. AI text endpoints
 * that use `@Res()` and bypass the interceptor).
 */
function unwrap<T>(body: unknown, raw?: boolean): T {
  if (raw) return body as T;
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "data" in (body as Record<string, unknown>) &&
    "timestamp" in (body as Record<string, unknown>) &&
    Object.keys(body as Record<string, unknown>).length === 2
  ) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
}

// =================================================
//            SERVER-SIDE FETCHER (SSR)
// =================================================

/**
 * Fetcher for Server Components using Next.js native fetch with cache.
 * Unwraps the NestJS TransformInterceptor envelope by default.
 *
 * @param path    - API path (e.g. "/vaults", "/tokens")
 * @param options - Override revalidate time, base URL, or unwrap behavior
 *
 * @example
 * const vaults = await fetchVaultServer<Vault[]>("/vaults");
 * const tokens = await fetchServer<Token[]>("/api/tokens", { revalidate: 300 });
 */
export async function fetchServer<T>(
  path: string,
  options?: {
    revalidate?: number;
    baseUrl?: string;
    params?: Record<string, string>;
    /** Skip TransformInterceptor unwrap (e.g. AI text endpoints). */
    raw?: boolean;
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
    throw new ApiError(
      response.status,
      null,
      `[fetchServer] ${response.status} ${response.statusText} — ${url.pathname}`,
    );
  }

  const body = await response.json();
  return unwrap<T>(body, options?.raw);
}

/**
 * Fetcher for vault-specific API endpoints.
 * Uses the VAULT_API_URL base.
 */
export async function fetchVaultServer<T>(
  path: string,
  options?: {
    revalidate?: number;
    params?: Record<string, string>;
    raw?: boolean;
  },
): Promise<T> {
  return fetchServer<T>(path, { ...options, baseUrl: VAULT_API_URL });
}

// =================================================
//          CLIENT-SIDE FETCHER (general)
// =================================================

/**
 * Generic client-side fetcher that handles:
 * - NestJS TransformInterceptor unwrap (`{ data, timestamp }` → `T`)
 * - Optional EIP-191 auth headers (`x-address`, `x-signature`, `x-message`)
 * - JSON Content-Type by default for mutations
 * - ApiError on non-2xx with parsed body
 *
 * Use this from `services/*.ts` instead of bare `fetch`.
 *
 * @example
 * const tokens = await fetchApi<Token[]>("/api/tokens");
 * const created = await fetchApi<Token>("/api/tokens", {
 *   method: "POST",
 *   body: JSON.stringify(payload),
 *   auth: await buildAuthHeaders(address),
 * });
 * const ai = await fetchApi<AiResponse>("/api/ai/generate", { method: "POST", raw: true });
 */
export async function fetchApi<T>(
  path: string,
  init?: RequestInit & {
    /** EIP-191 auth headers from `buildAuthHeaders`. */
    auth?: Record<string, string>;
    /** Skip TransformInterceptor unwrap. */
    raw?: boolean;
    /** Override base URL (defaults to API_BASE_URL). */
    baseUrl?: string;
  },
): Promise<T> {
  const base = init?.baseUrl ?? API_BASE_URL;
  const fullUrl = path.startsWith("http") ? path : `${base}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.auth ?? {}),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(fullUrl, { ...init, headers });

  // 304 Not Modified — body is empty, return undefined so callers can decide
  // to keep their previous value instead of choking on `JSON.parse("")`.
  if (response.status === 304) {
    return undefined as T;
  }

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      (body as { message?: string })?.message ??
      (body as { error?: string })?.error ??
      `${response.status} ${response.statusText}`;
    throw new ApiError(response.status, body, `[fetchApi] ${message} — ${path}`);
  }

  return unwrap<T>(body, init?.raw);
}

// =================================================
//          CLIENT-SIDE FETCHER (SWR)
// =================================================

/**
 * Default fetcher for SWR. Unwraps the TransformInterceptor envelope by default.
 * Pass `[url, { raw: true }]` as the SWR key for raw endpoints (AI text).
 *
 * @example
 * const { data } = useSWR<Token[]>("/tokens");           // unwrapped
 * const { data } = useSWR<AiResponse>(["/ai/generate", { raw: true }]);
 */
export async function swrFetcher<T>(
  key: string | [url: string, options?: { raw?: boolean }],
): Promise<T> {
  const [url, opts] = Array.isArray(key) ? key : [key, undefined];
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  const response = await fetch(fullUrl);

  // 304 Not Modified — no body, the previous response is still valid.
  // Throwing here would push SWR into errorRetry loops; instead, signal
  // "no new data" by returning undefined so SWR keeps the previous value.
  if (response.status === 304) {
    return undefined as T;
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      null,
      `[swrFetcher] ${response.status} ${response.statusText} — ${url}`,
    );
  }

  const body = await response.json();
  return unwrap<T>(body, opts?.raw);
}
