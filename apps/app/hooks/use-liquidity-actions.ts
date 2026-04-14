"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, maxUint128 } from "viem";

import { POOL_WRITE_ABI } from "@/services/pool";

/**
 * Hook for liquidity write operations: mint (add), burn (remove), collect (fees).
 *
 * @example
 * const { addLiquidity, removeLiquidity, collectFees, isPending } = useLiquidityActions();
 * await addLiquidity({ poolAddress, recipient, tickLower, tickUpper, amount });
 */
export function useLiquidityActions() {
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();

  const { writeContract, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  });

  function addLiquidity(params: {
    poolAddress: Address;
    recipient: Address;
    tickLower: number;
    tickUpper: number;
    amount: bigint;
  }) {
    writeContract(
      {
        address: params.poolAddress,
        abi: POOL_WRITE_ABI,
        functionName: "mint",
        args: [
          params.recipient,
          params.tickLower,
          params.tickUpper,
          params.amount,
          "0x" as `0x${string}`,
        ],
      },
      { onSuccess: (hash) => setLastTxHash(hash) },
    );
  }

  function removeLiquidity(params: {
    poolAddress: Address;
    tickLower: number;
    tickUpper: number;
    amount: bigint;
  }) {
    writeContract(
      {
        address: params.poolAddress,
        abi: POOL_WRITE_ABI,
        functionName: "burn",
        args: [params.tickLower, params.tickUpper, params.amount],
      },
      { onSuccess: (hash) => setLastTxHash(hash) },
    );
  }

  function collectFees(params: {
    poolAddress: Address;
    recipient: Address;
    tickLower: number;
    tickUpper: number;
  }) {
    writeContract(
      {
        address: params.poolAddress,
        abi: POOL_WRITE_ABI,
        functionName: "collect",
        args: [
          params.recipient,
          params.tickLower,
          params.tickUpper,
          maxUint128,
          maxUint128,
        ],
      },
      { onSuccess: (hash) => setLastTxHash(hash) },
    );
  }

  return {
    addLiquidity,
    removeLiquidity,
    collectFees,
    isPending: isWriting || isConfirming,
    isWriting,
    isConfirming,
    lastTxHash,
  };
}
