"use client";

import { useCallback, useMemo, useState } from "react";

// Components
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";
import Tooltip from "@/components/atoms/tooltip";
import KpiCard from "@/components/molecules/kpi-card";
import PageHeader from "@/components/molecules/page-header";
import ButtonGroup from "@/components/atoms/button-group";
import LiquidityChart from "@/components/organism/liquidity-chart";
import LiquidityDetails from "@/components/organism/liquidity-details";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { RefreshCw } from "lucide-react";

// Utils
import { generateMockLiquidity } from "@/utils/number";

// Constants
import { LIQUIDITY_POOLS } from "@/types/constants";

export default function LiquidityTemplate() {
  const t = useTranslations("liquidity");
  const [selectedPool, setSelectedPool] = useState("oks");
  const [refreshKey, setRefreshKey] = useState(0);

  const data = useMemo(
    () => generateMockLiquidity(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, selectedPool],
  );

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pt-4">
        <PageHeader
          title={t("title")}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: t("title") },
          ]}
        />
        <div className="flex items-center gap-2">
          <Select
            className="w-40"
            value={selectedPool}
            defaultValue="oks"
            onValueChange={(v) => {
              setSelectedPool(v);
              setRefreshKey((k) => k + 1);
            }}
            items={LIQUIDITY_POOLS}
            placeholder={t("selectPool")}
          />
          <Tooltip content={t("refresh")}>
            <Button variant="ghost" size="icon-xs" onClick={handleRefresh}>
              <RefreshCw className="size-3.5" />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t("spotPrice")}
          value={`$${data.spotPrice.toFixed(4)}`}
          secondary={`${data.spotBnb.toFixed(8)} BNB`}
        />
        <KpiCard
          title={t("liquidityRatio")}
          value={data.liquidityRatio.toFixed(4)}
          secondary={t("protocolHealth")}
          actions={
            <ButtonGroup>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setRefreshKey((k) => k + 1)}
              >
                {t("shift")}
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setRefreshKey((k) => k + 1)}
              >
                {t("slide")}
              </Button>
            </ButtonGroup>
          }
        />
        <KpiCard
          title={t("circulatingSupply")}
          value={data.circulatingSupply.toLocaleString()}
          secondary="OKS"
        />
        <KpiCard
          title={t("imvPrice")}
          value={`$${data.imvPrice.toFixed(4)}`}
          secondary={t("floorProtection")}
        />
      </div>

      <LiquidityChart bars={data.bars} spotPrice={data.spotBnb} />
      <LiquidityDetails details={data.details} />
    </div>
  );
}
