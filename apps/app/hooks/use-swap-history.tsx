"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Hooks
import { useTranslations } from "next-intl";
import { useWebSocket } from "@/hooks/use-websocket";

// Types
import type { RecentSwap, WSBlockchainEvent } from "@/types/interfaces";

// Icons
import { ArrowRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { formatCompactNumber } from "@/utils/number";

// Constants
import { SWAP_HISTORY_MAX_ITEMS } from "@/types/constants";

export function useSwapHistory() {
  const t = useTranslations("swap");

  const [items, setItems] = useState<RecentSwap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<RecentSwap>[] = [
    {
      accessorKey: "fromToken",
      header: t("from"),
      cell: ({ row }) => (
        <span className="text-sm font-medium whitespace-nowrap">
          {formatCompactNumber(row.original.fromAmount)} {row.original.fromToken}
        </span>
      ),
    },
    {
      id: "arrow",
      header: "",
      cell: () => <ArrowRight className="size-3.5 text-muted-foreground" />,
    },
    {
      accessorKey: "toToken",
      header: t("to"),
      cell: ({ row }) => (
        <span className="text-sm font-medium whitespace-nowrap">
          {formatCompactNumber(row.original.toAmount)} {row.original.toToken}
        </span>
      ),
    },
    {
      accessorKey: "timestamp",
      header: t("time"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {timeAgo(row.getValue("timestamp") as Date)}
        </span>
      ),
    },
  ];

  // Listen for real Swap events via WebSocket
  const onEvent = useCallback((event: WSBlockchainEvent) => {
    if (event.eventName !== "Swap") return;

    const amount0 = Math.abs(parseFloat(event.args.amount0 ?? "0")) / 1e18;
    const amount1 = Math.abs(parseFloat(event.args.amount1 ?? "0")) / 1e18;
    const isBuy = parseFloat(event.args.amount0 ?? "0") < 0;

    const swap: RecentSwap = {
      id: `${event.transactionHash}-${event.timestamp}`,
      fromToken: isBuy ? "WBNB" : "TOKEN",
      toToken: isBuy ? "TOKEN" : "WBNB",
      fromAmount: isBuy ? amount1 : amount0,
      toAmount: isBuy ? amount0 : amount1,
      timestamp: new Date(
        event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000,
      ),
    };

    setItems((prev) => {
      if (prev.some((i) => i.id === swap.id)) return prev;
      setIsLoading(false);
      return [swap, ...prev].slice(0, SWAP_HISTORY_MAX_ITEMS);
    });
  }, []);

  useWebSocket({
    onEvent,
    enabled: true,
  });

  // Mark loading as false after a short timeout if no events arrive
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  return {
    t,
    items,
    isLoading,
    hasMore: false,
    sentinelRef,
    columns,
  };
}
