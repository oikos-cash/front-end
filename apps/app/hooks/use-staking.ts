"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, maxUint256 } from "viem";
import type { Address } from "viem";

import { useWallet } from "@/stores/wallet";
import { STAKING_ABI, ERC20_ABI } from "@/lib/abis";

/**
 * Hook for interacting with the Staking contract.
 * Reads: totalStaked, stakedBalance, totalRewards, cooldown state.
 * Writes: approve, stake, unstake.
 */
export function useStaking(
  stakingAddress?: string,
  tokenAddress?: string,
  sTokenAddress?: string,
) {
  const { address, isConnected } = useWallet();
  const staking = stakingAddress as Address | undefined;
  const token = tokenAddress as Address | undefined;
  const sToken = sTokenAddress as Address | undefined;
  const user = address as Address | undefined;
  const enabled = !!staking && !!token;

  // Global reads
  const { data: totalStaked } = useReadContract({
    address: staking, abi: STAKING_ABI, functionName: "totalStaked",
    query: { enabled },
  });
  const { data: totalRewards } = useReadContract({
    address: staking, abi: STAKING_ABI, functionName: "totalRewards",
    query: { enabled },
  });
  const { data: lockInEpochs } = useReadContract({
    address: staking, abi: STAKING_ABI, functionName: "lockInEpochs",
    query: { enabled },
  });

  // User reads
  const { data: stakedBalance } = useReadContract({
    address: staking, abi: STAKING_ABI, functionName: "stakedBalance",
    args: user ? [user] : undefined,
    query: { enabled: enabled && !!user },
  });
  const { data: lastOpTimestamp } = useReadContract({
    address: staking, abi: STAKING_ABI, functionName: "lastOperationTimestamp",
    args: user ? [user] : undefined,
    query: { enabled: enabled && !!user },
  });
  const { data: allowance } = useReadContract({
    address: token, abi: ERC20_ABI, functionName: "allowance",
    args: user && staking ? [user, staking] : undefined,
    query: { enabled: enabled && !!user },
  });
  const { data: tokenBalance } = useReadContract({
    address: token, abi: ERC20_ABI, functionName: "balanceOf",
    args: user ? [user] : undefined,
    query: { enabled: enabled && !!user },
  });
  const { data: sTokenBalance } = useReadContract({
    address: sToken, abi: ERC20_ABI, functionName: "balanceOf",
    args: user ? [user] : undefined,
    query: { enabled: !!sToken && !!user },
  });

  const needsApproval = allowance !== undefined && allowance === BigInt(0);

  const cooldownEnd = lastOpTimestamp && lockInEpochs
    ? Number(lastOpTimestamp) + Number(lockInEpochs) * 28800
    : null;
  const isCooldownActive = cooldownEnd ? Date.now() / 1000 < cooldownEnd : false;

  // Write: approve
  const { writeContract: approveWrite, data: approveTxHash } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });

  function approve() {
    if (!token || !staking) return;
    approveWrite({ address: token, abi: ERC20_ABI, functionName: "approve", args: [staking, maxUint256] });
  }

  // Write: stake
  const { writeContract: stakeWrite, data: stakeTxHash } = useWriteContract();
  const { isLoading: isStaking, isSuccess: stakeSuccess } = useWaitForTransactionReceipt({ hash: stakeTxHash });

  function stake(amount: string) {
    if (!staking) return;
    stakeWrite({ address: staking, abi: STAKING_ABI, functionName: "stake", args: [parseEther(amount)] });
  }

  // Write: unstake
  const { writeContract: unstakeWrite, data: unstakeTxHash } = useWriteContract();
  const { isLoading: isUnstaking, isSuccess: unstakeSuccess } = useWaitForTransactionReceipt({ hash: unstakeTxHash });

  function unstake() {
    if (!staking) return;
    unstakeWrite({ address: staking, abi: STAKING_ABI, functionName: "unstake" });
  }

  return {
    totalStaked, totalRewards, stakedBalance, sTokenBalance, tokenBalance,
    needsApproval, isCooldownActive, cooldownEnd,
    approve, stake, unstake,
    isApproving, isStaking, isUnstaking, stakeSuccess, unstakeSuccess,
  };
}
