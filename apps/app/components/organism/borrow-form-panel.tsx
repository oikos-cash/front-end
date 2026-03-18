"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import Card from "@/components/atoms/card";
import Button from "@/components/atoms/button";
import Avatar from "@/components/atoms/avatar";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Types
import { borrowSchema } from "@/types/schemes";
import type { BorrowFormValues, BorrowFormPanelProps } from "@/types/interfaces";

// Utils
import {
  generateMockBorrowData,
  formatStakeNumber,
  calculateCollateralRequired,
  calculateLoanFees,
} from "@/utils/number";

// Constants
import { BORROW_DURATION_OPTIONS } from "@/types/constanst";

export default function BorrowFormPanel({ token = "OKS" }: BorrowFormPanelProps) {
  const t = useTranslations("borrow");
  const { isConnected } = useWallet();

  const borrowData = useMemo(() => generateMockBorrowData(token), [token]);

  const form = useForm<BorrowFormValues>({
    resolver: zodResolver(borrowSchema),
    defaultValues: { borrowAmount: "", duration: "30" },
    mode: "onChange",
  });

  const borrowAmountValue = form.watch("borrowAmount");
  const durationValue = form.watch("duration");
  const numericAmount = parseFloat(borrowAmountValue) || 0;
  const numericDuration = parseInt(durationValue) || 0;

  const collateralRequired = useMemo(
    () => calculateCollateralRequired(numericAmount, borrowData.imv),
    [numericAmount, borrowData.imv],
  );

  const loanFees = useMemo(
    () => calculateLoanFees(numericAmount, numericDuration, borrowData.dailyInterest),
    [numericAmount, numericDuration, borrowData.dailyInterest],
  );

  function handleUseMax() {
    form.setValue("borrowAmount", borrowData.userBalance.toString(), {
      shouldValidate: true,
    });
  }

  async function onSubmit(data: BorrowFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    form.reset();
    console.log("Borrowed:", data.borrowAmount, token, "for", data.duration, "days");
  }

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
              {numericAmount > 0 ? formatStakeNumber(collateralRequired) : "0.00"}{" "}
              {token}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              {t("loanFees")}
            </span>
            <span className="text-lg font-medium text-primary">
              {numericAmount > 0 ? formatStakeNumber(loanFees) : "0.00"}{" "}
              {token}
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
        <FieldRenderer
          t={t}
          control={form.control}
          fields={[
            {
              min: 0,
              step: "any",
              type: "number",
              name: "borrowAmount",
              placeholder: "0.00",
              label: t("borrowAmount"),
              ariaLabel: t("borrowAmount"),
              endContent: <Avatar name={token} size="default" />,
              description: (
                <button
                  type="button"
                  onClick={handleUseMax}
                  className="text-xs text-primary hover:underline"
                >
                  {t("useMax", {
                    amount: formatStakeNumber(borrowData.userBalance),
                    token,
                  })}
                </button>
              ),
            },
            {
              type: "select",
              name: "duration",
              label: t("duration"),
              ariaLabel: t("duration"),
              items: BORROW_DURATION_OPTIONS,
              defaultValue: "30",
            },
          ]}
        />
      </form>
    </Card>
  );
}
