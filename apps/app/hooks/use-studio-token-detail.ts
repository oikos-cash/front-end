import { useMemo } from "react";

// Hooks
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useWallet } from "@/stores/wallet";

// Utils
import {
  formatCompactNumber,
  generateMockStudioData,
  generateMockStudioActivity,
} from "@/utils/number";
import { formatShortDate } from "@/utils/date";

// Constants
import { STUDIO_TOKEN_STATUS_VARIANT } from "@/types/constants";

// Types
import type { StudioActivityItem } from "@/types/interfaces";

/**
 * Manages studio token detail page state:
 * - Resolves token from URL params and mock data
 * - Builds token info rows, KPI cards, and activity badge variants
 */
export function useStudioTokenDetail() {
  const t = useTranslations("studio");
  const { isConnected, handleConnect } = useWallet();
  const params = useParams();
  const tokenSymbol = (params.token as string)?.toUpperCase() ?? "OKS";

  const { tokens } = useMemo(() => generateMockStudioData(), []);
  const token = tokens.find((tk) => tk.symbol === tokenSymbol) ?? tokens[0];
  const activity = useMemo(
    () => (token ? generateMockStudioActivity(token.symbol) : []),
    [token],
  );

  // Token info rows for the detail Card
  const tokenInfoRows = token
    ? [
        { key: "name", value: token.name },
        { key: "symbol", value: token.symbol },
        { key: "created", value: formatShortDate(token.createdAt) },
      ]
    : [];

  // Performance KPI cards
  const kpiCards = token
    ? [
        {
          key: "price",
          value: `$${token.price.toFixed(4)}`,
          change: `${token.change24h >= 0 ? "+" : ""}${token.change24h}%`,
        },
        { key: "volume24h", value: `$${formatCompactNumber(token.volume24h)}` },
        { key: "totalVolumeLabel", value: `$${formatCompactNumber(token.totalVolume)}` },
        { key: "holders", value: String(token.holders) },
        { key: "earnings", value: `$${formatCompactNumber(token.earnings)}` },
      ]
    : [];

  // Activity type → badge variant mapping
  const ACTIVITY_VARIANT: Record<StudioActivityItem["type"], "default" | "secondary" | "outline"> = {
    trade: "default",
    stake: "secondary",
    lp_add: "outline",
    lp_remove: "outline",
  };

  return {
    t,
    isConnected,
    handleConnect,
    token,
    activity,
    tokenInfoRows,
    kpiCards,
    ACTIVITY_VARIANT,
    STATUS_VARIANT: STUDIO_TOKEN_STATUS_VARIANT,
  };
}
