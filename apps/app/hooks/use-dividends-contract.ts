"use client";

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import type { Address } from "viem";

import { useWallet } from "@/stores/wallet";
import { DIVIDENDS_ABI } from "@/lib/abis";

/**
 * Hook for interacting with the NomaDividends contract.
 * Reads: claimable, vestingEntries, totalDistributed, rewardTokens.
 * Writes: claim, claimAll, withdrawVested, withdrawAllVested.
 *
 * @param dividendsAddress - NomaDividends contract address
 */
export function useDividendsContract(dividendsAddress?: string) {
  const { address } = useWallet();
  const dividends = dividendsAddress as Address | undefined;
  const user = address as Address | undefined;

  // Read reward tokens list
  const { data: rewardTokens } = useReadContract({
    address: dividends,
    abi: DIVIDENDS_ABI,
    functionName: "getRewardTokens",
    query: { enabled: !!dividends },
  });

  // For each reward token, read claimable + totalDistributed
  const tokenAddresses = (rewardTokens as Address[]) ?? [];

  const { data: tokenReads, refetch } = useReadContracts({
    contracts: tokenAddresses.flatMap((token) => [
      ...(user
        ? [{ address: dividends!, abi: DIVIDENDS_ABI, functionName: "claimable" as const, args: [token, user] }]
        : []),
      { address: dividends!, abi: DIVIDENDS_ABI, functionName: "getTotalDistributed" as const, args: [token] },
    ]),
    query: { enabled: !!dividends && tokenAddresses.length > 0 },
  });

  // Parse per-token data
  const tokenData = tokenAddresses.map((token, i) => {
    const offset = user ? i * 2 : i;
    const claimable = user ? (tokenReads?.[offset]?.result as bigint | undefined) : undefined;
    const totalDistributed = tokenReads?.[user ? offset + 1 : offset]?.result as bigint | undefined;

    return {
      address: token,
      claimable: claimable ? parseFloat(formatEther(claimable)) : 0,
      totalDistributed: totalDistributed ? parseFloat(formatEther(totalDistributed)) : 0,
    };
  });

  // Write: claimAll
  const { writeContract: claimAllWrite, data: claimAllTxHash } = useWriteContract();
  const { isLoading: isClaiming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({
    hash: claimAllTxHash,
  });

  function claimAll() {
    if (!dividends) return;
    claimAllWrite({
      address: dividends,
      abi: DIVIDENDS_ABI,
      functionName: "claimAll",
    });
  }

  // Write: withdrawAllVested
  const { writeContract: withdrawAllWrite, data: withdrawAllTxHash } = useWriteContract();
  const { isLoading: isWithdrawing, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawAllTxHash,
  });

  function withdrawAllVested() {
    if (!dividends) return;
    withdrawAllWrite({
      address: dividends,
      abi: DIVIDENDS_ABI,
      functionName: "withdrawAllVested",
    });
  }

  // Write: claim single token
  const { writeContract: claimWrite, data: claimTxHash } = useWriteContract();
  const { isLoading: isClaimingSingle } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });

  function claim(rewardToken: Address) {
    if (!dividends) return;
    claimWrite({
      address: dividends,
      abi: DIVIDENDS_ABI,
      functionName: "claim",
      args: [rewardToken],
    });
  }

  // Write: withdrawVested single token
  const { writeContract: withdrawWrite, data: withdrawTxHash } = useWriteContract();
  const { isLoading: isWithdrawingSingle } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  });

  function withdrawVested(rewardToken: Address) {
    if (!dividends) return;
    withdrawWrite({
      address: dividends,
      abi: DIVIDENDS_ABI,
      functionName: "withdrawVested",
      args: [rewardToken],
    });
  }

  return {
    rewardTokens: tokenAddresses,
    tokenData,
    claimAll,
    withdrawAllVested,
    claim,
    withdrawVested,
    refetch,
    isClaiming,
    isWithdrawing,
    isClaimingSingle,
    isWithdrawingSingle,
    claimSuccess,
    withdrawSuccess,
  };
}
