// Components
import KpiCard from "@/components/molecules/card/kpi";
import TradesHistory from "@/components/organism/trade/history";
import PriceChart from "@/components/organism/price/chart-panel";

// Hooks
import { useTranslations } from "next-intl";

export default function HomeTemplate() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "spot", value: "$0.1815", change: "+7.19%", secondary: "0.00028442 OKS/BNB" },
          { key: "volume", value: "$51.97K", secondary: "81.43 BNB" },
          { key: "marketCap", value: "$30.70K", secondary: "48.10 BNB" },
          { key: "imv", value: "$0.0802", subtitle: "(44% OF SPOT)", secondary: "0.00012571 OKS/BNB" },
        ].map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={t(kpi.key)}
            description={t(`${kpi.key}Desc`)}
            value={kpi.value}
            change={kpi.change}
            subtitle={kpi.subtitle}
            secondary={kpi.secondary}
          />
        ))}
      </div>
      <PriceChart />
      <TradesHistory />
    </div>
  );
}
