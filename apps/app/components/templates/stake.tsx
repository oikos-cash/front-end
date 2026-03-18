"use client";

import { useMemo } from "react";

// Components
import Button from "@/components/atoms/button";
import Empty from "@/components/atoms/empty";
import KpiCard from "@/components/molecules/kpi-card";
import PageHeader from "@/components/molecules/page-header";
import StakeFormPanel from "@/components/organism/stake-form-panel";
import StakeHistory from "@/components/organism/stake-history";

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
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t("token")}
          description={t("tokenDesc")}
          value={stakeData.tokenSymbol}
        />
        <KpiCard
          title={t("totalStaked")}
          description={t("totalStakedDesc")}
          value={formatStakeNumber(stakeData.totalStaked, 2)}
        />
        <KpiCard
          title={t("apr30d")}
          description={t("apr30dDesc")}
          value={`${stakeData.apr30d.toFixed(2)}%`}
        />
        <KpiCard
          title={t("totalRewards")}
          description={t("totalRewardsDesc")}
          value={`${formatStakeNumber(stakeData.totalRewards)} ${stakeData.tokenSymbol}`}
        />
      </div>

      <StakeFormPanel />
      <StakeHistory />
    </div>
  );
}
