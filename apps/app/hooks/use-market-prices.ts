"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getWebSocketService } from "@/services/websocket";
import type { WSPriceUpdate } from "@/types/interfaces";

/**
 * Subscribe to real-time price updates for multiple pool addresses.
 * Returns a map of poolAddress → latest price.
 *
 * @example
 * const prices = useMarketPrices(["0xPool1...", "0xPool2..."]);
 * const price = prices["0xpool1..."]; // number | undefined
 */
export function useMarketPrices(
  poolAddresses: string[],
): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const wsRef = useRef(getWebSocketService());
  const prevPoolsRef = useRef<string[]>([]);

  const handlePrice = useCallback((update: WSPriceUpdate) => {
    setPrices((prev) => {
      const key = update.poolAddress.toLowerCase();
      if (prev[key] === update.price) return prev;
      return { ...prev, [key]: update.price };
    });
  }, []);

  useEffect(() => {
    const ws = wsRef.current;
    const pools = poolAddresses.filter(Boolean);

    if (pools.length === 0) return;

    // Connect if needed
    if (!ws.isConnected()) {
      ws.connect().catch(() => {});
    }

    // Register callback
    const unsubCallback = ws.onPrice(handlePrice);

    // Subscribe to new pools
    const onConnected = (connected: boolean) => {
      if (!connected) return;
      for (const pool of pools) {
        ws.subscribe("price", pool);
      }
    };

    const unsubConnection = ws.onConnectionChange(onConnected);

    // Subscribe immediately if already connected
    if (ws.isConnected()) {
      for (const pool of pools) {
        ws.subscribe("price", pool);
      }
    }

    // Unsubscribe old pools that are no longer in the list
    const prevPools = prevPoolsRef.current;
    for (const old of prevPools) {
      if (!pools.includes(old)) {
        ws.unsubscribe("price", old);
      }
    }
    prevPoolsRef.current = pools;

    return () => {
      unsubCallback();
      unsubConnection();
      for (const pool of pools) {
        ws.unsubscribe("price", pool);
      }
    };
  }, [poolAddresses, handlePrice]);

  return prices;
}
