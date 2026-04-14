"use client";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import SwapForm from "@/components/organism/form/swap";
import PageHeader from "@/components/molecules/page-header";
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
    <div className="flex flex-col gap-6 py-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: t("title") }]}
      />
      <SwapForm initialTokens={initialTokens} />
      <SwapHistory />
    </div>
  );
}
