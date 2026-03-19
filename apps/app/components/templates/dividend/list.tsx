"use client";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
import PageHeader from "@/components/molecules/page-header";
import DividendTokenList from "@/components/organism/dividend/token-list";
import DividendClaimHistory from "@/components/organism/dividend/claim-history";

// Hooks
import { useDividends } from "@/hooks/use-dividends";

// Icons
import { RefreshCw, Lock, Wallet } from "lucide-react";

export default function DividendsTemplate() {
  const { t, isConnected, handleConnect, refreshing, handleRefresh, kpiCards } =
    useDividends();

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
        {kpiCards.map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={t(kpi.key)}
            description={t(`${kpi.key}Desc`)}
            value={kpi.value}
            actions={
              kpi.hasRefresh ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  isLoading={refreshing}
                  onClick={handleRefresh}
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>
      <DividendTokenList />
      <DividendClaimHistory />
    </div>
  );
}
