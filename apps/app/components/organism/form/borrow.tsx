"use client";

// Components
import Card from "@/components/atoms/card";
import Button from "@/components/atoms/button";
import Empty from "@/components/atoms/empty";
import FieldRenderer from "@/components/molecules/field-renderer";
import TxFlowStatus from "@/components/molecules/tx-flow-status";

// Icons
import { Lock } from "lucide-react";

// Hooks
import { useBorrowForm } from "@/hooks/use-borrow-form";

// Types
import type { BorrowFormPanelProps } from "@/types/interfaces";

// Utils
import { formatStakeNumber } from "@/utils/number";

export default function BorrowFormPanel({
  vault,
}: BorrowFormPanelProps) {
  const {
    t,
    form,
    token,
    isConnected,
    numericAmount,
    collateralRequired,
    loanFees,
    fields,
    onSubmit,
    reset,
    hasActiveLoan,
    needsApproval,
    isPending,
    flowState,
  } = useBorrowForm(vault);

  if (!isConnected) return null;

  // When the user already has an open position on this vault the contract
  // rejects a new borrow (ActiveLoan revert). Hide the borrow controls and
  // show a plain notice instead — the Active Loan card below is the place
  // to repay or roll the existing position.
  if (hasActiveLoan) {
    return (
      <Card title={t("title")} description={t("description")}>
        <Empty
          title={t("activeLoanBlock")}
          description={t("activeLoanBlockDesc")}
          icon={<Lock className="size-6 text-muted-foreground" />}
        />
      </Card>
    );
  }

  const submitLabel = (() => {
    switch (flowState.step) {
      case "approve-wallet":
        return t("awaitingApproveSignature", { token });
      case "approve-pending":
        return t("approvingOnChain", { token });
      case "approve-confirmed":
        return t("submittingBorrow");
      case "action-wallet":
        return t("awaitingBorrowSignature");
      case "action-pending":
        return t("borrowingOnChain");
      case "success":
        return t("borrowAction");
      case "error":
        return needsApproval ? t("approveAndBorrow", { token }) : t("borrowAction");
      default:
        return needsApproval ? t("approveAndBorrow", { token }) : t("borrowAction");
    }
  })();

  const flowLabels = {
    title: t("flowStatusTitle"),
    awaitingApproveSignature: t("awaitingApproveSignature", { token }),
    approvingOnChain: t("approvingOnChain", { token }),
    approveDone: t("approveStepDone", { token }),
    approveStepFallback: t("approveStepDone", { token }),
    awaitingActionSignature: t("awaitingBorrowSignature"),
    actionPending: t("borrowingOnChain"),
    actionSubmitting: t("submittingBorrow"),
    actionDone: t("borrowStepDone"),
    actionStepFallback: t("borrowStepPending"),
    dismiss: t("dismiss"),
  };

  return (
    <Card
      header={
        <div className="flex w-full justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              {t("collateralRequired")}
            </span>
            <span className="text-lg font-medium">
              {numericAmount > 0
                ? formatStakeNumber(collateralRequired)
                : "0.00"}{" "}
              {token}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              {t("loanFees")}
            </span>
            <span className="text-lg font-medium text-primary">
              {numericAmount > 0 ? formatStakeNumber(loanFees) : "0.00"} WBNB
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {hasActiveLoan ? (
            <span className="text-xs text-muted-foreground">
              {t("activeLoanBlock")}
            </span>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            form="borrow-form"
            disabled={!form.formState.isValid || hasActiveLoan || isPending}
            isLoading={isPending}
          >
            {submitLabel}
          </Button>
        </div>
      }
    >
      <form
        id="borrow-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FieldRenderer t={t} control={form.control} fields={fields} />
        <TxFlowStatus state={flowState} labels={flowLabels} onDismiss={reset} />
      </form>
    </Card>
  );
}
