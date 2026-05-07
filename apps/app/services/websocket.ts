import { io, type Socket } from "socket.io-client";

import type {
  WSBlockchainEvent,
  WSLoanEvent,
  WSChannel,
  WSMessageCallback,
} from "@/types/interfaces";

import {
  WS_URL,
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_RECONNECT_BASE_DELAY,
} from "@/types/constants";

type ErrorCallback = (error: string) => void;
type ConnectionCallback = (connected: boolean) => void;

/**
 * Channel string accepted by `subscribe`/`unsubscribe`. Only the real
 * Socket.IO push channels are supported now; HTTP-polled streams (`price`,
 * `ohlc`, `stats`) moved to dedicated SWR hooks (`useSpotPrice`,
 * `useOhlcCandles`) which give us proper dedupe + backoff for free.
 */
type SubscribableChannel = WSChannel | "event" | "loanEvent";

/** Timeout for the `globalTrades` reply (one-shot listener). */
const GLOBAL_TRADES_TIMEOUT_MS = 15_000;

/**
 * Realtime push service backed by Socket.IO `/events` namespace.
 *
 * Channels (server → client):
 *   - `event`     → blockchain events (Pool/ExchangeHelper)
 *   - `loanEvent` → loan events (Borrow / Payback / Roll / Liquidation)
 *
 * `subscribe(channel, poolAddress)` registers interest in a pool with the
 * backend (`subscribe` emit). Push events for that pool start flowing once
 * the pool is registered and stop when the last reference is released.
 *
 * For HTTP-polled feeds (spot price, OHLC candles), use:
 *   - `useSpotPrice(poolAddress)` — `hooks/use-spot-price.ts`
 *   - `useOhlcCandles(poolAddress, interval)` — `hooks/use-ohlc-candles.ts`
 *
 * Singleton — use `getWebSocketService()`. Survives Next.js HMR via
 * `globalThis.__oikos_ws`.
 */
class WebSocketService {
  private socket: Socket | null = null;
  private url: string;

  // Pool subscription bookkeeping: address (lowercased) → set of channel keys
  // currently holding that pool. The backend `subscribe`/`unsubscribe` emit
  // fires only on transitions to/from an empty set.
  private poolRefs = new Map<string, Set<string>>();

  // Blockchain event callbacks
  private eventCallbacks = new Set<WSMessageCallback<WSBlockchainEvent>>();

  // Loan event callbacks
  private loanCallbacks = new Set<WSMessageCallback<WSLoanEvent>>();

  // Connection lifecycle callbacks
  private errorCallbacks = new Set<ErrorCallback>();
  private connectionCallbacks = new Set<ConnectionCallback>();

  constructor(url?: string) {
    this.url = url ?? WS_URL;
  }

  // ===========================================================
  //                      CONNECTION
  // ===========================================================

  connect(): Promise<void> {
    if (this.socket?.connected) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      // Reuse a still-connecting socket if present.
      const existing = this.socket;
      if (existing && !existing.connected) {
        existing.once("connect", () => resolve());
        existing.once("connect_error", (err: Error) => reject(err));
        return;
      }

      const socket = io(`${this.url}/events`, {
        transports: ["websocket"],
        reconnectionAttempts: WS_MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: WS_RECONNECT_BASE_DELAY,
        autoConnect: true,
      });

      this.socket = socket;

      // Initial-connect resolution: only the FIRST connect/connect_error
      // resolves/rejects this promise. Subsequent reconnects are handled
      // internally by Socket.IO; we still notify connection-change listeners.
      let settled = false;

      // Settle the connect promise on the FIRST connect/connect_error.
      socket.once("connect", () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });
      socket.once("connect_error", (err: Error) => {
        if (!settled) {
          settled = true;
          this.notifyError(err.message ?? "WebSocket connection error");
          reject(err);
        }
      });

      // Persistent listener: fires on initial connect AND every reconnect.
      // Re-subscribes known pools each time so we recover after a drop.
      socket.on("connect", () => {
        this.notifyConnection(true);
        const pools = Array.from(this.poolRefs.keys());
        if (pools.length > 0) {
          socket.emit("subscribe", { pools });
        }
      });

      socket.on("disconnect", () => {
        this.notifyConnection(false);
      });

      socket.on("connect_error", (err: Error) => {
        console.error("[WS] connect_error", err);
        this.notifyError(err.message ?? "WebSocket connection error");
      });

      socket.on("event", (payload: WSBlockchainEvent) => {
        this.notify(this.eventCallbacks, payload);
      });

