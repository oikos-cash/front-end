"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { getWebSocketService } from "@/services/websocket";
import type {
  WSPriceUpdate,
  WSStatsUpdate,
  WSOHLCUpdate,
  WSBlockchainEvent,
  WSLoanEvent,
  WSChannel,
  WSMessageCallback,
} from "@/types/interfaces";

/**
 * Hook to connect to the WebSocket service and subscribe to a pool's channels.
 *
 * Handles connect, subscribe, unsubscribe, and cleanup automatically.
 *
 * @example
 * const { isConnected } = useWebSocket({
 *   poolAddress: "0x...",
 *   channels: ["price", "stats"],
 *   ohlcInterval: "1h",
 *   onPrice: (data) => setPrice(data.price),
 *   onStats: (data) => setStats(data.data),
 *   onOhlc:  (data) => setBars(data.data),
 * });
 */
export function useWebSocket(options: {
  poolAddress?: string;
  channels?: WSChannel[];
  ohlcInterval?: string;
  onPrice?: WSMessageCallback<WSPriceUpdate>;
  onStats?: WSMessageCallback<WSStatsUpdate>;
  onOhlc?: WSMessageCallback<WSOHLCUpdate>;
  onEvent?: WSMessageCallback<WSBlockchainEvent>;
  onLoan?: WSMessageCallback<WSLoanEvent>;
  enabled?: boolean;
}) {
  const {
    poolAddress,
    channels = [],
    ohlcInterval,
    onPrice,
    onStats,
    onOhlc,
    onEvent,
    onLoan,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(getWebSocketService());

  // Connect on mount
  useEffect(() => {
    if (!enabled) return;

    const ws = wsRef.current;

    const unsub = ws.onConnectionChange(setIsConnected);

    if (!ws.isConnected()) {
      ws.connect().catch((err) =>
        console.error("[useWebSocket] connect failed", err),
      );
    } else {
      setIsConnected(true);
    }

    return unsub;
  }, [enabled]);

  // Register data callbacks
  useEffect(() => {
    if (!enabled) return;
    const ws = wsRef.current;
    const cleanups: (() => void)[] = [];

    if (onPrice) cleanups.push(ws.onPrice(onPrice));
    if (onStats) cleanups.push(ws.onStats(onStats));
    if (onOhlc) cleanups.push(ws.onOhlc(onOhlc));
    if (onEvent) cleanups.push(ws.onEvent(onEvent));
    if (onLoan) cleanups.push(ws.onLoan(onLoan));

    return () => cleanups.forEach((fn) => fn());
  }, [enabled, onPrice, onStats, onOhlc, onEvent, onLoan]);

  // Subscribe / unsubscribe to channels when connected + poolAddress changes
  useEffect(() => {
    if (!enabled || !isConnected || !poolAddress || channels.length === 0)
      return;

    const ws = wsRef.current;

    for (const ch of channels) {
      ws.subscribe(ch, poolAddress, ch === "ohlc" ? ohlcInterval : undefined);
    }

    return () => {
      for (const ch of channels) {
        ws.unsubscribe(
          ch,
          poolAddress,
          ch === "ohlc" ? ohlcInterval : undefined,
        );
      }
    };
  }, [enabled, isConnected, poolAddress, channels, ohlcInterval]);

  const disconnect = useCallback(() => {
    wsRef.current.disconnect();
  }, []);

  return { isConnected, disconnect };
}
