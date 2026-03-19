import { useCallback, useMemo, useState } from "react";

// Hooks
import { useTranslations } from "next-intl";

// Utils
import { generateMockLiquidity } from "@/utils/number";

/**
 * Manages liquidity page state:
 * - Pool selection and refresh trigger via key increment
 * - Mock data regenerates when pool or refresh key changes
 * - Builds KPI card config array for map rendering
 */
export function useLiquidity() {
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

  function handlePoolChange(v: string) {
    setSelectedPool(v);
    setRefreshKey((k) => k + 1);
  }

  const kpiCards = [
    {
      key: "spotPrice",
      value: data.spotPrice.toFixed(4),
      secondary: `${data.spotBnb.toFixed(8)} BNB`,
    },
    {
      key: "liquidityRatio",
      value: data.liquidityRatio.toFixed(4),
      secondary: t("protocolHealth"),
      hasActions: true,
    },
    {
      key: "circulatingSupply",
      value: data.circulatingSupply.toLocaleString(),
      secondary: "OKS",
    },
    {
      key: "imvPrice",
      value: data.imvPrice.toFixed(4),
      secondary: t("floorProtection"),
    },
  ];

  return {
    t,
    data,
    selectedPool,
    handlePoolChange,
    handleRefresh,
    kpiCards,
  };
}
