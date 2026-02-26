"use client";

import { useCallback, useMemo, useState } from "react";

// Components
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import Tooltip from "@/components/atoms/tooltip";
import StatsCard from "@/components/molecules/stats-card";
import LiquidityChart from "@/components/organism/liquidity-chart";
import LiquidityDetails from "@/components/organism/liquidity-details";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { RefreshCw } from "lucide-react";

// Utils
import { generateMockLiquidity } from "@/utils/number";

export default function LiquidityTemplate() {
  const t = useTranslations("liquidity");
  const [refreshKey, setRefreshKey] = useState(0);

  const data = useMemo(() => generateMockLiquidity(), [refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          variant="spot"
          title={t("spotPrice")}
          value={`$${data.spotPrice.toFixed(4)}`}
          secondary={`${data.spotBnb.toFixed(8)} BNB`}
        />
        <StatsCard
          variant="volume"
          title={t("liquidityRatio")}
          value={data.liquidityRatio.toFixed(4)}
          secondary={t("protocolHealth")}
          actions={
            <ButtonGroup>
              <Button variant="outline" size="xs">
                {t("shift")}
              </Button>
              <Button variant="outline" size="xs">
                {t("slide")}
              </Button>
            </ButtonGroup>
          }
        />
        <StatsCard
          variant="marketCap"
          title={t("circulatingSupply")}
          value={data.circulatingSupply.toLocaleString()}
          secondary="OKS"
        />
        <StatsCard
          variant="imv"
          title={t("imvPrice")}
          value={`$${data.imvPrice.toFixed(4)}`}
          secondary={t("floorProtection")}
        />
      </div>
      <div className="flex items-center justify-end mb-3">
        <Tooltip content={t("refresh")}>
          <Button variant="ghost" size="icon-xs" onClick={handleRefresh}>
            <RefreshCw className="size-3.5" />
          </Button>
        </Tooltip>
      </div>
      <LiquidityChart bars={data.bars} spotPrice={data.spotBnb} />
      <LiquidityDetails details={data.details} />
    </div>
  );
}
