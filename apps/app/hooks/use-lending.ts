"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import type { Address } from "viem";

import { useWallet } from "@/stores/wallet";
import { EXT_VAULT_ABI, LENDING_VAULT_ABI, ERC20_ABI } from "@/lib/abis";

/**
 * Hook for interacting with the ExtVault lending contract.
 * Reads: getActiveLoan from LendingVault.
 * Writes: borrow, payback, roll, addCollateral via ExtVault.
 *
 * @param vaultAddress - The vault address (acts as both ExtVault and LendingVault)
 * @param tokenAddress - Token0 address (collateral token)
 */
export function useLending(vaultAddress?: string, tokenAddress?: string) {
  const { address } = useWallet();
  const vault = vaultAddress as Address | undefined;
  const token = tokenAddress as Address | undefined;
  const user = address as Address | undefined;

  // Read active loan
  const { data: activeLoan, refetch: refetchLoan } = useReadContract({
    address: vault,
    abi: LENDING_VAULT_ABI,
    functionName: "getActiveLoan",
    args: user ? [user] : undefined,
    query: { enabled: !!vault && !!user },
  });

  const loanData = activeLoan
    ? {
        borrowAmount: activeLoan[0],
        collateralAmount: activeLoan[1],
        fees: activeLoan[2],
        expires: activeLoan[3],
        lastUpdate: activeLoan[4],
        hasActiveLoan: activeLoan[0] > BigInt(0),
      }
    : null;

  // Write: borrow
  const {
    writeContract: borrowWrite,
    data: borrowTxHash,
    isPending: isBorrowSubmitting,
    error: borrowWriteError,
    reset: resetBorrow,
  } = useWriteContract();
  const {
    isLoading: isBorrowing,
    isSuccess: borrowSuccess,
    error: borrowReceiptError,
    data: borrowReceipt,
  } = useWaitForTransactionReceipt({ hash: borrowTxHash });

  const borrowError = borrowWriteError ?? borrowReceiptError ?? null;
  const borrowReverted =
    !!borrowReceipt && borrowReceipt.status === "reverted";

  function borrow(amount: string, durationSeconds: number) {
    if (!vault) return;
    borrowWrite({
      address: vault,
      abi: EXT_VAULT_ABI,
      functionName: "borrow",
      args: [parseEther(amount), BigInt(durationSeconds)],
    });
  }

  // Write: payback
  const { writeContract: paybackWrite, data: paybackTxHash } = useWriteContract();
  const { isLoading: isRepaying, isSuccess: repaySuccess } = useWaitForTransactionReceipt({
    hash: paybackTxHash,
  });

  function payback(amount: string) {
    if (!vault) return;
    paybackWrite({
      address: vault,
      abi: EXT_VAULT_ABI,
      functionName: "payback",
      args: [parseEther(amount)],
    });
  }

  // Write: roll
  const { writeContract: rollWrite, data: rollTxHash } = useWriteContract();
  const { isLoading: isRolling, isSuccess: rollSuccess } = useWaitForTransactionReceipt({
    hash: rollTxHash,
  });

  function roll(newDurationSeconds: number) {
    if (!vault) return;
    rollWrite({
      address: vault,
      abi: EXT_VAULT_ABI,
      functionName: "roll",
      args: [BigInt(newDurationSeconds)],
    });
  }

  // Write: addCollateral
  const { writeContract: addCollateralWrite, data: addCollateralTxHash } = useWriteContract();
  const { isLoading: isAddingCollateral, isSuccess: addCollateralSuccess } = useWaitForTransactionReceipt({
    hash: addCollateralTxHash,
  });

  function addCollateral(amount: string) {
    if (!vault) return;
    addCollateralWrite({
      address: vault,
      abi: EXT_VAULT_ABI,
      functionName: "addCollateral",
      args: [parseEther(amount)],
    });
  }

  return {
    // State
    loanData,
    // Actions
    borrow,
    payback,
    roll,
    addCollateral,
    refetch: refetchLoan,
    resetBorrow,
    // Loading
    isBorrowing,
    isRepaying,
    isRolling,
    isAddingCollateral,
    isBorrowSubmitting,
    borrowSuccess,
    repaySuccess,
    rollSuccess,
    addCollateralSuccess,
    // Tx surfaces
    borrowTxHash,
    borrowError,
    borrowReverted,
  };
}
