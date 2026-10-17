"use client";

import { useMemo } from "react";

// Components
import KpiCard from "@/components/molecules/card/kpi";

// Hooks
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useAdminStats } from "@/hooks/use-admin-stats";

// Utils / types
import {
  deriveKpis,
  formatUsd,
  formatBnb,
  formatCount,
} from "@/utils/admin";
import type { MarketToken, VaultInfo } from "@/types/interfaces";

// Icons
import {
  Coins,
  DollarSign,
  GraduationCap,
  Rocket,
  HandCoins,
  Users,
  ArrowLeftRight,
  PackageCheck,
} from "lucide-react";

const ICON = "size-4 text-primary";

export default function KpiGrid({
  tokens,
  vaults,
}: {
  tokens: MarketToken[];
  vaults: VaultInfo[];
}) {
  const { bnbPrice } = useBnbPrice();
  const { loanAggregates, totalTrades, deployStats } = useAdminStats();

  const kpis = useMemo(
    () => deriveKpis(tokens, vaults, bnbPrice),
    [tokens, vaults, bnbPrice],
  );

  const graduatedPct =
    kpis.totalTokens > 0
      ? `${Math.round((kpis.graduated / kpis.totalTokens) * 100)}% of tokens`
      : undefined;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        title="Tokens Launched"
        value={formatCount(kpis.totalTokens)}
        secondary={`${kpis.inPresale} in presale`}
        icon={<Coins className={ICON} />}
      />
      <KpiCard
        title="Total Market Cap"
        value={formatUsd(kpis.totalMarketCapUsd)}
        secondary={formatBnb(kpis.totalMarketCapBnb)}
        icon={<DollarSign className={ICON} />}
      />
      <KpiCard
        title="Graduated"
        value={formatCount(kpis.graduated)}
        secondary={graduatedPct}
        icon={<GraduationCap className={ICON} />}
      />
      <KpiCard
        title="In Presale"
        value={formatCount(kpis.inPresale)}
        secondary="raising now"
        icon={<Rocket className={ICON} />}
      />
      <KpiCard
        title="Total Borrowed"
        value={formatBnb(loanAggregates.totalBorrowedBnb)}
        secondary={`${formatCount(loanAggregates.borrows)} borrows`}
        icon={<HandCoins className={ICON} />}
      />
      <KpiCard
        title="Unique Borrowers"
        value={formatCount(loanAggregates.uniqueBorrowers)}
        secondary="recent window"
        icon={<Users className={ICON} />}
      />
      <KpiCard
        title="Indexed Trades"
        value={totalTrades != null ? formatCount(totalTrades) : "—"}
        secondary="pool events"
        icon={<ArrowLeftRight className={ICON} />}
      />
      <KpiCard
        title="Deployments"
        value={
          deployStats ? formatCount(deployStats.success) : formatCount(kpis.totalTokens)
        }
        secondary={
          deployStats ? `${deployStats.failed} failed` : "successful"
        }
        icon={<PackageCheck className={ICON} />}
      />
    </div>
  );
}
