"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, toHex, pad } from "viem";
import type { Address } from "viem";

import { useWallet } from "@/stores/wallet";
import { PRESALE_ABI } from "@/lib/abis";

/**
 * Hook for interacting with the Presale contract.
 * Reads: totalRaised, hardCap, softCap, contributions, timeLeft, status.
 * Writes: deposit, withdraw.
 */
export function usePresaleContract(presaleAddress?: string) {
  const { address } = useWallet();
  const presale = presaleAddress as Address | undefined;
  const user = address as Address | undefined;
  const enabled = !!presale;

  // Reads
  const { data: totalRaised } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "totalRaised",
    query: { enabled, refetchInterval: 15000 },
  });
  const { data: hardCap } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "hardCap",
    query: { enabled },
  });
  const { data: softCap } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "softCap",
    query: { enabled },
  });
  const { data: participantCount } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "getParticipantCount",
    query: { enabled, refetchInterval: 15000 },
  });
  const { data: timeLeft } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "getTimeLeft",
    query: { enabled, refetchInterval: 15000 },
  });
  const { data: isFinalized } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "finalized",
    query: { enabled },
  });
  const { data: isSoftCapReached } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "softCapReached",
    query: { enabled },
  });
  const { data: hasExpired } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "hasExpired",
    query: { enabled },
  });
  const { data: deadline } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "deadline",
    query: { enabled },
  });
  const { data: initialPrice } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "initialPrice",
    query: { enabled },
  });
  const { data: userContribution } = useReadContract({
    address: presale, abi: PRESALE_ABI, functionName: "contributions",
    args: user ? [user] : undefined,
    query: { enabled: enabled && !!user },
  });

  const presaleData = {
    totalRaised: totalRaised ? parseFloat(formatEther(totalRaised as bigint)) : 0,
    hardCap: hardCap ? parseFloat(formatEther(hardCap as bigint)) : 0,
    softCap: softCap ? parseFloat(formatEther(softCap as bigint)) : 0,
    participants: participantCount ? Number(participantCount) : 0,
    timeLeftSeconds: timeLeft ? Number(timeLeft) : 0,
    isFinalized: (isFinalized as boolean) ?? false,
    isSoftCapReached: (isSoftCapReached as boolean) ?? false,
    hasExpired: (hasExpired as boolean) ?? false,
    deadline: deadline ? Number(deadline) : 0,
    initialPrice: initialPrice ? parseFloat(formatEther(initialPrice as bigint)) : 0,
    userContribution: userContribution ? parseFloat(formatEther(userContribution as bigint)) : 0,
    status: (isFinalized ? "finalized" : hasExpired ? "ended" : "active") as
      | "active" | "ended" | "finalized",
  };

  // Write: deposit
  const { writeContract: depositWrite, data: depositTxHash } = useWriteContract();
  const { isLoading: isDepositing, isSuccess: depositSuccess } = useWaitForTransactionReceipt({ hash: depositTxHash });

  function deposit(amountBnb: string, referralCode?: string) {
    if (!presale) return;
    const code = referralCode
      ? pad(toHex(referralCode), { size: 8 })
      : ("0x0000000000000000" as `0x${string}`);
    depositWrite({
      address: presale, abi: PRESALE_ABI, functionName: "deposit",
      args: [code], value: parseEther(amountBnb),
    });
  }

  // Write: withdraw
  const { writeContract: withdrawWrite, data: withdrawTxHash } = useWriteContract();
  const { isLoading: isWithdrawing, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  function withdraw() {
    if (!presale) return;
    withdrawWrite({ address: presale, abi: PRESALE_ABI, functionName: "withdraw" });
  }

  return {
    presaleData, deposit, withdraw, refetch: () => {},
    isDepositing, isWithdrawing, depositSuccess, withdrawSuccess,
  };
}
