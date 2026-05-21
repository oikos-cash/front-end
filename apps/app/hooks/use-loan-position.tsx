"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatUnits } from "viem";
import type { Address } from "viem";
import { useReadContract } from "wagmi";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useLending } from "@/hooks/use-lending";

// Contracts
import { MODEL_HELPER_ABI, MODEL_HELPER_ADDRESS } from "@/lib/oikos-addresses";

// Types
import type {
  LoanActionTab,
  RollFormValues,
  RepayFormValues,
  AddCollateralFormValues,
  VaultInfo,
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
 * Manages the entire loan active position state. Position truth comes from
 * on-chain `getActiveLoan` (via useLending); the indexer API only carries event
 * history, which can miss the original Borrow (predates indexer / lost) or skip
 * rollover-driven expiry updates.
 */
export function useLoanPosition(vault: VaultInfo | null) {
  const t = useTranslations("borrow");
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<LoanActionTab>("repay");

  const token = vault?.tokenSymbol ?? "TOKEN";
  const vaultAddress = vault?.address ?? "";

  const {
    payback: lendingPayback,
    roll: lendingRoll,
    addCollateral: lendingAddCollateral,
    loanData: onChainLoan,
    refetch: refetchLoan,
    repaySuccess,
    rollSuccess,
    addCollateralSuccess,
  } = useLending(vaultAddress || undefined, vault?.token0);

  const dailyInterest = parseFloat(vault?.totalInterest ?? "0") / 1e18;

  // Real IMV from ModelHelper (vault.liquidityRatio is a different metric).
  const { data: imvWei } = useReadContract({
    address: MODEL_HELPER_ADDRESS,
    abi: MODEL_HELPER_ABI,
    functionName: "getIntrinsicMinimumValue",
    args: vault?.address ? [vault.address as Address] : undefined,
    query: { enabled: !!vault?.address },
  });
  const imv = useMemo(() => {
    if (typeof imvWei !== "bigint" || imvWei === BigInt(0)) return 0;
    return Number(formatUnits(imvWei, 18));
  }, [imvWei]);

  const loanData = useMemo(() => {
    const borrowedAmount = onChainLoan
      ? Number(formatUnits(onChainLoan.borrowAmount, 18))
      : 0;
    const collateralAmount = onChainLoan
      ? Number(formatUnits(onChainLoan.collateralAmount, 18))
      : 0;
    const expiresAt = onChainLoan ? Number(onChainLoan.expires) : 0;
    const now = Math.floor(Date.now() / 1000);
    const daysLeft = Math.max(0, Math.floor((expiresAt - now) / 86400));
    const isExpired = expiresAt > 0 && now > expiresAt;
    // LTV here is the collateralization ratio: (collateral * IMV) / borrow.
    // > 1 = overcollateralized, <= 1 = at/below liquidation threshold,
    // > 1.5 = self-repaying (excess collateral covers interest accrual).
    const ltv =
      borrowedAmount > 0 && imv > 0
        ? (collateralAmount * imv) / borrowedAmount
        : 0;
    return {
      borrowedAmount,
      collateralAmount,
      ltv,
      daysLeft,
      isExpired,
      quoteToken: "WBNB",
      token,
      hasActiveLoan: !!onChainLoan?.hasActiveLoan,
      isSelfRepaying: ltv > 1.5,
      imv,
      dailyInterest,
    };
  }, [onChainLoan, imv, dailyInterest, token]);

  const userBalance = 0;

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
      value: loanData.ltv > 0 ? loanData.ltv.toFixed(2) : "--",
      variant: (loanData.hasActiveLoan && loanData.ltv > 0 && loanData.ltv <= 1.1
        ? "destructive"
        : "default") as "default" | "destructive",
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
          value: newLtv > 0 ? newLtv.toFixed(2) : "--",
          variant: newLtv > loanData.ltv ? "success" : "default",
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
                  userBalance.toString(),
                  { shouldValidate: true },
                )
              }
              className="text-xs text-primary hover:underline"
            >
              {t("addCollateralUseMax", {
                amount: formatStakeNumber(userBalance),
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
    loanData,
    infoRows,
    tabForms,
  };
}
