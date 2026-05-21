import { useCallback, useMemo, useState } from "react";

// Hooks
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useWallet } from "@/stores/wallet";
import { useWebSocket } from "@/hooks/use-websocket";
import { useStudioData } from "@/hooks/use-studio-data";

// Utils
import { formatCompactNumber } from "@/utils/number";
import { formatShortDate } from "@/utils/date";

// Constants
import { STUDIO_TOKEN_STATUS_VARIANT } from "@/types/constants";

// Types
import type { StudioActivityItem, WSBlockchainEvent } from "@/types/interfaces";

/**
 * Manages studio token detail page state:
 * - Resolves token from URL params and creator API data
 * - Builds token info rows, KPI cards
 * - Receives real-time trade activity via WebSocket
 */
export function useStudioTokenDetail() {
  const t = useTranslations("studio");
  const { isConnected, handleConnect } = useWallet();
  const params = useParams();
  const tokenSymbol = (params.token as string)?.toUpperCase() ?? "OKS";

  const { tokens } = useStudioData();
  const token = tokens.find((tk) => tk.symbol === tokenSymbol) ?? tokens[0];

  // Real-time activity via WebSocket
  const [activity, setActivity] = useState<StudioActivityItem[]>([]);

  const onEvent = useCallback(
    (event: WSBlockchainEvent) => {
      if (event.eventName !== "Swap") return;

      const amount = Math.abs(parseFloat(event.args.amount0 ?? "0")) / 1e18;
      const item: StudioActivityItem = {
        id: `${event.transactionHash}-${event.timestamp}`,
        type: "trade",
        token: tokenSymbol,
        amount,
        wallet: event.args.sender ?? "",
        timestamp: new Date(
          event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000,
        ),
      };

      setActivity((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [item, ...prev].slice(0, 50);
      });
    },
    [tokenSymbol],
  );

  useWebSocket({
    onEvent,
    enabled: !!token,
  });

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
        {
          key: "totalVolumeLabel",
          value: `$${formatCompactNumber(token.totalVolume)}`,
        },
        { key: "holders", value: String(token.holders) },
        { key: "earnings", value: `$${formatCompactNumber(token.earnings)}` },
      ]
    : [];

  const ACTIVITY_VARIANT: Record<
    StudioActivityItem["type"],
    "default" | "secondary" | "outline"
  > = {
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
