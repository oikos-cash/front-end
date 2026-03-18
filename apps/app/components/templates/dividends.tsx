"use client";

import { useMemo, useState } from "react";

// Components
import Button from "@/components/atoms/button";
import Empty from "@/components/atoms/empty";
import KpiCard from "@/components/molecules/kpi-card";
import PageHeader from "@/components/molecules/page-header";
import DividendTokenList from "@/components/organism/dividend-token-list";
import DividendClaimHistory from "@/components/organism/dividend-claim-history";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Utils
import {
  formatCompactNumber,
  generateMockDividendTokens,
} from "@/utils/number";

// Icons
import { RefreshCw, Lock, Wallet } from "lucide-react";

export default function DividendsTemplate() {
  const t = useTranslations("dividends");
  const { isConnected, handleConnect } = useWallet();

  const dividendData = useMemo(() => {
    const tokens = generateMockDividendTokens();
    const totalUnvested = tokens.reduce((sum, tk) => sum + tk.unvested, 0);
    const totalVested = tokens.reduce((sum, tk) => sum + tk.vested, 0);
    const oksBalance = 4327.5918;
    return {
      tokenCount: tokens.length,
      totalUnvested: parseFloat(totalUnvested.toFixed(4)),
      totalVested: parseFloat(totalVested.toFixed(4)),
      oksBalance: parseFloat(oksBalance.toFixed(4)),
    };
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }

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
          title={t("tokensWithDividends")}
          description={t("tokensWithDividendsDesc")}
          value={String(dividendData.tokenCount)}
        />
        <KpiCard
          title={t("unvested")}
          description={t("unvestedDesc")}
          value={formatCompactNumber(dividendData.totalUnvested)}
        />
        <KpiCard
          title={t("vested")}
          description={t("vestedDesc")}
          value={formatCompactNumber(dividendData.totalVested)}
        />
        <KpiCard
          title={t("oksBalance")}
          description={t("oksBalanceDesc")}
          value={`${formatCompactNumber(dividendData.oksBalance)} OKS`}
          actions={
            <Button
              variant="ghost"
              size="icon-xs"
              isLoading={refreshing}
              onClick={handleRefresh}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          }
        />
      </div>
      <DividendTokenList />
      <DividendClaimHistory />
    </div>
  );
}
