"use client";

import { useMemo } from "react";
import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import type { Address } from "viem";

import { useWallet } from "@/stores/wallet";
import { EXT_VAULT_ABI, LENDING_VAULT_ABI, ERC20_ABI } from "@/lib/abis";
import { OLD_LENDING_VAULTS } from "@/types/constants";

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

  // ── Legacy-loan migration ────────────────────────────────────────────
  // The new vault exposes hasExistingLoan() (reads from msg.sender) and
  // migrateLoan(oldVault) to pull a user's position out of the previous
  // lending system. We read against the user's account so wagmi sets the
  // eth_call from address correctly.
  const {
    data: hasExistingLoan,
    refetch: refetchHasExistingLoan,
  } = useReadContract({
    address: vault,
    abi: LENDING_VAULT_ABI,
    functionName: "hasExistingLoan",
    account: user,
    query: { enabled: !!vault && !!user },
  });

  // Auto-pick the source vault for migrateLoan(oldVault). The new vault's
  // migrateLoan silently no-ops when called with the wrong old address, so
  // we can't trust a revert to tell us we picked wrong — we have to probe.
  // getActiveLoan returns (borrowAmount, collateral, fees, expires,
  // lastUpdate) on each old vault; whichever has borrowAmount > 0 is the
  // one to migrate from.
  const oldVaultProbe = useReadContracts({
    contracts: user
      ? OLD_LENDING_VAULTS.map((addr) => ({
          address: addr as Address,
          abi: LENDING_VAULT_ABI,
          functionName: "getActiveLoan" as const,
          args: [user] as const,
        }))
      : [],
    query: { enabled: !!user && hasExistingLoan === true },
  });
  const migrationSourceVault = useMemo<Address | undefined>(() => {
    const results = oldVaultProbe.data;
    if (!results) return undefined;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "success") continue;
      const tuple = r.result as readonly [bigint, bigint, bigint, bigint, bigint];
      if (tuple[0] > BigInt(0)) return OLD_LENDING_VAULTS[i] as Address;
    }
    return undefined;
  }, [oldVaultProbe.data]);

  const {
    writeContract: migrateWrite,
    data: migrateTxHash,
    isPending: isMigrateSubmitting,
    error: migrateWriteError,
    reset: resetMigrate,
  } = useWriteContract();
  const {
    isLoading: isMigrating,
    isSuccess: migrateSuccess,
    error: migrateReceiptError,
  } = useWaitForTransactionReceipt({ hash: migrateTxHash });
  const migrateError = migrateWriteError ?? migrateReceiptError ?? null;

  function migrateLoan(
    oldVault: Address | undefined = migrationSourceVault,
  ) {
    if (!vault || !oldVault) return;
    migrateWrite({
      address: vault,
      abi: LENDING_VAULT_ABI,
      functionName: "migrateLoan",
      args: [oldVault],
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
    // Legacy-loan migration
    hasExistingLoan: hasExistingLoan === true,
    refetchHasExistingLoan,
    migrationSourceVault,
    /** True once the auto-probe has finished AND no old vault holds a
     *  non-zero borrow, even though hasExistingLoan was true — caller can
     *  show a "couldn't find the position" notice instead of firing a
     *  silent no-op migrateLoan. */
    migrationSourceMissing:
      hasExistingLoan === true &&
      oldVaultProbe.isFetched &&
      !migrationSourceVault,
    migrateLoan,
    isMigrating,
    isMigrateSubmitting,
    migrateSuccess,
    migrateTxHash,
    migrateError,
    resetMigrate,
  };
}
