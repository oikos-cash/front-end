"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatUnits, parseUnits, erc20Abi } from "viem";
import type { Address } from "viem";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useLending } from "@/hooks/use-lending";
import { useAllowances } from "@/hooks/use-allowances";

// Contracts
import { MODEL_HELPER_ABI, MODEL_HELPER_ADDRESS } from "@/lib/oikos-addresses";
import { LENDING_VAULT_ABI } from "@/lib/abis";
import { WBNB_ADDRESS } from "@/types/constants";

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
  const { isConnected, address } = useWallet();
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

  // ── Chained approve → action for Repay (WBNB) and Add Collateral (OKS) ──
  //
  // Both LendingVault entry points consume an ERC20 via transferFrom inside
  // the contract, so the user has to approve the vault as spender first.
  // We expose a single approval write here; the pending-action snapshot
  // decides which downstream call fires when the receipt lands.
  const allowancePairs = useMemo(
    () =>
      address && vault?.address
        ? [
            { token: WBNB_ADDRESS, spender: vault.address as Address },
            ...(vault.token0
              ? [{ token: vault.token0 as Address, spender: vault.address as Address }]
              : []),
          ]
        : [],
    [address, vault?.address, vault?.token0],
  );
  const { allowances, refetch: refetchAllowance } = useAllowances(
    address as Address | null | undefined,
    allowancePairs,
  );
  const wbnbAllowance = allowances[0]?.allowance ?? BigInt(0);
  const tokenAllowance = allowances[1]?.allowance ?? BigInt(0);

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // Snapshot of the action the user submitted while allowance was short;
  // gets replayed once the approval receipt confirms.
  const [pendingAction, setPendingAction] = useState<
    | { kind: "repay"; amount: string }
    | { kind: "addCollateral"; amount: string }
    | null
  >(null);

  // Keep refs so the success effect always sees the latest closures without
  // re-running on every payback/addCollateral identity change.
  const lendingPaybackRef = useRef(lendingPayback);
  lendingPaybackRef.current = lendingPayback;
  const lendingAddCollateralRef = useRef(lendingAddCollateral);
  lendingAddCollateralRef.current = lendingAddCollateral;
  const refetchAllowanceRef = useRef(refetchAllowance);
  refetchAllowanceRef.current = refetchAllowance;

  useEffect(() => {
    if (!approveSuccess) return;
    refetchAllowanceRef.current();
    if (pendingAction) {
      if (pendingAction.kind === "repay") {
        lendingPaybackRef.current(pendingAction.amount);
      } else {
        lendingAddCollateralRef.current(pendingAction.amount);
      }
      setPendingAction(null);
    }
  }, [approveSuccess, pendingAction]);

  // Drop the queued action if the approval write itself fails.
  useEffect(() => {
    if (approveError && pendingAction) setPendingAction(null);
  }, [approveError, pendingAction]);

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

  // WBNB amount the user gets back from a Roll. The legacy frontend formula
  // is (collateral × IMV − borrow) / 4 — the excess collateral value beyond
  // the current loan, divided by 4 (protocol-prescribed haircut).
  const rollLoanAmount = useMemo(() => {
    const extra =
      loanData.collateralAmount * loanData.imv - loanData.borrowedAmount;
    return extra > 0 ? extra / 4 : 0;
  }, [loanData.collateralAmount, loanData.imv, loanData.borrowedAmount]);

  // Roll fee from the LendingVault.calculateLoanFees view applied to the
  // computed rollLoanAmount + the chosen new duration. This is the on-chain
  // truth — the old `borrowedAmount × dailyInterest × days` heuristic was
  // wrong because `vault.totalInterest` is a cumulative counter, not a rate.
  const rollDurationSeconds = rollDays > 0 ? Math.round(rollDays * 86400) : 0;
  const { data: rollFeeWei } = useReadContract({
    address: vault?.address as Address | undefined,
    abi: LENDING_VAULT_ABI,
    functionName: "calculateLoanFees",
    args:
      rollLoanAmount > 0 && rollDurationSeconds > 0
        ? [
            parseUnits(rollLoanAmount.toFixed(18), 18),
            BigInt(rollDurationSeconds),
          ]
        : undefined,
    query: {
      enabled:
        !!vault?.address &&
        rollLoanAmount > 0 &&
        rollDurationSeconds > 0,
    },
  });
  const rollFee = useMemo(() => {
    if (typeof rollFeeWei !== "bigint" || rollFeeWei === BigInt(0)) return 0;
    return Number(formatUnits(rollFeeWei, 18));
  }, [rollFeeWei]);

  const rollNewExpiry = useMemo(() => {
    if (!rollDays) return "--";
    const newDate = new Date(Date.now() + rollDays * 24 * 60 * 60 * 1000);
    return newDate.toLocaleDateString();
  }, [rollDays]);

  // Submit handlers — chain approve → action when allowance is insufficient.
  // The vault pulls WBNB (repay) and token0 (addCollateral) via
  // transferFrom, so the user has to approve the vault as spender first.
  async function onRepay(data: RepayFormValues) {
    if (!vault?.address) return;
    let amountWei: bigint;
    try {
      amountWei = parseUnits(data.repayAmount, 18);
    } catch {
      return;
    }
    if (amountWei === BigInt(0)) return;
    // Reset prior approve terminal state so the new attempt starts clean.
    if (approveError || approveSuccess) resetApprove();
    if (wbnbAllowance < amountWei) {
      setPendingAction({ kind: "repay", amount: data.repayAmount });
      writeApprove({
        address: WBNB_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [vault.address as Address, amountWei],
      });
    } else {
      lendingPayback(data.repayAmount);
    }
    repayForm.reset();
  }

  async function onRoll(data: RollFormValues) {
    lendingRoll(parseInt(data.rollDuration));
    rollForm.reset();
  }

  async function onAddCollateral(data: AddCollateralFormValues) {
    if (!vault?.address || !vault?.token0) return;
    let amountWei: bigint;
    try {
      amountWei = parseUnits(data.collateralAmount, 18);
    } catch {
      return;
    }
    if (amountWei === BigInt(0)) return;
    if (approveError || approveSuccess) resetApprove();
    if (tokenAllowance < amountWei) {
      setPendingAction({
        kind: "addCollateral",
        amount: data.collateralAmount,
      });
      writeApprove({
        address: vault.token0 as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [vault.address as Address, amountWei],
      });
    } else {
      lendingAddCollateral(data.collateralAmount);
    }
    collateralForm.reset();
  }

  // Refetch loan data + allowance after successful transactions.
  useEffect(() => {
    if (repaySuccess || rollSuccess || addCollateralSuccess) {
      refetchLoan();
      refetchAllowanceRef.current();
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
          label: t("rollAmount"),
          value: `${formatStakeNumber(rollLoanAmount)} ${loanData.quoteToken}`,
          variant: "success",
        },
        {
          label: t("rollFee"),
          value: `${formatStakeNumber(rollFee)} ${loanData.quoteToken}`,
        },
        {
          label: t("rollNewExpiry"),
          value: rollNewExpiry,
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
