"use client";

import { useCallback, useState } from "react";

import { useWebSocket } from "@/hooks/use-websocket";
import type {
  WSPriceUpdate,
  WSStatsUpdate,
  WSOHLCUpdate,
  WSBlockchainEvent,
} from "@/types/interfaces";

export interface ExchangeStats {
  currentPrice: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
}

/**
 * Subscribes to all WS channels needed by the Exchange page:
 * - price → live price ticker
 * - stats → 24h volume, high, low, change
 * - ohlc  → candlestick data
 * - events → Swap events (live trades)
 *
 * @example
 * const { stats, ohlcBars, trades, isConnected } = useExchangeWS(poolAddress, "1h");
 */
export function useExchangeWS(
  poolAddress: string | undefined,
  ohlcInterval: string = "1h",
) {
  const [stats, setStats] = useState<ExchangeStats | null>(null);
  const [ohlcBars, setOhlcBars] = useState<WSOHLCUpdate["data"] | null>(null);
  const [trades, setTrades] = useState<WSBlockchainEvent[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const onPrice = useCallback((data: WSPriceUpdate) => {
    setLivePrice(data.price);
  }, []);

  const onStats = useCallback((data: WSStatsUpdate) => {
    setStats({
      currentPrice: data.data.currentPrice,
      volume24h: data.data.volume["24h"],
      high24h: data.data.high24h,
      low24h: data.data.low24h,
      priceChange24h: data.data.priceChange24h,
    });
  }, []);

  const onOhlc = useCallback((data: WSOHLCUpdate) => {
    setOhlcBars(data.data);
  }, []);

  const onEvent = useCallback((event: WSBlockchainEvent) => {
    if (event.eventName === "Swap") {
      setTrades((prev) => [event, ...prev].slice(0, 100));
    }
  }, []);

  const { isConnected } = useWebSocket({
    poolAddress,
    channels: ["price", "stats", "ohlc"],
    ohlcInterval,
    onPrice,
    onStats,
    onOhlc,
    onEvent,
    enabled: !!poolAddress,
  });

  return {
    isConnected,
    livePrice,
    stats,
    ohlcBars,
    trades,
  };
}
