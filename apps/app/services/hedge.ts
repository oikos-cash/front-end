import { VAULT_API_URL } from "@/types/constants";
import type { HedgeQuote, HedgePosition, HedgeStats } from "@/types/interfaces";

const BASE_URL = VAULT_API_URL;

export async function fetchHedgeQuote(
  loanAmountBNB: number,
  loanDurationDays: number,
): Promise<HedgeQuote> {
  const params = new URLSearchParams({
    loanAmountBNB: loanAmountBNB.toString(),
    loanDurationDays: loanDurationDays.toString(),
  });
  const res = await fetch(`${BASE_URL}/api/hedge/quote?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get hedge quote: ${res.statusText}`);
  }
  const data = await res.json();
  return data.quote;
}

export async function fetchHedgePositions(
  userAddress: string,
  activeOnly = false,
): Promise<HedgePosition[]> {
  let url = `${BASE_URL}/api/hedge/positions/${userAddress}`;
  if (activeOnly) url += "?status=active";

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get hedge positions: ${res.statusText}`);
  }
  const data = await res.json();
  return data.positions;
}

export async function createHedge(params: {
  userAddress: string;
  vaultAddress: string;
  loanId?: string;
  loanAmountBNB: number;
  loanDurationDays: number;
  signature: string;
  message: string;
}): Promise<{ hedge: HedgePosition; quote: HedgeQuote; orderExecuted: boolean }> {
  const res = await fetch(`${BASE_URL}/api/hedge/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create hedge: ${res.statusText}`);
  }
  return await res.json();
}

export async function closeHedge(params: {
  hedgeId: string;
  userAddress: string;
  signature: string;
  message: string;
}): Promise<{ hedge: HedgePosition; orderClosed: boolean }> {
  const res = await fetch(`${BASE_URL}/api/hedge/${params.hedgeId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userAddress: params.userAddress,
      signature: params.signature,
      message: params.message,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to close hedge: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchHedgeUserStats(
  userAddress: string,
): Promise<HedgeStats> {
  const res = await fetch(`${BASE_URL}/api/hedge/stats/user/${userAddress}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get hedge stats: ${res.statusText}`);
  }
  const data = await res.json();
  return data.stats;
}
