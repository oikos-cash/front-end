"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { getWebSocketService } from "@/services/websocket";
import type {
  WSBlockchainEvent,
  WSLoanEvent,
  WSChannel,
  WSMessageCallback,
} from "@/types/interfaces";

/**
 * Hook to connect to the Socket.IO `/events` namespace and subscribe to a
 * pool's PUSH channels (`event`, `loanEvent`).
 *
 * For HTTP-polled data (spot price, OHLC candles, etc.) use the dedicated
 * SWR hooks instead — they give you proper dedupe + backoff for free:
 *   - `useSpotPrice(poolAddress)`
 *   - `useOhlcCandles(poolAddress, interval)`
 *
 * Implementation note: callbacks are stored in refs so they don't have to
 * be memoized at the call site. The effects only depend on the *identity*
 * of the channels (joined as a string) plus `poolAddress`/`enabled`, so a
 * parent re-render with new inline callbacks does NOT trigger a
 * subscribe/unsubscribe cycle.
 *
 * @example
 * useWebSocket({
 *   poolAddress,
 *   channels: ["event", "loanEvent"],
 *   onEvent: (e) => handleSwap(e),
 *   onLoan:  (e) => handleLoanEvent(e),
 * });
 */
export function useWebSocket(options: {
  poolAddress?: string;
  channels?: WSChannel[];
  onEvent?: WSMessageCallback<WSBlockchainEvent>;
  onLoan?: WSMessageCallback<WSLoanEvent>;
  enabled?: boolean;
}) {
  const { poolAddress, channels = [], onEvent, onLoan, enabled = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(getWebSocketService());

  // Keep the latest callbacks in refs so effect deps stay stable across
  // re-renders even when callers pass inline closures.
  const onEventRef = useRef(onEvent);
  const onLoanRef = useRef(onLoan);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    onLoanRef.current = onLoan;
  }, [onLoan]);

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

  // Register data callbacks once. The handler dereferences the ref so
  // updates to `onEvent`/`onLoan` propagate without re-registering.
  useEffect(() => {
    if (!enabled) return;
    const ws = wsRef.current;
    const cleanups: Array<() => void> = [];

    cleanups.push(
      ws.onEvent((data) => onEventRef.current?.(data)),
      ws.onLoan((data) => onLoanRef.current?.(data)),
    );

    return () => cleanups.forEach((fn) => fn());
  }, [enabled]);

  // Subscribe / unsubscribe when the pool or channel set changes.
  // We key the effect on the joined channel list (a stable string) instead
  // of the array reference — so callers can pass a fresh array literal
  // every render without causing a churn.
  const channelsKey = channels.join(",");
  useEffect(() => {
    if (!enabled || !isConnected || !poolAddress || channels.length === 0)
      return;

    const ws = wsRef.current;
    const subs = channels.slice();

    for (const ch of subs) {
      ws.subscribe(ch, poolAddress);
    }

    return () => {
      for (const ch of subs) {
        ws.unsubscribe(ch, poolAddress);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isConnected, poolAddress, channelsKey]);

  const disconnect = useCallback(() => {
    wsRef.current.disconnect();
  }, []);

  return { isConnected, disconnect };
}
