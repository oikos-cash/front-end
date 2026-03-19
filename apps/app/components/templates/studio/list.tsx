"use client";

import { useMemo } from "react";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
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
        breadcrumbs={[{ label: "Home", href: "/" }, { label: t("title") }]}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "totalTokens", value: String(stats.totalTokens) },
          {
            key: "totalVolume",
            value: `$${formatCompactNumber(stats.totalVolume)}`,
          },
          { key: "totalHolders", value: String(stats.totalHolders) },
          {
            key: "totalLiquidity",
            value: `$${formatCompactNumber(stats.totalLiquidity)}`,
          },
        ].map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={t(kpi.key)}
            description={t(`${kpi.key}Desc`)}
            value={kpi.value}
          />
        ))}
      </div>
      <StudioTokenList tokens={tokens} />
    </div>
  );
}
