"use client";

import useSWR from "swr";
import { bsc } from "wagmi/chains";
import {
  createPublicClient,
  fallback,
  http,
  keccak256,
  pad,
  toHex,
  type Address,
  type PublicClient,
} from "viem";

// Utils / types
import { LENDING_VAULT_ABI } from "@/lib/abis";
import type { LoanPositionRaw } from "@/utils/protocol-health";
import type { VaultInfo } from "@/types/interfaces";

/**
 * Storage slot of `VaultStorage.loanAddresses` (LibAppStorage). The vaults
 * expose `loanCount()` but no index getter, so borrowers are enumerated
 * straight from storage: slot 5 holds the length, keccak256(5) + i the items.
 */
const LOAN_ADDRESSES_SLOT = BigInt(5);
const LOAN_ADDRESSES_BASE = BigInt(keccak256(pad(toHex(LOAN_ADDRESSES_SLOT))));
const STORAGE_CHUNK = 25;

// Dedicated reader: the app's default transport (viem's public thirdweb RPC)
// rate-limits the burst of slot reads, so batch JSON-RPC against BNB Chain's
// own dataseeds (CORS-open) instead.
const client = createPublicClient({
  chain: bsc,
  batch: { multicall: true },
  transport: fallback([
    http("https://bsc-dataseed.bnbchain.org", { batch: { batchSize: 50 } }),
    http("https://bsc-dataseed1.binance.org", { batch: { batchSize: 50 } }),
  ]),
}) as PublicClient;

const LOAN_COUNT_ABI = [
  {
    inputs: [],
    name: "loanCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "who", type: "address" }],
    name: "loanLTV",
    outputs: [{ name: "ltv1e18", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCollateralAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface VaultLoans {
  loans: LoanPositionRaw[];
  /** Total collateral locked in the vault (wei); 0 for non-lending vaults. */
  collateral: bigint;
}

async function readBorrowers(
  client: PublicClient,
  vault: Address,
  count: number,
): Promise<Address[]> {
  const borrowers: Address[] = [];
  for (let start = 0; start < count; start += STORAGE_CHUNK) {
    const slots = Array.from(
      { length: Math.min(STORAGE_CHUNK, count - start) },
      (_, i) => toHex(LOAN_ADDRESSES_BASE + BigInt(start + i), { size: 32 }),
    );
    const words = await Promise.all(
      slots.map((slot) => client.getStorageAt({ address: vault, slot })),
    );
    for (const w of words) {
      if (w) borrowers.push(`0x${w.slice(-40)}` as Address);
    }
  }
  return borrowers;
}

async function readVaultLoans(
  client: PublicClient,
  vault: VaultInfo,
): Promise<VaultLoans> {
  const address = vault.address as Address;
  let count: number;
  let collateral: bigint;
  try {
    const [loanCount, collateralAmount] = await Promise.all([
      client.readContract({ address, abi: LOAN_COUNT_ABI, functionName: "loanCount" }),
      client.readContract({ address, abi: LOAN_COUNT_ABI, functionName: "getCollateralAmount" }),
    ]);
    count = Number(loanCount);
    collateral = collateralAmount;
  } catch {
    // Vault without the lending facet ("Diamond: Function does not exist").
    return { loans: [], collateral: BigInt(0) };
  }
  if (count === 0) return { loans: [], collateral };

  const borrowers = await readBorrowers(client, address, count);
  const results = await client.multicall({
    allowFailure: true,
    contracts: borrowers.flatMap((who) => [
      { address, abi: LENDING_VAULT_ABI, functionName: "getActiveLoan", args: [who] } as const,
      { address, abi: LOAN_COUNT_ABI, functionName: "loanLTV", args: [who] } as const,
    ]),
  });

  const spotPrice = Number(vault.spotPriceX96 || "0") / 1e18;
  const loans = borrowers.flatMap((borrower, i) => {
    const loan = results[i * 2];
    const ltv = results[i * 2 + 1];
    if (loan.status !== "success") return [];
    const [borrowAmount, collateralAmount, fees, expiry, duration] =
      loan.result as readonly [bigint, bigint, bigint, bigint, bigint];
    return [
      {
        vaultAddress: vault.address,
        vaultSymbol: vault.tokenSymbol,
        borrower,
        borrowAmount,
        collateralAmount,
        fees,
        expiry: Number(expiry),
        duration: Number(duration),
        ltv1e18: ltv.status === "success" ? (ltv.result as bigint) : null,
        spotPrice,
      },
    ];
  });
  return { loans, collateral };
}

/**
 * Every active loan across all vaults, read live from chain via public BSC
 * dataseeds (not the backend RPC). Refreshes every 5 minutes.
 */
export function useProtocolHealth(vaults: VaultInfo[]) {
  const { data, error, isLoading } = useSWR(
    vaults.length
      ? ["admin-protocol-health", ...vaults.map((v) => v.address)]
      : null,
    async () => {
      const perVault = await Promise.all(
        vaults.map((v) => readVaultLoans(client, v)),
      );
      const collateral = new Map<string, bigint>();
      vaults.forEach((v, i) => collateral.set(v.address.toLowerCase(), perVault[i].collateral));
      return { loans: perVault.flatMap((v) => v.loans), collateral };
    },
    { revalidateOnFocus: false, refreshInterval: 300_000, dedupingInterval: 60_000 },
  );

  return { loans: data?.loans ?? [], collateral: data?.collateral, error, isLoading };
}
