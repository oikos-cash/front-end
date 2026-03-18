"use client";

import { useMemo } from "react";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/kpi-card";
import PageHeader from "@/components/molecules/page-header";
import StudioTokenList from "@/components/organism/studio-token-list";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Utils
import { formatCompactNumber, generateMockStudioData } from "@/utils/number";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function StudioTemplate() {
  const t = useTranslations("studio");
  const { isConnected, handleConnect } = useWallet();
  const { tokens, stats } = useMemo(() => generateMockStudioData(), []);

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
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: t("title") },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t("totalTokens")}
          description={t("totalTokensDesc")}
          value={String(stats.totalTokens)}
        />
        <KpiCard
          title={t("totalVolume")}
          description={t("totalVolumeDesc")}
          value={`$${formatCompactNumber(stats.totalVolume)}`}
        />
        <KpiCard
          title={t("totalHolders")}
          description={t("totalHoldersDesc")}
          value={String(stats.totalHolders)}
        />
        <KpiCard
          title={t("totalLiquidity")}
          description={t("totalLiquidityDesc")}
          value={`$${formatCompactNumber(stats.totalLiquidity)}`}
        />
      </div>
      <StudioTokenList tokens={tokens} />
    </div>
  );
}
