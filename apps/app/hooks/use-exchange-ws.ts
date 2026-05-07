"use client";

import { useCallback, useMemo, useState } from "react";

import { useWebSocket } from "@/hooks/use-websocket";
import { useSpotPrice } from "@/hooks/use-spot-price";
import { useOhlcCandles } from "@/hooks/use-ohlc-candles";
import type { WSBlockchainEvent } from "@/types/interfaces";

export interface ExchangeStats {
  currentPrice: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
}

const EVENT_CHANNELS = ["event"] as const;

/**
 * Aggregates all data needed by the Exchange page:
 *   - Spot price (`useSpotPrice` → SWR poll of `/api/price`)
 *   - OHLC candles (`useOhlcCandles` → SWR poll of `/api/price/ohlc`)
 *   - Live trades (`useWebSocket` → Socket.IO `event` channel, server pushes
 *     Swap events as they happen)
 *
 * `stats` is no longer populated — the backend has no aggregated 24h stats
 * endpoint yet. Consumers that need volume/high/low should derive them from
 * the candles array.
 */
export function useExchangeWS(
  poolAddress: string | undefined,
  ohlcInterval: string = "1h",
) {
  const [trades, setTrades] = useState<WSBlockchainEvent[]>([]);

  const { price: livePrice } = useSpotPrice(poolAddress);
  const { candles } = useOhlcCandles(poolAddress, ohlcInterval);

  const onEvent = useCallback((event: WSBlockchainEvent) => {
    if (event.eventName === "Swap") {
      setTrades((prev) => [event, ...prev].slice(0, 100));
    }
  }, []);

  const { isConnected } = useWebSocket({
    poolAddress,
    channels: EVENT_CHANNELS as unknown as ("event" | "loanEvent")[],
    onEvent,
    enabled: !!poolAddress,
  });

  // Preserve the legacy ohlcBars shape: `{ [interval]: candle[] }`
  const ohlcBars = useMemo(
    () => (candles.length > 0 ? { [ohlcInterval]: candles } : null),
    [candles, ohlcInterval],
  );

  return {
    isConnected,
    livePrice,
    stats: null as ExchangeStats | null,
    ohlcBars,
    trades,
  };
}
