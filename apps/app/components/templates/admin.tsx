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
import ProtocolHealthSection from "@/components/organism/admin/protocol-health";
import LoanPositionsTable from "@/components/organism/admin/loan-positions-table";
import VaultHealthTable from "@/components/organism/admin/vault-health-table";

// Hooks
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useAdminStats } from "@/hooks/use-admin-stats";
import { useProtocolHealth } from "@/hooks/use-protocol-health";

// Utils / types
import {
  buildLaunchSeries,
  buildMarketCapBars,
  buildStatusSlices,
  deriveKpis,
} from "@/utils/admin";
import {
  buildVaultHealth,
  deriveProtocolHealth,
  deriveSolvency,
} from "@/utils/protocol-health";
import type { MarketToken, VaultInfo } from "@/types/interfaces";

export default function AdminTemplate({
  initialTokens,
  initialVaults,
}: {
  initialTokens: MarketToken[];
  initialVaults: VaultInfo[];
}) {
  const { bnbPrice } = useBnbPrice();
  const { loanActivity, loanEvents, loanAggregates } = useAdminStats();
  const { loans, isLoading: healthLoading } = useProtocolHealth(initialVaults);

  const health = useMemo(
    () =>
      deriveProtocolHealth(
        loans,
        deriveKpis(initialTokens, initialVaults, bnbPrice).totalMarketCapBnb,
      ),
    [loans, initialTokens, initialVaults, bnbPrice],
  );
  const solvency = useMemo(() => deriveSolvency(initialVaults), [initialVaults]);
  const vaultHealth = useMemo(() => {
    const mcap = new Map<string, number>();
    for (const t of initialTokens) {
      if (t.vaultAddress && t.marketCap) mcap.set(t.vaultAddress.toLowerCase(), t.marketCap);
    }
    return buildVaultHealth(initialVaults, health.positions, mcap);
  }, [initialVaults, initialTokens, health.positions]);

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

      {/* Debt vs market cap, collateral coverage, per-loan health */}
      <ProtocolHealthSection
        health={health}
        solvency={solvency}
        lifetimeBorrowedBnb={loanAggregates.totalBorrowedBnb}
        lifetimeBorrows={loanAggregates.borrows}
        bnbPrice={bnbPrice}
        isLoading={healthLoading}
      />
      <VaultHealthTable rows={vaultHealth} />
      <LoanPositionsTable positions={health.positions} isLoading={healthLoading} />

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
