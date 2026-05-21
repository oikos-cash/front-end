"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";
import { useWebSocket } from "@/hooks/use-websocket";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useWallet } from "@/stores/wallet";
import { getWebSocketService } from "@/services/websocket";

// Types
import { Trade, WSBlockchainEvent } from "@/types/interfaces";

// Icons
import { ArrowUpRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";

// Constants
import { TRADES_MAX_TRADES } from "@/types/constants";

/**
 * Trades history hook — listens for real Swap events via WebSocket.
 * Shows empty state with server error when WS is not connected.
 */
export function useTradesHistory(
  token: string = "OKS",
  poolAddress?: string,
) {
  const t = useTranslations("tradesHistory");
  const { bnbPrice } = useBnbPrice();
  const { address } = useWallet();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("global");
  const [tokenFilter, setTokenFilter] = useState("all");

  // Listen for Swap events via WS
  const onEvent = useCallback(
    (event: WSBlockchainEvent) => {
      if (event.eventName !== "Swap") return;

      const raw0 = parseFloat(event.args.amount0 ?? "0");
      const raw1 = parseFloat(event.args.amount1 ?? "0");
      // amounts come as wei (18 decimals) — convert to human-readable
      const amount0 = raw0 / 1e18;
      const amount1 = raw1 / 1e18;
      const isBuy = amount1 < 0; // Negative amount1 = token out = buy
      const amount = Math.abs(amount0);
      const bnbAmount = Math.abs(amount1);
      const price = amount > 0 ? bnbAmount / amount : 0;

      const trade: Trade = {
        id: `${event.transactionHash}-${event.blockNumber}`,
        type: isBuy ? "buy" : "sell",
        token,
        amount,
        price,
        bnbAmount,
        usdValue: parseFloat((bnbAmount * bnbPrice).toFixed(2)),
        wallet: event.args.sender,
        txHash: event.transactionHash,
        timestamp: new Date(
          event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000,
        ),
      };

      setTrades((prev) => [trade, ...prev].slice(0, TRADES_MAX_TRADES));
    },
    [token, bnbPrice],
  );

  const { isConnected } = useWebSocket({
    poolAddress,
    channels: ["event"],
    onEvent,
    enabled: !!poolAddress,
  });

  // Load historical trades via WS getGlobalTrades
  useEffect(() => {
    let cancelled = false;
    const ws = getWebSocketService();

    function parseSwapEvent(event: WSBlockchainEvent): Trade {
      const raw0 = parseFloat(event.args.amount0 ?? "0");
      const raw1 = parseFloat(event.args.amount1 ?? "0");
      const amount0 = raw0 / 1e18;
      const amount1 = raw1 / 1e18;
      const isBuy = amount1 < 0;
      const amount = Math.abs(amount0);
      const bnbAmount = Math.abs(amount1);
      const price = amount > 0 ? bnbAmount / amount : 0;
      // timestamp from WS is already in ms
      const ts = event.timestamp > 1e12
        ? event.timestamp
        : event.timestamp * 1000;

      return {
        id: event.id ?? `${event.transactionHash}-${event.logIndex ?? event.blockNumber}`,
        type: (isBuy ? "buy" : "sell") as Trade["type"],
        token: event.tokenSymbol ?? token,
        amount,
        price,
        bnbAmount,
        usdValue: parseFloat((bnbAmount * bnbPrice).toFixed(2)),
        wallet: event.args.sender ?? event.actualSender ?? "",
        txHash: event.transactionHash,
        timestamp: new Date(ts),
      };
    }

    function loadTrades() {
      if (cancelled) return;
      ws.getGlobalTrades(100)
        .then((events) => {
          if (cancelled) return;
          const swapEvents = events.filter((e) => e.eventName === "Swap");
          const historical = swapEvents.map(parseSwapEvent);
          setTrades(historical.slice(0, TRADES_MAX_TRADES));
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("[useTradesHistory] getGlobalTrades failed:", err);
          setIsLoading(false);
        });
    }

    if (ws.isConnected()) {
      loadTrades();
    } else {
      ws.connect()
        .then(() => loadTrades())
        .catch((err) => {
          console.error("[useTradesHistory] WS connect failed:", err);
        });
    }

    return () => { cancelled = true; };
  }, [token, bnbPrice]);

  const columns: ColumnDef<Trade>[] = useMemo(
    () => [
      {
        accessorKey: "type",
        header: t("type"),
        cell: ({ row }) => {
          const type = row.getValue("type") as Trade["type"];
          return (
            <Badge
              variant={type === "buy" ? "default" : "destructive"}
              className="px-1.5 py-0 text-[10px]"
            >
              {type === "buy" ? t("buy") : t("sell")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "amount",
        header: t("details"),
        cell: ({ row }) => {
          const amount = (row.getValue("amount") as number).toLocaleString();
          const price = row.original.price.toFixed(6);
          return (
            <span className="whitespace-nowrap text-xs">
              {amount} {row.original.token} @ {price}
            </span>
          );
        },
      },
      {
        accessorKey: "bnbAmount",
        header: t("value"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs">
            {row.original.bnbAmount.toFixed(4)} BNB / $
            {row.original.usdValue.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "txHash",
        header: t("txId"),
        cell: ({ row }) => (
          <a
            href={`https://bscscan.com/tx/${row.original.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
          >
            {truncateAddress(row.original.txHash)}
            <ArrowUpRight className="size-3 text-muted-foreground/50" />
          </a>
        ),
      },
      {
        accessorKey: "timestamp",
        header: t("time"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {timeAgo(row.getValue("timestamp") as Date)}
          </span>
        ),
      },
    ],
    [t],
  );

  const filteredTrades = trades.filter((trade) => {
    if (view === "myTrades" && address) {
      if (trade.wallet.toLowerCase() !== address.toLowerCase()) return false;
    }
    if (tokenFilter !== "all" && trade.token !== tokenFilter) return false;
    return true;
  });

  const tokenOptions = [
    { value: "all", label: t("allTokens") },
    { value: token, label: token },
  ];

  const handleViewChange = (value: string) => {
    setView(value);
  };

  const handleClearHistory = () => {
    setTrades([]);
  };

  return {
    t,
    trades,
    view,
    tokenFilter,
    setTokenFilter,
    isLoading,
    isConnected,
    hasData: true,
    columns,
    filteredTrades,
    tokenOptions,
    handleViewChange,
    handleClearHistory,
  };
}
