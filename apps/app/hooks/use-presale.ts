import { useMemo } from "react";

// Hooks
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useWallet } from "@/stores/wallet";

// Utils
import { generateMockPresaleData, formatCompactNumber } from "@/utils/number";

/**
 * Manages presale page state:
 * - Resolves token from URL params
 * - Generates mock presale data
 * - Extracts user BNB balance from wallet
 * - Builds KPI and contribution row arrays for map rendering
 */
export function usePresale() {
  const t = useTranslations("presale");
  const { isConnected, handleConnect, balances } = useWallet();
  const params = useParams();
  const token = (params.token as string) ?? "OKS";

  const presaleData = useMemo(
    () => generateMockPresaleData(token.toUpperCase()),
    [token],
  );

  const userBalance = useMemo(() => {
    const bnb = balances.find((b) => b.token === "BNB");
    return bnb ? parseFloat(bnb.amount) : 0;
  }, [balances]);

  const kpiCards = [
    { key: "token", value: presaleData.tokenSymbol },
    { key: "price", value: `${presaleData.price.toFixed(6)} BNB` },
    { key: "hardCap", value: `${presaleData.hardCap.toFixed(2)} BNB` },
    { key: "softCap", value: `${presaleData.softCap.toFixed(2)} BNB` },
  ];

  // User contribution summary rows
  const contributionRows = presaleData.userContribution > 0
    ? [
        {
          key: "contributed",
          value: `${presaleData.userContribution.toFixed(4)} BNB`,
        },
        {
          key: "tokensToReceive",
          value: `${formatCompactNumber(presaleData.userTokens)} ${presaleData.tokenSymbol}`,
        },
      ]
    : [];

  return {
    t,
    isConnected,
    handleConnect,
    presaleData,
    userBalance,
    kpiCards,
    contributionRows,
  };
}
