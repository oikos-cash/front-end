"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useLending } from "@/hooks/use-lending";

// Services
import { fetchLoansByUser } from "@/services/loan";

// Types
import type {
  LoanActionTab,
  RollFormValues,
  RepayFormValues,
  AddCollateralFormValues,
  VaultInfo,
  LoanEvent,
} from "@/types/interfaces";
import { repaySchema, rollSchema, addCollateralSchema } from "@/types/schemes";

// Utils
import {
  calculateNewLtv,
  calculateRollFee,
  formatStakeNumber,
  calculateCollateralReturned,
} from "@/utils/number";

// Constants
import { LOAN_TAB_FIELDS, ROLL_DURATION_OPTIONS } from "@/types/constants";

/**
 * Derive active loan state from a user's latest Borrow event for a specific vault.
 * The API returns loan events; the most recent Borrow that hasn't been fully repaid
 * represents the active position.
 */
function deriveActiveLoan(
  loans: LoanEvent[],
  vaultAddress: string,
  vault: VaultInfo | null,
) {
  const vaultLoans = loans
    .filter((l) => l.vaultAddress.toLowerCase() === vaultAddress.toLowerCase())
    .sort((a, b) => b.timestamp - a.timestamp);

  const lastBorrow = vaultLoans.find((l) => l.eventName === "Borrow");

  if (!lastBorrow) return null;

  const borrowAmount = parseFloat(lastBorrow.args.borrowAmount ?? "0") / 1e18;
  const durationSec = parseInt(lastBorrow.args.duration ?? "0");
  const expiresAt = lastBorrow.timestamp + durationSec;
  const now = Math.floor(Date.now() / 1000);
  const daysLeft = Math.max(0, Math.floor((expiresAt - now) / 86400));
  const isExpired = now > expiresAt;

  const imv = parseFloat(vault?.liquidityRatio ?? "0");
  const dailyInterest = parseFloat(vault?.totalInterest ?? "0");
  const collateralAmount = imv > 0 ? borrowAmount / imv : 0;
  const ltv =
    collateralAmount > 0
      ? (borrowAmount / (collateralAmount * imv)) * 100
      : 0;

  const daysSinceBorrow = Math.floor((now - lastBorrow.timestamp) / 86400);
  const totalInterestAccrued = borrowAmount * dailyInterest * daysSinceBorrow;

  return {
    borrowedAmount: borrowAmount,
    collateralAmount,
    ltv,
    daysLeft,
    isExpired,
    totalInterestAccrued,
    imv,
    dailyInterest,
    expiresAt,
    hasActiveLoan: !isExpired,
    isSelfRepaying: ltv > 1.5,
  };
}

/**
 * Manages the entire loan active position state:
 * - Fetches active loan data from the API
 * - 3 independent forms (repay, roll, addCollateral) with their own schemas
 * - Derived values that recalculate as users type
 */
