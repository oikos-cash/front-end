"use client";

// Components
import KpiCard from "@/components/molecules/card/kpi";
import Skeleton from "@/components/atoms/skeleton";
import TradesHistory from "@/components/organism/trade/history";
import PriceChart from "@/components/organism/price/chart-panel";

// Hooks
import { useExchangeKpis } from "@/hooks/use-exchange-kpis";

// Types
import type { VaultInfo } from "@/types/interfaces";

export default function HomeTemplate({
  initialVault,
}: {
  initialVault: VaultInfo | null;
}) {
  const { kpis, t, isLoading } = useExchangeKpis(initialVault);
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))
          : kpis.map((kpi) => (
              <KpiCard
                key={kpi.key}
                title={t(kpi.key)}
                value={kpi.value}
                change={kpi.change}
                subtitle={kpi.subtitle}
                secondary={kpi.secondary}
                description={t(`${kpi.key}Desc`)}
              />
            ))}
      </div>
      <PriceChart poolAddress={initialVault?.poolAddress} />
      <TradesHistory
        token={initialVault?.tokenSymbol}
        poolAddress={initialVault?.poolAddress}
      />
    </div>
  );
}
