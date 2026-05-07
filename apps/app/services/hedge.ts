import { VAULT_API_URL } from "@/types/constants";
import { fetchApi } from "@/utils/fetcher";
import type { HedgeQuote, HedgePosition, HedgeStats } from "@/types/interfaces";

/**
 * Hedge service — talks to NestJS @Controller('api/hedge'). Reads are
 * @Public(); mutations (create/close) require EIP-191 auth headers verified
 * by the global AuthGuard.
 *
 * AUTH MOVED TO HEADERS: the legacy Express backend accepted
 * `signature` and `message` in the request body. The NestJS CreateHedgeDto
 * uses `forbidNonWhitelisted: true`, which 400s when extra fields are sent.
 * Callers now pass auth via the `auth` argument (built with
 * `buildAuthHeaders` from @/utils/auth-fetch). The user address is resolved
 * server-side from `@CurrentUser('address')`, so we do not send it in the body.
 */

/**
 * Quote a hedge position. Public route.
 */
export async function fetchHedgeQuote(
  loanAmountBNB: number,
  loanDurationDays: number,
): Promise<HedgeQuote> {
  const params = new URLSearchParams({
    loanAmountBNB: loanAmountBNB.toString(),
    loanDurationDays: loanDurationDays.toString(),
  });
  return await fetchApi<HedgeQuote>(`/api/hedge/quote?${params.toString()}`, {
    baseUrl: VAULT_API_URL,
  });
}

/**
 * List a user's hedge positions. Public route.
 */
export async function fetchHedgePositions(
  userAddress: string,
  activeOnly = false,
): Promise<HedgePosition[]> {
  let path = `/api/hedge/positions/${userAddress}`;
  if (activeOnly) path += "?status=active";
  return await fetchApi<HedgePosition[]>(path, { baseUrl: VAULT_API_URL });
}

/**
 * Open a new hedge. Protected — caller supplies EIP-191 auth headers.
 *
 * NOTE: signature/message live in headers (not body). userAddress is also
 * removed from the body — the server resolves it from @CurrentUser('address').
 */
export async function createHedge(
  body: {
    vaultAddress: string;
    loanId?: string;
    loanAmountBNB: number;
    loanDurationDays: number;
  },
  auth: Record<string, string>,
): Promise<{
  hedge: HedgePosition;
  quote: HedgeQuote;
  orderExecuted: boolean;
}> {
  return await fetchApi<{
    hedge: HedgePosition;
    quote: HedgeQuote;
    orderExecuted: boolean;
  }>(`/api/hedge/create`, {
    method: "POST",
    body: JSON.stringify(body),
    auth,
    baseUrl: VAULT_API_URL,
  });
}

/**
 * Close a hedge. Protected — caller supplies EIP-191 auth headers. DELETE has
 * no request body; the user address is resolved server-side from `x-address`.
 */
export async function closeHedge(
  hedgeId: string,
  auth: Record<string, string>,
): Promise<{ hedge: HedgePosition; orderClosed: boolean }> {
  return await fetchApi<{ hedge: HedgePosition; orderClosed: boolean }>(
    `/api/hedge/${hedgeId}`,
    {
      method: "DELETE",
      auth,
      baseUrl: VAULT_API_URL,
    },
  );
}

/**
 * Aggregate hedge stats for a user. Public route.
 */
export async function fetchHedgeUserStats(
  userAddress: string,
): Promise<HedgeStats> {
  return await fetchApi<HedgeStats>(
    `/api/hedge/stats/user/${userAddress}`,
    { baseUrl: VAULT_API_URL },
  );
}
