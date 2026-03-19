"use client";

import { useMemo } from "react";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
import PageHeader from "@/components/molecules/page-header";
import StakeFormPanel from "@/components/organism/form/stake";
import StakeHistory from "@/components/organism/stake/history";
import StakeActivePosition from "@/components/organism/stake/active-position";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Utils
import { generateMockStakeData, formatStakeNumber } from "@/utils/number";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function StakeTemplate() {
  const t = useTranslations("stake");
  const { isConnected, handleConnect } = useWallet();
  const stakeData = useMemo(() => generateMockStakeData("OKS"), []);

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
          { key: "token", value: stakeData.tokenSymbol },
          {
            key: "totalStaked",
            value: formatStakeNumber(stakeData.totalStaked, 2),
          },
          { key: "apr30d", value: `${stakeData.apr30d.toFixed(2)}%` },
          {
            key: "totalRewards",
            value: `${formatStakeNumber(stakeData.totalRewards)} ${stakeData.tokenSymbol}`,
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

      <StakeActivePosition />
      <StakeFormPanel />
      <StakeHistory />
    </div>
  );
}
