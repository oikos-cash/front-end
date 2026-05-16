import { VAULT_API_URL } from "@/types/constants";
import { fetchApi } from "@/utils/fetcher";
import type { LoanEvent, LoanStats } from "@/types/interfaces";

/**
 * Loan service — talks to NestJS @Controller('api/loans'). All read endpoints
 * are @Public(). The backend returns LoanEvent[] arrays directly (wrapped by
 * TransformInterceptor as { data: LoanEvent[], timestamp }), and `fetchApi`
 * unwraps to the bare array.
 *
 * SHAPE CHANGE: list endpoints used to return `{ loans, count, ... }`. They
 * now return `LoanEvent[]` directly. Hook callers must be updated separately.
 */

/**
 * Latest loan events across all vaults.
 */
export async function fetchLatestLoans(limit = 100): Promise<LoanEvent[]> {
  try {
    return await fetchApi<LoanEvent[]>(`/api/loans/latest?limit=${limit}`, {
      baseUrl: VAULT_API_URL,
    });
  } catch (error) {
    console.error("[LoanService] fetchLatestLoans:", error);
    return [];
  }
}

/**
 * Loan events for a specific user.
 */
export async function fetchLoansByUser(
  userAddress: string,
): Promise<LoanEvent[]> {
  try {
    return await fetchApi<LoanEvent[]>(`/api/loans/user/${userAddress}`, {
      baseUrl: VAULT_API_URL,
    });
  } catch (error) {
    console.error("[LoanService] fetchLoansByUser:", error);
    return [];
  }
}

/**
 * Loan events for a specific vault.
 */
export async function fetchLoansByVault(
  vaultAddress: string,
): Promise<LoanEvent[]> {
  try {
    return await fetchApi<LoanEvent[]>(`/api/loans/vault/${vaultAddress}`, {
      baseUrl: VAULT_API_URL,
    });
  } catch (error) {
    console.error("[LoanService] fetchLoansByVault:", error);
    return [];
  }
}

/**
 * Aggregate loan stats for a user. Object shape — already unwrapped by fetchApi.
 */
export async function fetchUserLoanStats(
  userAddress: string,
): Promise<LoanStats | null> {
  try {
    return await fetchApi<LoanStats>(
      `/api/loans/stats/user/${userAddress}`,
      { baseUrl: VAULT_API_URL },
    );
  } catch (error) {
    console.error("[LoanService] fetchUserLoanStats:", error);
    return null;
  }
}

/**
 * Aggregate loan stats for a vault. Object shape — already unwrapped by fetchApi.
 */
export async function fetchVaultLoanStats(
  vaultAddress: string,
): Promise<LoanStats | null> {
  try {
    return await fetchApi<LoanStats>(
      `/api/loans/stats/vault/${vaultAddress}`,
      { baseUrl: VAULT_API_URL },
    );
  } catch (error) {
    console.error("[LoanService] fetchVaultLoanStats:", error);
    return null;
  }
}

/**
 * Loan events filtered by event type.
 */
export async function fetchLoansByType(
  type: "Borrow" | "Payback" | "RollLoan" | "DefaultLoans",
): Promise<LoanEvent[]> {
  try {
    return await fetchApi<LoanEvent[]>(`/api/loans/type/${type}`, {
      baseUrl: VAULT_API_URL,
    });
  } catch (error) {
    console.error("[LoanService] fetchLoansByType:", error);
    return [];
  }
}
