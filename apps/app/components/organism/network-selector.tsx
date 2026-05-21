"use client";

import { useCallback } from "react";
import { useSwitchChain, useAccount } from "wagmi";
import { toast } from "sonner";

// Components
import Dialog from "@/components/atoms/dialog";
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";
import Alert from "@/components/atoms/alert";

// Hooks
import { useTranslations } from "next-intl";

// Constants
import { SUPPORTED_CHAIN_IDS } from "@/types/constants";

const NETWORK_OPTIONS = [{ value: "56", label: "BNB Chain" }];

/**
 * Network selector dropdown + mismatch warning dialog.
 * Detects when the wallet is on a different chain and prompts to switch.
 */
export default function NetworkSelector() {
  const t = useTranslations("common");
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const isCorrectNetwork =
    chainId != null &&
    (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);

  const isMismatch = isConnected && !isCorrectNetwork;

  const handleSwitch = useCallback(
    (targetChainId: number) => {
      switchChain(
        { chainId: targetChainId },
        {
          onSuccess: () => toast.success(`Switched to chain ${targetChainId}`),
          onError: (err) => toast.error(err.message.split("\n")[0]),
        },
      );
    },
    [switchChain],
  );

  if (!isConnected) return null;

  return (
    <>
      {/* Compact selector in header */}
      <Select
        className="w-36"
        value={chainId?.toString() ?? "56"}
        onValueChange={(v) => handleSwitch(parseInt(v))}
        items={NETWORK_OPTIONS}
      />

      {/* Mismatch warning dialog */}
      <Dialog
        open={isMismatch}
        onOpenChange={() => {}}
        title="Wrong Network"
        description={`Your wallet is connected to chain ${chainId}. Please switch to BNB Chain.`}
        content={
          <div className="flex flex-col gap-4">
            <Alert
              title="Network Mismatch"
              description="This app runs on BNB Chain. Switch your wallet to continue."
              variant="destructive"
            />
            <Button onClick={() => handleSwitch(56)} isLoading={isPending}>
              Switch to BNB Chain
            </Button>
          </div>
        }
      />
    </>
  );
}