      socket.on("loanEvent", (payload: WSLoanEvent["data"]) => {
        // Backend emits the inner event payload; preserve the
        // `{ type, data }` envelope the existing WSLoanEvent contract uses.
        this.notify(this.loanCallbacks, {
          type: "loanEvent",
          data: payload,
        } as WSLoanEvent);
      });
    });
  }

  disconnect(): void {
    // Drop pool subscriptions; on reconnect there's nothing to restore.
    this.poolRefs.clear();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.notifyConnection(false);
  }

  isConnected(): boolean {
    return this.socket?.connected === true;
  }

  // ===========================================================
  //                    SUBSCRIPTIONS
  // ===========================================================

  /**
   * Subscribe to push events for a pool. Only `event` and `loanEvent`
   * channels are real push streams now — anything else is silently ignored
   * (HTTP-polled streams moved to SWR hooks).
   */
  subscribe(
    channel: WSChannel,
    poolAddress: string,
    interval?: string,
  ): void {
    const ch = channel as SubscribableChannel;
    if (ch !== "event" && ch !== "loanEvent") return;

    const pool = poolAddress.toLowerCase();
    const subKey = this.subscriptionKey(ch, pool, interval);
    this.acquirePoolRef(pool, subKey);
  }

  unsubscribe(
    channel: WSChannel,
    poolAddress: string,
    interval?: string,
  ): void {
    const ch = channel as SubscribableChannel;
    if (ch !== "event" && ch !== "loanEvent") return;

    const pool = poolAddress.toLowerCase();
    const subKey = this.subscriptionKey(ch, pool, interval);
    this.releasePoolRef(pool, subKey);
  }

  // ===========================================================
  //                REQUEST-RESPONSE METHODS
  // ===========================================================

  /**
   * Request historical global trades from the backend.
   * The NestJS gateway replies via a `globalTrades` event (NOT an ACK
   * callback), so we use a one-shot listener with a manual timeout.
   * Resolves with the array of events (possibly empty) or rejects on
   * transport/timeout error.
   */
  getGlobalTrades(limit = 100): Promise<WSBlockchainEvent[]> {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      if (!socket || !socket.connected) {
        reject(new Error("Not connected"));
        return;
      }

      const timer = setTimeout(() => {
        socket.off("globalTrades", handler);
        reject(new Error("getGlobalTrades timeout"));
      }, GLOBAL_TRADES_TIMEOUT_MS);

      const handler = (payload: unknown) => {
        clearTimeout(timer);
        socket.off("globalTrades", handler);
        // Backend shape: { type, trades, count } or array, depending on version.
        const trades = Array.isArray(payload)
          ? payload
          : ((payload as { trades?: unknown })?.trades ??
              (payload as { data?: unknown })?.data);
        resolve(Array.isArray(trades) ? (trades as WSBlockchainEvent[]) : []);
      };

      socket.on("globalTrades", handler);
      socket.emit("getGlobalTrades", { limit });
    });
  }

  // ===========================================================
  //                CALLBACK REGISTRATION
  // Returns an unsubscribe function for cleanup.
  // ===========================================================

  onEvent(cb: WSMessageCallback<WSBlockchainEvent>): () => void {
    this.eventCallbacks.add(cb);
    return () => this.eventCallbacks.delete(cb);
  }

  onLoan(cb: WSMessageCallback<WSLoanEvent>): () => void {
    this.loanCallbacks.add(cb);
    return () => this.loanCallbacks.delete(cb);
  }

  onError(cb: ErrorCallback): () => void {
    this.errorCallbacks.add(cb);
    return () => this.errorCallbacks.delete(cb);
  }

  onConnectionChange(cb: ConnectionCallback): () => void {
    this.connectionCallbacks.add(cb);
    return () => this.connectionCallbacks.delete(cb);
  }

  // ===========================================================
  //                      INTERNALS
  // ===========================================================

  private subscriptionKey(
    channel: SubscribableChannel,
    pool: string,
    interval?: string,
  ): string {
    return `${channel}:${pool}:${interval ?? ""}`;
  }

  /**
   * Add a reference for a pool. Emits `subscribe` to the backend the first
   * time we hold a reference for that pool.
   */
  private acquirePoolRef(pool: string, subKey: string): void {
    let refs = this.poolRefs.get(pool);
    if (!refs) {
      refs = new Set<string>();
      this.poolRefs.set(pool, refs);
    }
    if (refs.has(subKey)) return;
    const wasEmpty = refs.size === 0;
    refs.add(subKey);
    if (wasEmpty && this.socket?.connected) {
      this.socket.emit("subscribe", { pools: [pool] });
    }
  }

  /**
   * Remove a reference for a pool. Emits `unsubscribe` to the backend only
   * when the last reference for that pool is released.
   */
  private releasePoolRef(pool: string, subKey: string): void {
    const refs = this.poolRefs.get(pool);
    if (!refs) return;
    if (!refs.delete(subKey)) return;
    if (refs.size === 0) {
      this.poolRefs.delete(pool);
      if (this.socket?.connected) {
        this.socket.emit("unsubscribe", { pools: [pool] });
      }
    }
  }

  private notify<T>(cbs: Set<WSMessageCallback<T>>, data: T): void {
    cbs.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error("[WS] Error in callback", err);
      }
    });
  }

  private notifyError(error: string): void {
    this.errorCallbacks.forEach((cb) => {
      try {
        cb(error);
      } catch (err) {
        console.error("[WS] Error in error callback", err);
      }
    });
  }

  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach((cb) => {
      try {
        cb(connected);
      } catch (err) {
        console.error("[WS] Error in connection callback", err);
      }
    });
  }
}

// ===========================================================
//                   SINGLETON ACCESS
// Survives HMR in development by storing on globalThis.
// ===========================================================

declare global {
  // eslint-disable-next-line no-var
  var __oikos_ws: WebSocketService | undefined;
}

export function getWebSocketService(): WebSocketService {
  if (!globalThis.__oikos_ws) {
    globalThis.__oikos_ws = new WebSocketService();
  }
  return globalThis.__oikos_ws;
}

export type { WebSocketService };