export function useLoanPosition(vault: VaultInfo | null) {
  const t = useTranslations("borrow");
  const { isConnected, address } = useWallet();
  const [activeTab, setActiveTab] = useState<LoanActionTab>("repay");
  const [isLoadingLoan, setIsLoadingLoan] = useState(false);

  const token = vault?.tokenSymbol ?? "TOKEN";
  const vaultAddress = vault?.address ?? "";

  const {
    borrow: lendingBorrow,
    payback: lendingPayback,
    roll: lendingRoll,
    addCollateral: lendingAddCollateral,
    loanData: onChainLoan,
    refetch: refetchLoan,
    isRepaying: isRepayingTx,
    isRolling: isRollingTx,
    isAddingCollateral: isAddingCollateralTx,
    repaySuccess,
    rollSuccess,
    addCollateralSuccess,
  } = useLending(vaultAddress || undefined, vault?.token0);

  // Fetch active loan from API
  const [activeLoan, setActiveLoan] = useState<ReturnType<
    typeof deriveActiveLoan
  > | null>(null);

  useEffect(() => {
    if (!isConnected || !address || !vaultAddress) {
      setActiveLoan(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoadingLoan(true);
      try {
        const data = await fetchLoansByUser(address!);
        if (!cancelled) {
          const derived = deriveActiveLoan(data.loans, vaultAddress, vault);
          setActiveLoan(derived);
        }
      } catch (err) {
        console.error("[useLoanPosition] fetch error:", err);
      } finally {
        if (!cancelled) setIsLoadingLoan(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isConnected, address, vaultAddress, vault]);

  const loanData = {
    borrowedAmount: activeLoan?.borrowedAmount ?? 0,
    collateralAmount: activeLoan?.collateralAmount ?? 0,
    ltv: activeLoan?.ltv ?? 0,
    daysLeft: activeLoan?.daysLeft ?? 0,
    isExpired: activeLoan?.isExpired ?? false,
    totalInterestAccrued: activeLoan?.totalInterestAccrued ?? 0,
    quoteToken: "WBNB",
    token,
    hasActiveLoan: activeLoan?.hasActiveLoan ?? false,
    isSelfRepaying: activeLoan?.isSelfRepaying ?? false,
    imv: activeLoan?.imv ?? 0,
    dailyInterest: activeLoan?.dailyInterest ?? 0,
  };

  const borrowData = {
    imv: parseFloat(vault?.liquidityRatio ?? "0"),
    dailyInterest: parseFloat(vault?.totalInterest ?? "0"),
    userBalance: 0,
  };

  // Each tab has its own form to avoid field name collisions and allow independent validation
  const repayForm = useForm<RepayFormValues>({
    resolver: zodResolver(repaySchema),
    defaultValues: { repayAmount: "" },
    mode: "onChange",
  });

  const rollForm = useForm<RollFormValues>({
    resolver: zodResolver(rollSchema),
    defaultValues: { rollDuration: "" },
    mode: "onChange",
  });

  const collateralForm = useForm<AddCollateralFormValues>({
    resolver: zodResolver(addCollateralSchema),
    defaultValues: { collateralAmount: "" },
    mode: "onChange",
  });

  // Watched values — trigger recalculations on every keystroke
  const numericRepay = parseFloat(repayForm.watch("repayAmount")) || 0;
  const numericCollateral =
    parseFloat(collateralForm.watch("collateralAmount")) || 0;
  const rollDays = parseInt(rollForm.watch("rollDuration")) / 86400 || 0;

  // Derived calculations
  const collateralReturned = useMemo(
    () =>
      calculateCollateralReturned(
        numericRepay,
        loanData.borrowedAmount,
        loanData.collateralAmount,
      ),
    [numericRepay, loanData.borrowedAmount, loanData.collateralAmount],
  );

  const newLtv = useMemo(
    () =>
      calculateNewLtv(
        loanData.borrowedAmount,
        loanData.collateralAmount,
        numericCollateral,
        loanData.imv,
      ),
    [
      loanData.borrowedAmount,
      loanData.collateralAmount,
      numericCollateral,
      loanData.imv,
    ],
  );

  const rollFee = useMemo(
    () =>
      calculateRollFee(
        loanData.borrowedAmount,
        loanData.dailyInterest,
        rollDays,
      ),
    [loanData.borrowedAmount, loanData.dailyInterest, rollDays],
  );

  const rollNewExpiry = useMemo(() => {
    if (!rollDays) return "--";
    const newDate = new Date(Date.now() + rollDays * 24 * 60 * 60 * 1000);
    return newDate.toLocaleDateString();
  }, [rollDays]);

  // Submit handlers — call real contract methods via useLending
  async function onRepay(data: RepayFormValues) {
    lendingPayback(data.repayAmount);
    repayForm.reset();
  }

  async function onRoll(data: RollFormValues) {
    lendingRoll(parseInt(data.rollDuration));
    rollForm.reset();
  }

  async function onAddCollateral(data: AddCollateralFormValues) {
    lendingAddCollateral(data.collateralAmount);
    collateralForm.reset();
  }

  // Refetch loan data after successful transactions
  useEffect(() => {
    if (repaySuccess || rollSuccess || addCollateralSuccess) {
      refetchLoan();
    }
  }, [repaySuccess, rollSuccess, addCollateralSuccess, refetchLoan]);

  // Position summary
  const infoRows = [
    {
      label: t("positionBorrowed"),
      value: `${formatStakeNumber(loanData.borrowedAmount)} ${loanData.quoteToken}`,
    },
    {
      label: t("positionCollateral"),
      value: `${formatStakeNumber(loanData.collateralAmount)} ${loanData.token}`,
    },
    {
      label: t("positionLtv"),
      value: `${loanData.ltv.toFixed(1)}%`,
      variant: (loanData.ltv > 80 ? "destructive" : "default") as
        | "default"
        | "destructive",
    },
    {
      label: t("positionDaysLeft"),
      value: loanData.isExpired
        ? t("positionExpired")
        : `${loanData.daysLeft}d`,
      variant: (loanData.isExpired ? "destructive" : "default") as
        | "default"
        | "destructive",
    },
    {
      label: t("positionInterest"),
      value: `${formatStakeNumber(loanData.totalInterestAccrued)} ${loanData.quoteToken}`,
    },
  ];

  // Per-tab dynamic config
  const dynamicConfig: Record<
    string,
    {
      form: any;
      onSubmit: (data: any) => Promise<void>;
      showSummary: boolean;
      summaryRows: {
        label: string;
        value: string;
        variant?: "success" | "default";
      }[];
      fieldOverrides: Record<string, any>;
    }
  > = {
    repay: {
      form: repayForm,
      onSubmit: onRepay,
      showSummary: numericRepay > 0,
      summaryRows: [
        {
          label: t("repayCollateralReturned"),
          value: `${formatStakeNumber(collateralReturned)} ${loanData.token}`,
          variant: "success",
        },
      ],
      fieldOverrides: {
        repayAmount: {
          description: (
            <button
              type="button"
              onClick={() =>
                repayForm.setValue(
                  "repayAmount",
                  loanData.borrowedAmount.toString(),
                  { shouldValidate: true },
                )
              }
              className="text-xs text-primary hover:underline"
            >
              {t("repayUseMax", {
                amount: formatStakeNumber(loanData.borrowedAmount),
                token: loanData.quoteToken,
              })}
            </button>
          ),
        },
      },
    },
    roll: {
      form: rollForm,
      onSubmit: onRoll,
      showSummary: rollDays > 0,
      summaryRows: [
        {
          label: t("rollFee"),
          value: `${formatStakeNumber(rollFee)} ${loanData.quoteToken}`,
        },
        {
          label: t("rollNewExpiry"),
          value: rollNewExpiry,
          variant: "success",
        },
      ],
      fieldOverrides: {
        rollDuration: {
          items: ROLL_DURATION_OPTIONS,
        },
      },
    },
    addCollateral: {
      form: collateralForm,
      onSubmit: onAddCollateral,
      showSummary: numericCollateral > 0,
      summaryRows: [
        {
          label: t("addCollateralNewLtv"),
          value: `${newLtv.toFixed(1)}%`,
          variant: newLtv < loanData.ltv ? "success" : "default",
        },
      ],
      fieldOverrides: {
        collateralAmount: {
          description: (
            <button
              type="button"
              onClick={() =>
                collateralForm.setValue(
                  "collateralAmount",
                  borrowData.userBalance.toString(),
                  { shouldValidate: true },
                )
              }
              className="text-xs text-primary hover:underline"
            >
              {t("addCollateralUseMax", {
                amount: formatStakeNumber(borrowData.userBalance),
                token: loanData.token,
              })}
            </button>
          ),
        },
      },
    },
  };

  // i18n key mapping
  const tabI18n: Record<LoanActionTab, { label: string; action: string }> = {
    repay: { label: t("tabRepay"), action: t("repayAction") },
    roll: { label: t("tabRoll"), action: t("rollAction") },
    addCollateral: {
      label: t("tabAddCollateral"),
      action: t("addCollateralAction"),
    },
  };

  // Merge static field definitions from constants with dynamic config per tab
  const tabForms = (Object.keys(LOAN_TAB_FIELDS) as LoanActionTab[]).map(
    (key) => {
      const config = dynamicConfig[key];
      return {
        key,
        label: tabI18n[key].label,
        actionLabel: tabI18n[key].action,
        ...config,
        fields: LOAN_TAB_FIELDS[key].map((field) => ({
          ...field,
          label: t(field.name),
          ariaLabel: t(field.name),
          ...config.fieldOverrides[field.name],
        })),
      };
    },
  );

  return {
    t,
    activeTab,
    setActiveTab,
    isConnected,
    isLoadingLoan,
    loanData,
    infoRows,
    tabForms,
  };
}
