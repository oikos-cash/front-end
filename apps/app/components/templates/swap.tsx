"use client";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import SwapForm from "@/components/organism/form/swap";
import SwapHistory from "@/components/organism/swap-history";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Types
import type { SwapToken } from "@/types/interfaces";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function SwapTemplate({
  initialTokens,
}: {
  initialTokens: SwapToken[];
}) {
  const t = useTranslations("swap");
  const { isConnected, handleConnect } = useWallet();

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Empty
          title={t("connectTitle")}
          description={t("connectDescription")}
          icon={<Lock className="size-6 text-muted-foreground" />}
        >
          <Button variant="default" size="sm" onClick={handleConnect}>
            <Wallet className="size-3.5" />
            {t("connectButton")}
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-4">
      <header className="flex flex-col gap-3 px-1">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.65)]"
          />
          <span className="eyebrow-strong">Exchange</span>
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
            {t("title")}
          </h1>
          <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <span
          aria-hidden
          className="h-px w-full bg-[linear-gradient(90deg,rgba(245,200,67,0.45)_0%,rgba(245,200,67,0.18)_18%,transparent_55%)]"
        />
      </header>
      <SwapForm initialTokens={initialTokens} />
      <SwapHistory />
    </div>
  );
}
