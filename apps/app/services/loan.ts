import { VAULT_API_URL } from "@/types/constants";
import type { LoanEvent, LoanStats } from "@/types/interfaces";

const BASE_URL = `${VAULT_API_URL}/api/loans`;

export async function fetchLatestLoans(
  limit = 100,
): Promise<{ loans: LoanEvent[]; count: number }> {
  try {
    const res = await fetch(`${BASE_URL}/latest?limit=${limit}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error("[LoanService] fetchLatestLoans:", error);
    return { loans: [], count: 0 };
  }
}

export async function fetchLoansByUser(
  userAddress: string,
): Promise<{ userAddress: string; loans: LoanEvent[]; count: number }> {
  try {
    const res = await fetch(`${BASE_URL}/user/${userAddress}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error("[LoanService] fetchLoansByUser:", error);
    return { userAddress, loans: [], count: 0 };
  }
}

export async function fetchLoansByVault(
  vaultAddress: string,
): Promise<{ vaultAddress: string; loans: LoanEvent[]; count: number }> {
  try {
    const res = await fetch(`${BASE_URL}/vault/${vaultAddress}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error("[LoanService] fetchLoansByVault:", error);
    return { vaultAddress, loans: [], count: 0 };
  }
}

export async function fetchUserLoanStats(
  userAddress: string,
): Promise<LoanStats | null> {
  try {
    const res = await fetch(`${BASE_URL}/stats/user/${userAddress}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error("[LoanService] fetchUserLoanStats:", error);
    return null;
  }
}

export async function fetchVaultLoanStats(
  vaultAddress: string,
): Promise<LoanStats | null> {
  try {
    const res = await fetch(`${BASE_URL}/stats/vault/${vaultAddress}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error("[LoanService] fetchVaultLoanStats:", error);
    return null;
  }
}

export async function fetchLoansByType(
  type: "Borrow" | "Payback" | "RollLoan" | "DefaultLoans",
): Promise<{ type: string; loans: LoanEvent[]; count: number }> {
  try {
    const res = await fetch(`${BASE_URL}/type/${type}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error("[LoanService] fetchLoansByType:", error);
    return { type, loans: [], count: 0 };
  }
}
