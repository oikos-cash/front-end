"use client";

import { useMemo, useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { type Address, erc20Abi } from "viem";

import { useAllowances } from "@/hooks/use-allowances";
import { EXCHANGE_HELPER_ABI } from "@/lib/oikos-addresses";

export type SwapMode =
  | "buyTokens" // native BNB -> vault token (payable, no `amount` arg)
  | "buyTokensWETH" // WBNB -> vault token
  | "sellTokens" // vault token -> WBNB
  | "sellTokensETH"; // vault token -> native BNB

export interface SwapExecuteParams {
  mode: SwapMode;
  /** ExchangeHelper address (or whichever chain-specific helper). */
  routerAddress: Address;
  vaultAddress: Address;
  pool: Address;
  /** Reference price for slippage anchoring — pass vault.spotPriceX96. */
  price: bigint;
  /** Source amount in wei. For mode "buyTokens" this is forwarded as msg.value. */
  amount: bigint;
  minAmount: bigint;
  receiver: Address;
  /** Slippage in basis points (e.g. 50 = 0.5%). */
  slippageBps: number;
  isLimitOrder?: boolean;
  referralCode?: `0x${string}`;
}

/**
 * Approve + swap helper around the Oikos ExchangeHelper.
 *
 * Pass `tokenIn = undefined` when the source is native BNB — no ERC20
 * approval is needed and `needsApproval` will be false.
 */
export function useSwap(
  ownerAddress: Address | null | undefined,
  tokenIn: Address | undefined,
  spenderAddress: Address | undefined,
  amountIn?: bigint,
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
  const allowance = allowances[0]?.allowance ?? BigInt(0);
  const needsApproval = useMemo(() => {
    if (!tokenIn || !spenderAddress) return false;
    if (amountIn == null || amountIn === BigInt(0)) return false;
    return allowance < amountIn;
  }, [allowance, amountIn, tokenIn, spenderAddress]);

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

  async function approve(amount: bigint) {
    if (!tokenIn || !spenderAddress) return;
    writeApprove(
      {
        address: tokenIn,
        abi: erc20Abi,
        functionName: "approve",
        args: [spenderAddress, amount],
      },
      {
        onSuccess: (hash) => {
          setLastTxHash(hash);
          refetchAllowance();
        },
      },
    );
  }

  async function execute(params: SwapExecuteParams) {
    const referralCode = params.referralCode ?? "0x0000000000000000";
    const isLimitOrder = params.isLimitOrder ?? false;
    const slippageTolerance = BigInt(params.slippageBps);

    if (params.mode === "buyTokens") {
      // Native BNB source — amount travels as msg.value, no `amount` parameter.
      writeSwap(
        {
          address: params.routerAddress,
          abi: EXCHANGE_HELPER_ABI,
          functionName: "buyTokens",
          args: [
            params.vaultAddress,
            params.pool,
            params.price,
            params.minAmount,
            params.receiver,
            isLimitOrder,
            slippageTolerance,
            referralCode,
          ],
          value: params.amount,
        },
        { onSuccess: (hash) => setLastTxHash(hash) },
      );
      return;
    }

    // buyTokensWETH / sellTokens / sellTokensETH all share the same arg shape.
    writeSwap(
      {
        address: params.routerAddress,
        abi: EXCHANGE_HELPER_ABI,
        functionName: params.mode,
        args: [
          params.vaultAddress,
          params.pool,
          params.price,
          params.amount,
          params.minAmount,
          params.receiver,
          isLimitOrder,
          slippageTolerance,
          referralCode,
        ],
      },
      { onSuccess: (hash) => setLastTxHash(hash) },
    );
  }

  return {
    execute,
    approve,
    allowance,
    needsApproval,
    isPending: isApproving || isSwapping || isConfirming,
    isApproving,
    isSwapping,
    isConfirming,
    lastTxHash,
    refetchAllowance,
  };
}
