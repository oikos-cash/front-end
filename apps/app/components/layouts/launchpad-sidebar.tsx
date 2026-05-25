"use client";

import { useEffect, useRef, useState } from "react";
import { parseEther, zeroAddress, type Address } from "viem";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";

// Components
import Link from "next/link";
import Button from "@/components/atoms/button";
import LaunchpadPreviewCard from "@/components/molecules/launchpad/preview-card";

// Hooks
import { useTranslations } from "next-intl";
import { useLaunchpadStore } from "@/stores/launchpad";
import { useWallet } from "@/stores/wallet";
import { usePathname, useRouter } from "next/navigation";

// Constants
import {
  LAUNCHPAD_STEPS,
  LAUNCHPAD_STEP_LABELS,
  WBNB_ADDRESS,
} from "@/types/constants";
import { FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/oikos-addresses";

// Icons
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Cost the Factory charges to deploy a new vault, denominated in native BNB.
 * Mirrors the legacy frontend (`value: parseEther(1)`).
 */
const DEPLOYMENT_FEE_BNB = parseEther("1");

/** Uniswap V3 = 0.30% (3000) / PancakeSwap V3 = 0.25% (2500). */
function feeTierFor(protocol: string): number {
  return protocol === "uniswap" ? 3000 : 2500;
}

export default function LaunchpadSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("launchpad");
  const pathname = usePathname();
  const router = useRouter();
  const { address } = useWallet();
  const store = useLaunchpadStore();
  const {
    reset,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    floorPrice,
    totalSupply,
    enablePresale,
    presaleDuration,
    softCapPercent,
    protocol,
    completedSteps,
    isReadyToDeploy,
    markStepCompleted,
  } = store;

  const currentIndex = LAUNCHPAD_STEPS.findIndex((step) =>
    pathname.endsWith(step.path),
  );
  const prevStep = currentIndex > 0 ? LAUNCHPAD_STEPS[currentIndex - 1] : null;
  const nextStep =
    currentIndex < LAUNCHPAD_STEPS.length - 1
      ? LAUNCHPAD_STEPS[currentIndex + 1]
      : null;

  // ── Deploy ───────────────────────────────────────────────────────────
  // Wraps Factory.deployVault. The contract returns
  // (vaultAddress, poolAddress, token0) but the receipt doesn't surface
  // them directly via wagmi, so once the tx confirms we read
  // Factory.getVaults(deployer) and take the last entry as the new vault.
  const {
    writeContract,
    data: deployTxHash,
    isPending: isWalletSigning,
    error: writeError,
    reset: resetDeployWrite,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isDeployConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: deployTxHash });
  const deployError = writeError ?? receiptError ?? null;
  const isDeploying = isWalletSigning || isConfirming;

  function safeBigInt(value: string | number | undefined, fallback = 0n): bigint {
    if (value == null || value === "") return fallback;
    try {
      return BigInt(value);
    } catch {
      return fallback;
    }
  }

  function safeParseEther(value: string | number | undefined): bigint {
    if (value == null || value === "") return 0n;
    try {
      return parseEther(String(value));
    } catch {
      return 0n;
    }
  }

  function handleDeploy() {
    if (!isReadyToDeploy()) return;
    // Clear any prior terminal state so the new attempt starts clean.
    if (writeError || receiptError) resetDeployWrite();

    const useUniswap = protocol === "uniswap";
    const presaleSeconds = enablePresale ? safeBigInt(presaleDuration) : 0n;
    const supplyWei = safeParseEther(totalSupply);
    const priceWei = safeParseEther(floorPrice);

    writeContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "deployVault",
      args: [
        {
          softCap: safeParseEther(softCapPercent),
          deadline: presaleSeconds,
        },
        {
          name: tokenName,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
          initialSupply: supplyWei,
          maxTotalSupply: supplyWei,
          IDOPrice: priceWei,
          floorPrice: priceWei,
          token1: WBNB_ADDRESS as Address,
          feeTier: feeTierFor(protocol),
          // tokenConfig.presale is a uint8 flag (0 = no presale, 1 = enabled),
          // NOT a duration. The duration lives in presaleConfig.deadline.
          presale: enablePresale ? 1 : 0,
          isFreshDeploy: true,
          useUniswap,
        },
        {
          token0: zeroAddress,
          pool: zeroAddress,
          vaultAddress: zeroAddress,
        },
      ],
      // value: DEPLOYMENT_FEE_BNB intentionally omitted while we test
      // without paying the deployment fee.
      gas: 30_000_000n,
    });
  }

  // After the deploy receipt lands, read getVaults(deployer) to discover
  // the address of the vault we just deployed.
  const { data: deployedVaults, refetch: refetchVaults } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getVaults",
    args: address ? [address as Address] : undefined,
    query: { enabled: !!address && isDeployConfirmed },
  });

  // Drive UI feedback off the lifecycle so the toast / navigation only fire
  // once per attempt.
  const stageRef = useRef<"idle" | "submitted" | "done" | "error">("idle");
  useEffect(() => {
    if (isWalletSigning && stageRef.current === "idle") {
      stageRef.current = "submitted";
      toast.info(t("toastDeploySubmitted"));
    }
  }, [isWalletSigning, t]);

  useEffect(() => {
    if (deployError && stageRef.current !== "error") {
      stageRef.current = "error";
      const msg =
        deployError instanceof Error
          ? deployError.message.split("\n")[0]
          : String(deployError);
      toast.error(msg);
    }
  }, [deployError]);

  useEffect(() => {
    if (
      !isDeployConfirmed ||
      stageRef.current === "done" ||
      !deployedVaults
    )
      return;
    const list = deployedVaults as readonly string[];
    if (list.length === 0) {
      // Receipt confirmed but the deployer's vault list is empty — refetch
      // once to give the indexer a moment, then bail if still empty.
      refetchVaults();
      return;
    }
    stageRef.current = "done";
    const symbol = tokenSymbol.toLowerCase();
    const hasPresale = enablePresale;
    toast.success(t("toastDeploySuccess"));
    markStepCompleted(3);
    reset();
    resetDeployWrite();
    stageRef.current = "idle";
    router.push(hasPresale ? `/presale/${symbol}` : `/liquidity/${symbol}`);
  }, [
    isDeployConfirmed,
    deployedVaults,
    refetchVaults,
    tokenSymbol,
    enablePresale,
    markStepCompleted,
    reset,
    resetDeployWrite,
    t,
    router,
  ]);

  // Reset the per-attempt stage flag when the user navigates away or the
  // store gets cleared.
  const [hasUserAttempted, setHasUserAttempted] = useState(false);
  function onDeployClick() {
    setHasUserAttempted(true);
    handleDeploy();
  }
  useEffect(() => {
    if (!hasUserAttempted) stageRef.current = "idle";
  }, [hasUserAttempted]);

  // Zustand's persist middleware rehydrates only on the client, so
  // isReadyToDeploy() returns a different value on SSR than on hydration.
  // Defer any UI that reads store-derived state until after mount so
  // server / client DOM agrees.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const canDeploy = mounted && isReadyToDeploy();

  return (
    // Wizard nav is rendered as underline tabs above the form. The form
    // column splits off the preview panel at 2xl+; below that they stack.
    <div className="flex flex-col gap-4 py-4">
      <nav
        aria-label="Launchpad steps"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
      >
        {LAUNCHPAD_STEPS.map((step, index) => {
          const isActive = pathname.endsWith(step.path);
          const isCompleted = completedSteps.includes(index);
          const isPresaleStep = index === 2;
          return (
            <Link
              key={step.path}
              href={step.path}
              className={`group relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t(LAUNCHPAD_STEP_LABELS[index])}</span>
              {isCompleted && (
                <span className="size-1.5 rounded-full bg-primary" />
              )}
              {isPresaleStep && !enablePresale && (
                <span className="text-xs text-muted-foreground">
                  {t("skipped")}
                </span>
              )}
              {/* Active-tab underline drawn over the strip's bottom border. */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-colors ${
                  isActive ? "bg-primary" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </nav>

      {/* Main column splits into form (children) + sticky Preview panel at
        * 2xl+. Below that breakpoint the preview stacks under the form so
        * the cramped 3-sidebar global layout (left prices, nav, right
        * wallet) still has room. */}
      <div className="flex min-w-0 flex-col gap-4 2xl:flex-row 2xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {children}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button
              size="xs"
              variant="ghost"
              disabled={!prevStep}
              onClick={() => prevStep && router.push(prevStep.path)}
            >
              <ChevronLeft className="size-4" />
              {t("back")}
            </Button>
            {nextStep ? (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => router.push(nextStep.path)}
              >
                {t("next")}
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                disabled={!canDeploy || isDeploying}
                isLoading={isDeploying}
                onClick={onDeployClick}
              >
                {t("deployButton")}
              </Button>
            )}
          </div>
        </div>
        <LaunchpadPreviewCard className="2xl:sticky 2xl:top-18 2xl:w-72 2xl:self-start" />
      </div>
    </div>
  );
}
