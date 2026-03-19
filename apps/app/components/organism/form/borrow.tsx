"use client";

// Components
import Card from "@/components/atoms/card";
import Button from "@/components/atoms/button";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useBorrowForm } from "@/hooks/use-borrow-form";

// Types
import type { BorrowFormPanelProps } from "@/types/interfaces";

// Utils
import { formatStakeNumber } from "@/utils/number";

export default function BorrowFormPanel({
  token = "OKS",
}: BorrowFormPanelProps) {
  const {
    t,
    form,
    isConnected,
    numericAmount,
    collateralRequired,
    loanFees,
    fields,
    onSubmit,
  } = useBorrowForm(token);

  if (!isConnected) return null;

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
              {numericAmount > 0 ? formatStakeNumber(loanFees) : "0.00"} {token}
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button
            type="submit"
            disabled={!form.formState.isValid}
            isLoading={form.formState.isSubmitting}
          >
            {t("borrowAction")}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FieldRenderer t={t} control={form.control} fields={fields} />
      </form>
    </Card>
  );
}
