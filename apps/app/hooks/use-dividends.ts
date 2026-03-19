import { useMemo, useState } from "react";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Utils
import {
  formatCompactNumber,
  generateMockDividendTokens,
} from "@/utils/number";

/**
 * Manages dividends page state:
 * - Aggregates token data into KPI values
 * - Mock refresh handler
 * - Builds KPI card config array for map rendering
 */
export function useDividends() {
  const t = useTranslations("dividends");
  const { isConnected, handleConnect } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const dividendData = useMemo(() => {
    const tokens = generateMockDividendTokens();
    const totalUnvested = tokens.reduce((sum, tk) => sum + tk.unvested, 0);
    const totalVested = tokens.reduce((sum, tk) => sum + tk.vested, 0);
    const oksBalance = 4327.5918;
    return {
      tokenCount: tokens.length,
      totalUnvested: parseFloat(totalUnvested.toFixed(4)),
      totalVested: parseFloat(totalVested.toFixed(4)),
      oksBalance: parseFloat(oksBalance.toFixed(4)),
    };
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }

  const kpiCards = [
    { key: "tokensWithDividends", value: String(dividendData.tokenCount) },
    { key: "unvested", value: formatCompactNumber(dividendData.totalUnvested) },
    { key: "vested", value: formatCompactNumber(dividendData.totalVested) },
    {
      key: "oksBalance",
      value: `${formatCompactNumber(dividendData.oksBalance)} OKS`,
      hasRefresh: true,
    },
  ];

  return {
    t,
    isConnected,
    handleConnect,
    refreshing,
    handleRefresh,
    kpiCards,
  };
}
