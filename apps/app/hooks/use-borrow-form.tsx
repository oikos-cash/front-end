"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatUnits, parseUnits, type Address, erc20Abi } from "viem";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useLending } from "@/hooks/use-lending";
import { useAllowances } from "@/hooks/use-allowances";

// Types
import { borrowSchema } from "@/types/schemes";
import type { BorrowFormValues, FieldItem, VaultInfo } from "@/types/interfaces";

// Utils
import { formatStakeNumber } from "@/utils/number";

// Constants
import { BORROW_FIELDS, BORROW_DURATION_OPTIONS } from "@/types/constants";
import { MODEL_HELPER_ABI, MODEL_HELPER_ADDRESS } from "@/lib/oikos-addresses";
import { LENDING_VAULT_ABI } from "@/lib/abis";

// Components — needed for JSX descriptions in field config
import Avatar from "@/components/atoms/avatar";

import type { TxFlowState, TxFlowStep } from "@/hooks/types/tx-flow";

/**
 * Manages the borrow form state:
 * - On-chain IMV read from ModelHelper for correct collateral sizing
 * - Chained approve + borrow flow with step-by-step status surface
 * - Toasts on terminal events
 */
export function useBorrowForm(vault: VaultInfo | null) {
  const t = useTranslations("borrow");
  const { isConnected, address, tokenBalances } = useWallet();

  const token = vault?.tokenSymbol ?? "TOKEN";
  const dailyInterest = parseFloat(vault?.totalInterest ?? "0") / 1e18;
  const liquidityRatio = parseFloat(vault?.liquidityRatio ?? "0");
  const isActive = liquidityRatio > 0;

  // Read the real IMV from ModelHelper — this is the contract's source of
  // truth for collateral = borrowAmount / IMV. vault.liquidityRatio is a
  // different metric and using it here produces an ~10000x-off approval.
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

  const {
    borrow: lendingBorrow,
    isBorrowing,
    isBorrowSubmitting,
    borrowTxHash,
    borrowSuccess,
    borrowError,
    borrowReverted,
    resetBorrow,
    loanData: onChainLoan,
    hasExistingLoan,
    refetchHasExistingLoan,
    migrateLoan,
    isMigrating,
    isMigrateSubmitting,
    migrateSuccess,
    migrateError,
    resetMigrate,
  } = useLending(vault?.address, vault?.token0);

  const hasActiveLoan = !!onChainLoan?.hasActiveLoan;

  // Max borrowable WBNB = user's collateral-token balance × IMV.
  const collateralBalance = vault?.token0
    ? parseFloat(tokenBalances[vault.token0.toLowerCase()] ?? "0")
    : 0;
  const maxBorrowableWbnb = imv > 0 ? collateralBalance * imv : 0;

  const borrowData = {
    tokenPair: `${token}/WBNB`,
    imv,
    dailyInterest,
    userBalance: maxBorrowableWbnb,
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

  // Derived collateral = borrowAmount / IMV (matches LendingVault._getTotalCollateral).
  const collateralRequired = useMemo(() => {
    if (numericAmount <= 0 || imv <= 0) return 0;
    return numericAmount / imv;
  }, [numericAmount, imv]);

  // vault.totalInterest is a cumulative-interest counter, not a daily rate,
  // so the client-side `amount × rate × days` math produced wildly wrong
  // numbers. Let the LendingVault tell us instead — it has a view function
  // calculateLoanFees(amount, durationSeconds) that's the on-chain source
  // of truth.
  const numericDurationSeconds = numericDuration * 86400;
  const { data: loanFeesWei } = useReadContract({
    address: vault?.address as Address | undefined,
    abi: LENDING_VAULT_ABI,
    functionName: "calculateLoanFees",
    args:
      numericAmount > 0 && numericDurationSeconds > 0
        ? [parseUnits(numericAmount.toString(), 18), BigInt(numericDurationSeconds)]
        : undefined,
    query: {
      enabled: !!vault?.address && numericAmount > 0 && numericDurationSeconds > 0,
    },
  });
  const loanFees = useMemo(() => {
    if (typeof loanFeesWei !== "bigint" || loanFeesWei === BigInt(0)) return 0;
    return Number(formatUnits(loanFeesWei, 18));
  }, [loanFeesWei]);

  // ---------- Allowance & approval (token0 → vault) ----------
  // Approve a 0.5% buffer over the client-side collateral estimate to cover
  // any rounding diff against the contract's _getTotalCollateral.
  const collateralAmountWei = useMemo<bigint>(() => {
    if (collateralRequired <= 0) return BigInt(0);
    const padded = collateralRequired * 1.005;
    try {
      return parseUnits(padded.toFixed(18), 18);
    } catch {
      return BigInt(0);
    }
  }, [collateralRequired]);

  const allowancePairs = useMemo(
    () =>
      address && vault?.token0 && vault?.address
        ? [
            {
              token: vault.token0 as Address,
              spender: vault.address as Address,
            },
          ]
        : [],
    [address, vault?.token0, vault?.address],
  );
  const { allowances, refetch: refetchAllowance } = useAllowances(
    address as Address | null | undefined,
    allowancePairs,
  );
  const collateralAllowance = allowances[0]?.allowance ?? BigInt(0);

  const needsApproval = useMemo(() => {
    if (!vault?.token0 || !vault?.address) return false;
    if (collateralAmountWei === BigInt(0)) return false;
    return collateralAllowance < collateralAmountWei;
  }, [vault?.token0, vault?.address, collateralAllowance, collateralAmountWei]);

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApproveSubmitting,
    error: approveWriteError,
    reset: resetApprove,
  } = useWriteContract();
  const {
    isLoading: isApproveConfirming,
    isSuccess: approveSuccess,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const approveError = approveWriteError ?? approveReceiptError ?? null;

  // Pending-after-approval state. When the user submits while allowance is
  // insufficient, we snapshot the borrow params and fire approve; once the
  // approval tx confirms we auto-fire borrow with the snapshot.
  const [pendingBorrow, setPendingBorrow] = useState<{
    amount: string;
    durationSeconds: number;
  } | null>(null);
  const lendingBorrowRef = useRef(lendingBorrow);
  lendingBorrowRef.current = lendingBorrow;
  const refetchAllowanceRef = useRef(refetchAllowance);
  refetchAllowanceRef.current = refetchAllowance;

  // When the approval lands, refresh allowance and chain into borrow.
  useEffect(() => {
    if (!approveSuccess) return;
    refetchAllowanceRef.current();
    if (pendingBorrow) {
      lendingBorrowRef.current(
        pendingBorrow.amount,
        pendingBorrow.durationSeconds,
      );
      setPendingBorrow(null);
    }
  }, [approveSuccess, pendingBorrow]);

  // If the approve write itself fails, drop the pending borrow.
  useEffect(() => {
    if (approveError && pendingBorrow) {
      setPendingBorrow(null);
    }
  }, [approveError, pendingBorrow]);

  // ---------- Step-state machine for UI ----------
  const step: TxFlowStep = useMemo(() => {
    if (borrowError || borrowReverted) return "error";
    if (approveError) return "error";
    if (borrowSuccess) return "success";
    if (isBorrowing) return "action-pending";
    if (isBorrowSubmitting) return "action-wallet";
    if (isApproveConfirming) return "approve-pending";
    if (isApproveSubmitting) return "approve-wallet";
    if (pendingBorrow && approveSuccess) return "approve-confirmed";
    return "idle";
  }, [
    approveError,
    approveSuccess,
    borrowError,
    borrowReverted,
    borrowSuccess,
    isApproveConfirming,
    isApproveSubmitting,
    isBorrowSubmitting,
    isBorrowing,
    pendingBorrow,
  ]);

  function formatError(err: unknown): string {
    if (!err) return "";
    const msg = err instanceof Error ? err.message : String(err);
    const m = msg.match(/reason="([^"]+)"|reverted with(?: reason)?:?\s*([^\n]+)/i);
    if (m) return (m[1] || m[2] || "").trim();
    return msg.split("\n")[0].slice(0, 200);
  }

  const errorMessage = useMemo(() => {
    if (borrowError) return formatError(borrowError);
    if (borrowReverted) return t("borrowReverted");
    if (approveError) return formatError(approveError);
    return "";
  }, [approveError, borrowError, borrowReverted, t]);

  const flowState: TxFlowState = useMemo(
    () => ({
      step,
      approveTxHash,
      actionTxHash: borrowTxHash,
      errorMessage: errorMessage || undefined,
    }),
    [step, approveTxHash, borrowTxHash, errorMessage],
  );

  // ---------- Side effects: toasts ----------
  const toastedStepRef = useRef<TxFlowStep | null>(null);
  useEffect(() => {
    if (toastedStepRef.current === step) return;
    toastedStepRef.current = step;
    if (step === "success" && borrowTxHash) {
      toast.success(t("toastBorrowSuccess"), {
        action: {
          label: t("viewTx"),
          onClick: () => window.open(`https://bscscan.com/tx/${borrowTxHash}`, "_blank"),
        },
      });
      form.reset();
    } else if (step === "error" && errorMessage) {
      toast.error(errorMessage);
    }
  }, [step, borrowTxHash, errorMessage, t, form]);

  // Reset borrow tx state after success/error so the form is re-armable.
  function reset() {
    resetApprove();
    resetBorrow();
    setPendingBorrow(null);
  }

  // After a successful loan migration, refresh hasExistingLoan so the
  // migrate prompt yields back to the regular borrow form, and surface a
  // toast / failure notice for visibility.
  const toastedMigrateRef = useRef<"success" | "error" | null>(null);
  useEffect(() => {
    if (migrateSuccess && toastedMigrateRef.current !== "success") {
      toastedMigrateRef.current = "success";
      refetchHasExistingLoan();
      toast.success("Loan migrated successfully");
    } else if (migrateError && toastedMigrateRef.current !== "error") {
      toastedMigrateRef.current = "error";
      toast.error(formatError(migrateError));
    }
  }, [migrateSuccess, migrateError, refetchHasExistingLoan]);

  function handleMigrate(oldVault?: Address) {
    if (migrateError || migrateSuccess) {
      resetMigrate();
      toastedMigrateRef.current = null;
    }
    migrateLoan(oldVault);
  }

  function handleUseMax() {
    form.setValue("borrowAmount", borrowData.userBalance.toString(), {
      shouldValidate: true,
    });
  }

  // Submit — approve (if needed) then borrow.
  async function onSubmit(data: BorrowFormValues) {
    const durationSeconds = parseInt(data.duration) * 86400;
    // Reset prior terminal state so the new attempt starts clean.
    if (step === "success" || step === "error") reset();

    if (needsApproval) {
      if (!vault?.token0 || !vault?.address) return;
      if (collateralAmountWei === BigInt(0)) return;
      setPendingBorrow({ amount: data.borrowAmount, durationSeconds });
      writeApprove({
        address: vault.token0 as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [vault.address as Address, collateralAmountWei],
      });
      return;
    }

    lendingBorrow(data.borrowAmount, durationSeconds);
  }

  // Field config with JSX elements
  const fields: FieldItem[] = BORROW_FIELDS.map((field) => ({
    ...field,
    label: t(field.name),
    ariaLabel: t(field.name),
    ...(field.name === "borrowAmount" && {
      endContent: <Avatar name="WBNB" size="default" />,
      description: (
        <button
          type="button"
          onClick={handleUseMax}
          className="text-xs text-primary hover:underline"
        >
          {t("useMax", {
            amount: formatStakeNumber(borrowData.userBalance),
            token: "WBNB",
          })}
        </button>
      ),
    }),
    ...(field.name === "duration" && {
      items: BORROW_DURATION_OPTIONS,
      defaultValue: "30",
    }),
  })) as FieldItem[];

  const isPending = step !== "idle" && step !== "success" && step !== "error";

  return {
    t,
    form,
    token,
    fields,
    loanFees,
    onSubmit,
    reset,
    isConnected,
    hasActiveLoan,
    numericAmount,
    collateralRequired,
    needsApproval,
    isPending,
    flowState,
    // Legacy-loan migration
    hasExistingLoan,
    migrate: handleMigrate,
    isMigrating: isMigrating || isMigrateSubmitting,
  };
}
