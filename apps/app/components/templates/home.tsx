"use client";

// Components
import StatsCard from "@/components/molecules/stats-card";
import PriceChart from "@/components/organism/price-chart";
import TradesHistory from "@/components/organism/trades-history";

// Hooks
import { useTranslations } from "next-intl";

export default function HomeTemplate() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          variant="spot"
          title={t("spot")}
          description={t("spotDesc")}
          value="$0.1815"
          change="+7.19%"
          secondary="0.00028442 OKS/BNB"
        />
        <StatsCard
          variant="volume"
          title={t("volume")}
          description={t("volumeDesc")}
          value="$51.97K"
          secondary="81.43 BNB"
        />
        <StatsCard
          variant="marketCap"
          title={t("marketCap")}
          description={t("marketCapDesc")}
          value="$30.70K"
          secondary="48.10 BNB"
        />
        <StatsCard
          variant="imv"
          title={t("imv")}
          description={t("imvDesc")}
          subtitle="(44% OF SPOT)"
          value="$0.0802"
          secondary="0.00012571 OKS/BNB"
        />
      </div>
      <PriceChart />
      <TradesHistory />
    </div>
  );
}
