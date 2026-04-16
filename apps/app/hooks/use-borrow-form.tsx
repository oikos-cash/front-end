"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useLending } from "@/hooks/use-lending";

// Types
import { borrowSchema } from "@/types/schemes";
import type { BorrowFormValues, FieldItem, VaultInfo } from "@/types/interfaces";

// Utils
import {
  formatStakeNumber,
  calculateLoanFees,
  calculateCollateralRequired,
} from "@/utils/number";

// Constants
import { BORROW_FIELDS, BORROW_DURATION_OPTIONS } from "@/types/constants";

// Components — needed for JSX descriptions in field config
import Avatar from "@/components/atoms/avatar";

/**
 * Manages the borrow form state:
 * - Collateral and fee calculations from real vault data
 * - Field config with JSX descriptions (use-max button, token avatar)
 * - Submit handler (will be replaced with contract call)
 */
export function useBorrowForm(vault: VaultInfo | null) {
  const t = useTranslations("borrow");
  const { isConnected } = useWallet();

  const token = vault?.tokenSymbol ?? "TOKEN";
  const imv = parseFloat(vault?.liquidityRatio ?? "0");
  const dailyInterest = parseFloat(vault?.totalInterest ?? "0");
  const liquidityRatio = parseFloat(vault?.liquidityRatio ?? "0");
  const isActive = liquidityRatio > 0;

  const { borrow: lendingBorrow, isBorrowing } = useLending(
    vault?.address,
    vault?.token0,
  );

  const borrowData = {
    tokenPair: `${token}/WBNB`,
    imv,
    dailyInterest,
    userBalance: 0,
    protocolStatus: (isActive ? "active" : "paused") as "active" | "paused",
  };

  const form = useForm<BorrowFormValues>({
    resolver: zodResolver(borrowSchema),
    defaultValues: { borrowAmount: "", duration: "30" },
    mode: "onChange",
  });

  const borrowAmountValue = form.watch("borrowAmount");
  const durationValue = form.watch("duration");
  const numericAmount = parseFloat(borrowAmountValue) || 0;
  const numericDuration = parseInt(durationValue) || 0;

  // Derived values — recalculate on every keystroke to show real-time feedback
  const collateralRequired = useMemo(
    () => calculateCollateralRequired(numericAmount, borrowData.imv),
    [numericAmount, borrowData.imv],
  );

  const loanFees = useMemo(
    () =>
      calculateLoanFees(
        numericAmount,
        numericDuration,
        borrowData.dailyInterest,
      ),
    [numericAmount, numericDuration, borrowData.dailyInterest],
  );

  function handleUseMax() {
    form.setValue("borrowAmount", borrowData.userBalance.toString(), {
      shouldValidate: true,
    });
  }

  // Submit — calls real borrow contract via useLending
  async function onSubmit(data: BorrowFormValues) {
    const durationSeconds = parseInt(data.duration) * 86400;
    lendingBorrow(data.borrowAmount, durationSeconds);
    form.reset();
  }

  // Field config with JSX elements
  const fields: FieldItem[] = BORROW_FIELDS.map((field) => ({
    ...field,
    label: t(field.name),
    ariaLabel: t(field.name),
    ...(field.name === "borrowAmount" && {
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
    }),
    ...(field.name === "duration" && {
      items: BORROW_DURATION_OPTIONS,
      defaultValue: "30",
    }),
  })) as FieldItem[];

  return {
    t,
    form,
    token,
    fields,
    loanFees,
    onSubmit,
    isConnected,
    numericAmount,
    collateralRequired,
  };
}
