/**
 * Shared step machine for any 2-step approve → action flow
 * (borrow, swap, repay, add-collateral, …).
 *
 * The state surface is identical across actions; each consumer supplies
 * its own localized labels when rendering TxFlowStatus.
 */
export type TxFlowStep =
  | "idle"
  | "approve-wallet" // waiting for user to sign approve in wallet
  | "approve-pending" // approve tx submitted, awaiting receipt
  | "approve-confirmed" // approve confirmed; action tx about to fire
  | "action-wallet" // waiting for user to sign action in wallet
  | "action-pending" // action tx submitted, awaiting receipt
  | "success"
  | "error";

export interface TxFlowState {
  step: TxFlowStep;
  approveTxHash?: `0x${string}`;
  actionTxHash?: `0x${string}`;
  errorMessage?: string;
}

export interface TxFlowLabels {
  title: string;
  awaitingApproveSignature: string;
  approvingOnChain: string;
  approveDone: string;
  approveStepFallback: string;
  awaitingActionSignature: string;
  actionPending: string;
  actionSubmitting: string;
  actionDone: string;
  actionStepFallback: string;
  dismiss: string;
}
