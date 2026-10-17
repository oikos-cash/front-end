"use client";

import { useMemo } from "react";

// Components
import PageHeader from "@/components/molecules/page-header";
import KpiGrid from "@/components/organism/admin/kpi-grid";
import LaunchesChart from "@/components/organism/admin/launches-chart";
import MarketCapChart from "@/components/organism/admin/marketcap-chart";
import StatusDonut from "@/components/organism/admin/status-donut";
import LoanActivityChart from "@/components/organism/admin/loan-activity-chart";
import TokensTable from "@/components/organism/admin/tokens-table";
import LoansTable from "@/components/organism/admin/loans-table";

// Hooks
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useAdminStats } from "@/hooks/use-admin-stats";

// Utils / types
import {
  buildLaunchSeries,
  buildMarketCapBars,
  buildStatusSlices,
} from "@/utils/admin";
import type { MarketToken, VaultInfo } from "@/types/interfaces";

export default function AdminTemplate({
  initialTokens,
  initialVaults,
}: {
  initialTokens: MarketToken[];
  initialVaults: VaultInfo[];
}) {
  const { bnbPrice } = useBnbPrice();
  const { loanActivity, loanEvents } = useAdminStats();

  const launchSeries = useMemo(
    () => buildLaunchSeries(initialTokens),
    [initialTokens],
  );
  const marketCapBars = useMemo(
    () => buildMarketCapBars(initialTokens, bnbPrice, 10),
    [initialTokens, bnbPrice],
  );
  const statusSlices = useMemo(
    () => buildStatusSlices(initialTokens),
    [initialTokens],
  );

  return (
    <div className="flex flex-col gap-6 py-4">
      <PageHeader
        title="Protocol Admin"
        description="Growth & usage analytics across every Oikos vault"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Admin" }]}
      />

      {/* Headline KPIs */}
      <KpiGrid tokens={initialTokens} vaults={initialVaults} />

      {/* Growth & activity charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LaunchesChart data={launchSeries} />
        <LoanActivityChart data={loanActivity} />
        <MarketCapChart data={marketCapBars} />
        <StatusDonut data={statusSlices} />
      </div>

      {/* Detail tables */}
      <TokensTable tokens={initialTokens} />
      <LoansTable events={loanEvents} />
    </div>
  );
}
