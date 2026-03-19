import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Types
import { borrowSchema } from "@/types/schemes";
import type { BorrowFormValues, FieldItem } from "@/types/interfaces";

// Utils
import {
  formatStakeNumber,
  calculateLoanFees,
  generateMockBorrowData,
  calculateCollateralRequired,
} from "@/utils/number";

// Constants
import { BORROW_FIELDS, BORROW_DURATION_OPTIONS } from "@/types/constants";

// Components — needed for JSX descriptions in field config
import Avatar from "@/components/atoms/avatar";

/**
 * Manages the borrow form state:
 * - Collateral and fee calculations that update as the user types
 * - Field config with JSX descriptions (use-max button, token avatar)
 * - Mock submit handler, will be replaced with contract call
 */
export function useBorrowForm(token: string) {
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

  // Mock submit — will be replaced with actual borrow contract interaction
  async function onSubmit(data: BorrowFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    form.reset();
    console.log(
      "Borrowed:",
      data.borrowAmount,
      token,
      "for",
      data.duration,
      "days",
    );
  }

  // Field config with JSX elements — can't live in constants due to dynamic descriptions
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
