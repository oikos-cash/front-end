"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { type Address, erc20Abi } from "viem";

import { useAllowances } from "@/hooks/use-allowances";
import { EXCHANGE_HELPER_ABI } from "@/lib/oikos-addresses";
import type { TxFlowState, TxFlowStep } from "@/hooks/types/tx-flow";

export type SwapMode =
  | "buyTokens" // native BNB -> vault token (payable, no `amount` arg)
  | "buyTokensWETH" // WBNB -> vault token
  | "sellTokens" // vault token -> WBNB
  | "sellTokensETH"; // vault token -> native BNB

export interface SwapExecuteParams {
  mode: SwapMode;
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
 *
 * Use `submit(params, approveAmount?)` to chain approve→execute in one click:
 * the hook auto-fires the swap when the approval tx confirms. Step state is
 * exposed via `flowState` for UI feedback.
 */
export function useSwap(
  ownerAddress: Address | null | undefined,
  tokenIn: Address | undefined,
  spenderAddress: Address | undefined,
  amountIn?: bigint,
) {
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

  // --- Approve write + receipt ---
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApproveSubmitting,
    error: approveWriteError,
    reset: resetApprove,
  } = useWriteContract();
  const {
    isLoading: isApproveConfirming,
    isSuccess: approveSuccess,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const approveError = approveWriteError ?? approveReceiptError ?? null;

  // --- Swap write + receipt ---
  const {
    writeContract: writeSwap,
    data: swapTxHash,
    isPending: isSwapSubmitting,
    error: swapWriteError,
    reset: resetSwap,
  } = useWriteContract();
  const {
    isLoading: isSwapConfirming,
    isSuccess: swapSuccess,
    error: swapReceiptError,
    data: swapReceipt,
  } = useWaitForTransactionReceipt({ hash: swapTxHash });

  const swapError = swapWriteError ?? swapReceiptError ?? null;
  const swapReverted = !!swapReceipt && swapReceipt.status === "reverted";

  // --- Chained submission state ---
  const [pendingSwap, setPendingSwap] = useState<SwapExecuteParams | null>(null);

  function fireSwap(params: SwapExecuteParams) {
    const referralCode = params.referralCode ?? "0x0000000000000000";
    const isLimitOrder = params.isLimitOrder ?? false;
    const slippageTolerance = BigInt(params.slippageBps);

    if (params.mode === "buyTokens") {
      // Native BNB source — amount travels as msg.value, no `amount` parameter.
      writeSwap({
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
      });
      return;
    }

    // buyTokensWETH / sellTokens / sellTokensETH all share the same arg shape.
    writeSwap({
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
    });
  }

  const fireSwapRef = useRef(fireSwap);
  fireSwapRef.current = fireSwap;
  const refetchAllowanceRef = useRef(refetchAllowance);
  refetchAllowanceRef.current = refetchAllowance;

  // When approval lands, refresh allowance and chain into swap if queued.
  useEffect(() => {
    if (!approveSuccess) return;
    refetchAllowanceRef.current();
    if (pendingSwap) {
      fireSwapRef.current(pendingSwap);
      setPendingSwap(null);
    }
  }, [approveSuccess, pendingSwap]);

  // Drop the queued swap if the approval fails.
  useEffect(() => {
    if (approveError && pendingSwap) setPendingSwap(null);
  }, [approveError, pendingSwap]);

  // --- Public API ---

  /** Low-level escape hatch: write approve directly. */
  async function approve(amount: bigint) {
    if (!tokenIn || !spenderAddress) return;
    writeApprove({
      address: tokenIn,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, amount],
    });
  }

  /** Low-level escape hatch: write swap directly (no allowance check). */
  async function execute(params: SwapExecuteParams) {
    fireSwap(params);
  }

  /**
   * Chained submit: if `needsApproval` is true, fires approve and queues
   * the swap for auto-execution on receipt; otherwise fires the swap.
   *
   * @param approveAmount override the approval amount (e.g. maxUint256
   *   for "approve max"); defaults to `params.amount`.
   */
  async function submit(params: SwapExecuteParams, approveAmount?: bigint) {
    if (!needsApproval) {
      fireSwap(params);
      return;
    }
    if (!tokenIn || !spenderAddress) return;
    setPendingSwap(params);
    writeApprove({
      address: tokenIn,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, approveAmount ?? params.amount],
    });
  }

  function reset() {
    resetApprove();
    resetSwap();
    setPendingSwap(null);
  }

  // --- Step-state machine for UI ---
  const step: TxFlowStep = useMemo(() => {
    if (swapError || swapReverted) return "error";
    if (approveError) return "error";
    if (swapSuccess) return "success";
    if (isSwapConfirming) return "action-pending";
    if (isSwapSubmitting) return "action-wallet";
    if (isApproveConfirming) return "approve-pending";
    if (isApproveSubmitting) return "approve-wallet";
    if (pendingSwap && approveSuccess) return "approve-confirmed";
    return "idle";
  }, [
    approveError,
    approveSuccess,
    swapError,
    swapReverted,
    swapSuccess,
    isApproveConfirming,
    isApproveSubmitting,
    isSwapSubmitting,
    isSwapConfirming,
    pendingSwap,
  ]);

  function formatError(err: unknown): string {
    if (!err) return "";
    const msg = err instanceof Error ? err.message : String(err);
    const m = msg.match(/reason="([^"]+)"|reverted with(?: reason)?:?\s*([^\n]+)/i);
    if (m) return (m[1] || m[2] || "").trim();
    return msg.split("\n")[0].slice(0, 200);
  }

  const errorMessage = useMemo(() => {
    if (swapError) return formatError(swapError);
    if (swapReverted) return "Swap transaction reverted on-chain.";
    if (approveError) return formatError(approveError);
    return "";
  }, [approveError, swapError, swapReverted]);

  const flowState: TxFlowState = useMemo(
    () => ({
      step,
      approveTxHash,
      actionTxHash: swapTxHash,
      errorMessage: errorMessage || undefined,
    }),
    [step, approveTxHash, swapTxHash, errorMessage],
  );

  const isPending = step !== "idle" && step !== "success" && step !== "error";

  return {
    // Actions
    submit,
    execute,
    approve,
    reset,
    // Allowance
    allowance,
    needsApproval,
    refetchAllowance,
    // Tx state
    flowState,
    isPending,
    // Granular loading flags (back-compat)
    isApproving: isApproveSubmitting || isApproveConfirming,
    isSwapping: isSwapSubmitting,
    isConfirming: isSwapConfirming,
    lastTxHash: swapTxHash,
  };
}
