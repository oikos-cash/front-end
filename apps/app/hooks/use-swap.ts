"use client";

import { useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { type Address, erc20Abi, maxUint256 } from "viem";

import { useAllowances } from "@/hooks/use-allowances";

// Minimal Router ABI for exactInputSingle
const ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export interface SwapParams {
  routerAddress: Address;
  tokenIn: Address;
  tokenOut: Address;
  fee: number;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: Address;
}

/**
 * Hook for executing swaps on Uniswap V3 / PancakeSwap V3 routers.
 * Handles allowance check → approve → swap flow.
 *
 * @example
 * const { execute, approve, needsApproval, isPending } = useSwap(
 *   walletAddress,
 *   tokenInAddress,
 *   routerAddress,
 * );
 */
export function useSwap(
  ownerAddress: Address | null | undefined,
  tokenIn: Address | undefined,
  spenderAddress: Address | undefined,
) {
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();

  // Allowance check
  const pairs =
    ownerAddress && tokenIn && spenderAddress
      ? [{ token: tokenIn, spender: spenderAddress }]
      : [];
  const { allowances, refetch: refetchAllowance } = useAllowances(
    ownerAddress,
    pairs,
  );
  const needsApproval = allowances.length > 0 && !allowances[0].isMaxApproved;

  // Contract writes
  const {
    writeContract: writeApprove,
    isPending: isApproving,
  } = useWriteContract();

  const {
    writeContract: writeSwap,
    isPending: isSwapping,
  } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  });

  async function approve() {
    if (!tokenIn || !spenderAddress) return;
    writeApprove(
      {
        address: tokenIn,
        abi: erc20Abi,
        functionName: "approve",
        args: [spenderAddress, maxUint256],
      },
      {
        onSuccess: (hash) => {
          setLastTxHash(hash);
          refetchAllowance();
        },
      },
    );
  }

  async function execute(params: SwapParams) {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 min

    writeSwap(
      {
        address: params.routerAddress,
        abi: ROUTER_ABI,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            fee: params.fee,
            recipient: params.recipient,
            deadline,
            amountIn: params.amountIn,
            amountOutMinimum: params.amountOutMinimum,
            sqrtPriceLimitX96: BigInt(0),
          },
        ],
      },
      {
        onSuccess: (hash) => setLastTxHash(hash),
      },
    );
  }

  return {
    execute,
    approve,
    needsApproval,
    isPending: isApproving || isSwapping || isConfirming,
    isApproving,
    isSwapping,
    isConfirming,
    lastTxHash,
    refetchAllowance,
  };
}
