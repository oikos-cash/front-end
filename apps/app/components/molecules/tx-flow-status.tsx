"use client";

import { Check, Loader2, AlertCircle, ExternalLink, X } from "lucide-react";

import type { TxFlowLabels, TxFlowState } from "@/hooks/types/tx-flow";

interface Props {
  state: TxFlowState;
  labels: TxFlowLabels;
  onDismiss?: () => void;
}

/**
 * Generic 2-step "approve → action" status surface. Used by Borrow + Swap +
 * any future flow with the same shape.
 *
 * Caller passes localized labels per step. The component picks the right
 * label and visual state (pending circle / spinner / check / error) from
 * the current step in `state.step`.
 */
export default function TxFlowStatus({ state, labels, onDismiss }: Props) {
  if (state.step === "idle") return null;

  const approveDone =
    state.step === "approve-confirmed" ||
    state.step === "action-wallet" ||
    state.step === "action-pending" ||
    state.step === "success";
  const approveInFlight =
    state.step === "approve-wallet" || state.step === "approve-pending";
  const actionInFlight =
    state.step === "action-wallet" || state.step === "action-pending";
  const actionDone = state.step === "success";
  const hasError = state.step === "error";

  const approveLabel = (() => {
    if (state.step === "approve-wallet") return labels.awaitingApproveSignature;
    if (state.step === "approve-pending") return labels.approvingOnChain;
    if (approveDone) return labels.approveDone;
    return labels.approveStepFallback;
  })();

  const actionLabel = (() => {
    if (state.step === "action-wallet") return labels.awaitingActionSignature;
    if (state.step === "action-pending") return labels.actionPending;
    if (state.step === "approve-confirmed") return labels.actionSubmitting;
    if (actionDone) return labels.actionDone;
    return labels.actionStepFallback;
  })();

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {labels.title}
        </span>
        {(hasError || actionDone) && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label={labels.dismiss}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <StatusRow
        state={
          hasError && !approveDone
            ? "error"
            : approveInFlight
            ? "loading"
            : approveDone
            ? "done"
            : "pending"
        }
        label={approveLabel}
        txHash={state.approveTxHash}
      />

      <StatusRow
        state={
          hasError && approveDone
            ? "error"
            : actionInFlight || state.step === "approve-confirmed"
            ? "loading"
            : actionDone
            ? "done"
            : "pending"
        }
        label={actionLabel}
        txHash={state.actionTxHash}
      />

      {hasError && state.errorMessage && (
        <div className="mt-1 flex items-start gap-1.5 rounded-sm bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span className="break-words">{state.errorMessage}</span>
        </div>
      )}
    </div>
  );
}

function StatusRow({
  state,
  label,
  txHash,
}: {
  state: "pending" | "loading" | "done" | "error";
  label: string;
  txHash?: `0x${string}`;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2">
        {state === "loading" && (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        )}
        {state === "done" && <Check className="size-3.5 text-emerald-500" />}
        {state === "pending" && (
          <span className="size-3.5 rounded-full border border-muted-foreground/40" />
        )}
        {state === "error" && (
          <AlertCircle className="size-3.5 text-destructive" />
        )}
        <span
          className={
            state === "pending" ? "text-muted-foreground" : "text-foreground"
          }
        >
          {label}
        </span>
      </div>
      {txHash && (
        <a
          href={`https://bscscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {`${txHash.slice(0, 6)}…${txHash.slice(-4)}`}
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}
