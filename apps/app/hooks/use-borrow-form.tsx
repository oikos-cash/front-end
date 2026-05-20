"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseUnits, type Address, erc20Abi } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useLending } from "@/hooks/use-lending";
import { useAllowances } from "@/hooks/use-allowances";

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
  const { isConnected, address, tokenBalances } = useWallet();

  const token = vault?.tokenSymbol ?? "TOKEN";
  const imv = parseFloat(vault?.liquidityRatio ?? "0");
  const dailyInterest = parseFloat(vault?.totalInterest ?? "0") / 1e18;
  const liquidityRatio = parseFloat(vault?.liquidityRatio ?? "0");
  const isActive = liquidityRatio > 0;

  const {
    borrow: lendingBorrow,
    isBorrowing,
    loanData: onChainLoan,
  } = useLending(vault?.address, vault?.token0);

  const hasActiveLoan = !!onChainLoan?.hasActiveLoan;

  // Max borrowable WBNB = user's collateral-token balance × IMV.
  const collateralBalance = vault?.token0
    ? parseFloat(tokenBalances[vault.token0.toLowerCase()] ?? "0")
    : 0;
  const maxBorrowableWbnb = collateralBalance * imv;

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

  // ---------- Collateral approval (token0 → vault) ----------
  // LendingVault.borrowFromFloor calls token0.transferFrom(user, vault, collateralAmount)
  // so the user must approve the vault to spend collateral before borrow.
  // Approve a 0.5% buffer over our client-side collateral estimate to cover
  // any rounding diff against the contract's _getTotalCollateral.
  const collateralAmountWei = useMemo<bigint>(() => {
    if (collateralRequired <= 0) return BigInt(0);
    const padded = collateralRequired * 1.005;
    return parseUnits(padded.toFixed(18), 18);
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

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } =
    useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  // Refresh allowance once an approval transaction lands.
  useEffect(() => {
    if (approveSuccess) refetchAllowance();
  }, [approveSuccess, refetchAllowance]);

  function approveCollateral() {
    if (!vault?.token0 || !vault?.address) return;
    if (collateralAmountWei === BigInt(0)) return;
    writeApprove({
      address: vault.token0 as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [vault.address as Address, collateralAmountWei],
    });
  }

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

  const isApproving = isApprovePending || isApproveConfirming;

  return {
    t,
    form,
    token,
    fields,
    loanFees,
    onSubmit,
    isConnected,
    hasActiveLoan,
    numericAmount,
    collateralRequired,
    needsApproval,
    approveCollateral,
    isApproving,
  };
}
