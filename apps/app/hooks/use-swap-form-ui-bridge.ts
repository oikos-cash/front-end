"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useUiBridgeStore } from "@/stores/ui-bridge";

import type { SwapFormValues } from "@/types/interfaces";
import { SWAP_SLIPPAGE_OPTIONS } from "@/types/constants";
import type { TxFlowState } from "@/hooks/types/tx-flow";

interface Options {
  /** The react-hook-form instance owning the swap form. */
  form: UseFormReturn<SwapFormValues>;
  /** Current value of the slippage selector ("0.5", "1", "custom", …). */
  slippage: string;
  /** Custom slippage input (used when slippage === "custom"). */
  customSlippage: string;
  setSlippage: (v: string) => void;
  setCustomSlippage: (v: string) => void;
  /** The current TxFlowState from useSwap — drives submit resolution. */
  flowState: TxFlowState;
  /** Same handler the visible Swap button fires. Triggers the wallet
   *  flow; the result lands asynchronously in `flowState`. */
  onSubmit: () => Promise<void> | void;
}

/**
 * Bridges the swap form's local state with the global ui-bridge store
 * so the in-process ui-mcp server can drive `ui__get_swap_state`,
 * `ui__set_swap_form`, and `ui__submit_swap` end-to-end.
 *
 * Three loops:
 *   1. Form/slippage → store (continuous sync of getState).
 *   2. Store request → form (apply prefill on each new nonce).
 *   3. Store submit-request → onSubmit → flowState terminal step
 *      resolves the request's promise with the tx hash (or rejects).
 *
 * The submit tracker only resolves agent-initiated submits. A user
 * clicking the Swap button doesn't go through the bridge — they have
 * no pending request, so their flowState transitions are ignored
 * here and go through the normal UI feedback path.
 */
export function useSwapFormUiBridge({
  form,
  slippage,
  customSlippage,
  setSlippage,
  setCustomSlippage,
  flowState,
  onSubmit,
}: Options): void {
  const reportSwapFormState = useUiBridgeStore((s) => s.reportSwapFormState);
  const swapFormRequest = useUiBridgeStore((s) => s.swapFormRequest);
  const submitSwapRequest = useUiBridgeStore((s) => s.submitSwapRequest);
  const consumeSwapFormRequest = useUiBridgeStore(
    (s) => s.consumeSwapFormRequest,
  );
  const consumeSubmitSwapRequest = useUiBridgeStore(
    (s) => s.consumeSubmitSwapRequest,
  );

  const fromToken = form.watch("fromToken");
  const toToken = form.watch("toToken");
  const fromAmount = form.watch("fromAmount");

  // ── 1. Form/slippage → store ───────────────────────────────────────
  useEffect(() => {
    const activePct =
      slippage === "custom"
        ? parseFloat(customSlippage)
        : parseFloat(slippage);
    const slippageBps = Number.isFinite(activePct)
      ? Math.round(activePct * 100)
      : null;
    reportSwapFormState({
      sellToken: fromToken ? fromToken : null,
      buyToken: toToken ? toToken : null,
      amount: fromAmount ? fromAmount : null,
      slippageBps,
    });
    return () => {
      // Unmount: clear so a downstream get_swap_state doesn't return
      // stale values from a no-longer-mounted form.
      reportSwapFormState(null);
    };
  }, [
    fromToken,
    toToken,
    fromAmount,
    slippage,
    customSlippage,
    reportSwapFormState,
  ]);

  // ── 2. Prefill request → form ──────────────────────────────────────
  useEffect(() => {
    if (!swapFormRequest) return;
    const { partial, nonce } = swapFormRequest;
    if (typeof partial.sellToken === "string") {
      form.setValue("fromToken", partial.sellToken, { shouldValidate: true });
    }
    if (typeof partial.buyToken === "string") {
      form.setValue("toToken", partial.buyToken, { shouldValidate: true });
    }
    if (typeof partial.amount === "string") {
      form.setValue("fromAmount", partial.amount, { shouldValidate: true });
    }
    if (typeof partial.slippageBps === "number") {
      // Map to a preset if it matches one of the buttons; otherwise
      // flip to custom and stash the percent value there.
      const pct = (partial.slippageBps / 100).toString();
      const preset = SWAP_SLIPPAGE_OPTIONS.find((opt) => opt === pct);
      if (preset) {
        setSlippage(preset);
        setCustomSlippage("");
      } else {
        setSlippage("custom");
        setCustomSlippage(pct);
      }
    }
    consumeSwapFormRequest(nonce);
  }, [
    swapFormRequest,
    form,
    setSlippage,
    setCustomSlippage,
    consumeSwapFormRequest,
  ]);

  // ── 3. Submit request → onSubmit → flowState resolution ────────────
  // Ref tracks the in-flight agent submit so we know which promise to
  // resolve when flowState reaches a terminal step. Cleared on either
  // success or error; protects against double-resolution.
  type Pending = { resolve: (r: { hash: string }) => void; reject: (e: Error) => void };
  const pendingSubmitRef = useRef<Pending | null>(null);

  useEffect(() => {
    if (!submitSwapRequest) return;
    // If an earlier agent-initiated submit is still in flight, reject
    // it before claiming the new one — otherwise the old promise
    // dangles forever.
    if (pendingSubmitRef.current) {
      pendingSubmitRef.current.reject(
        new Error("swap superseded by a newer ui__submit_swap request"),
      );
    }
    pendingSubmitRef.current = {
      resolve: submitSwapRequest.resolve,
      reject: submitSwapRequest.reject,
    };
    consumeSubmitSwapRequest(submitSwapRequest.nonce);
    void Promise.resolve(onSubmit()).catch((err) => {
      // Synchronous failure inside onSubmit (validation, etc.) — reject
      // here because the flowState machine won't ever fire.
      const pending = pendingSubmitRef.current;
      if (pending) {
        pending.reject(err instanceof Error ? err : new Error(String(err)));
        pendingSubmitRef.current = null;
      }
    });
  }, [submitSwapRequest, onSubmit, consumeSubmitSwapRequest]);

  useEffect(() => {
    const pending = pendingSubmitRef.current;
    if (!pending) return;
    if (flowState.step === "success" && flowState.actionTxHash) {
      pending.resolve({ hash: flowState.actionTxHash });
      pendingSubmitRef.current = null;
    } else if (flowState.step === "error") {
      pending.reject(
        new Error(flowState.errorMessage ?? "swap failed"),
      );
      pendingSubmitRef.current = null;
    }
  }, [flowState]);
}
