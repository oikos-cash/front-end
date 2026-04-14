import type {
  WSPriceUpdate,
  WSStatsUpdate,
  WSOHLCUpdate,
  WSBlockchainEvent,
  WSLoanEvent,
  WSChannel,
  WSMessageCallback,
} from "@/types/interfaces";

import {
  WS_URL,
  WS_PING_INTERVAL,
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_RECONNECT_BASE_DELAY,
} from "@/types/constants";

type ErrorCallback = (error: string) => void;
type ConnectionCallback = (connected: boolean) => void;

/**
 * Unified WebSocket service for real-time data.
 *
 * Handles two concerns from the old project:
 * - priceWebSocketService (price, stats, ohlc channels)
 * - websocketService (blockchain events: Swap, Mint, Burn, Collect, Flash)
 *
 * Singleton pattern — use `getWebSocketService()` to access.
 */
class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private subscriptions = new Set<string>();

  // Price feed callbacks
  private priceCallbacks = new Set<WSMessageCallback<WSPriceUpdate>>();
  private statsCallbacks = new Set<WSMessageCallback<WSStatsUpdate>>();
  private ohlcCallbacks = new Set<WSMessageCallback<WSOHLCUpdate>>();

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
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.startPing();
          this.notifyConnection(true);
          resolve();
        };

        this.ws.onclose = () => {
          this.stopPing();
          this.notifyConnection(false);
          this.attemptReconnect();
        };

        this.ws.onerror = (err) => {
          console.error("[WS] Connection error", err);
          this.notifyError("WebSocket connection error");
          reject(err);
        };

        this.ws.onmessage = (event) => {
          try {
            this.handleMessage(JSON.parse(event.data));
          } catch {
            console.error("[WS] Failed to parse message");
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.notifyConnection(false);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ===========================================================
  //                    SUBSCRIPTIONS
  // ===========================================================

  subscribe(
    channel: WSChannel,
    poolAddress: string,
    interval?: string,
  ): void {
    if (!this.isConnected()) {
      console.warn("[WS] Cannot subscribe — not connected");
      return;
    }

    const key = interval
      ? `${channel}:${poolAddress}:${interval}`
      : `${channel}:${poolAddress}`;

    if (this.subscriptions.has(key)) return;
    this.subscriptions.add(key);

    const msg: Record<string, string> = {
      type: "subscribe",
      channel,
      poolAddress,
    };
    if (channel === "ohlc" && interval) msg.interval = interval;

    this.send(msg);
  }

  unsubscribe(
    channel: WSChannel,
    poolAddress: string,
    interval?: string,
  ): void {
    if (!this.isConnected()) return;

    const key = interval
      ? `${channel}:${poolAddress}:${interval}`
      : `${channel}:${poolAddress}`;
    this.subscriptions.delete(key);

    const msg: Record<string, string> = {
      type: "unsubscribe",
      channel,
      poolAddress,
    };
    if (channel === "ohlc" && interval) msg.interval = interval;

    this.send(msg);
  }

  // ===========================================================
  //                CALLBACK REGISTRATION
  // Returns an unsubscribe function for cleanup.
  // ===========================================================

  onPrice(cb: WSMessageCallback<WSPriceUpdate>): () => void {
    this.priceCallbacks.add(cb);
    return () => this.priceCallbacks.delete(cb);
  }

  onStats(cb: WSMessageCallback<WSStatsUpdate>): () => void {
    this.statsCallbacks.add(cb);
    return () => this.statsCallbacks.delete(cb);
  }

  onOhlc(cb: WSMessageCallback<WSOHLCUpdate>): () => void {
    this.ohlcCallbacks.add(cb);
    return () => this.ohlcCallbacks.delete(cb);
  }

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

  private handleMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case "price":
        this.notify(this.priceCallbacks, {
          poolAddress: msg.poolAddress as string,
          price: msg.price as number,
          timestamp: msg.timestamp as number,
        });
        break;

      case "stats":
        this.notify(this.statsCallbacks, {
          poolAddress: msg.poolAddress as string,
          data: msg.data as WSStatsUpdate["data"],
        });
        break;

      case "ohlc":
        this.notify(this.ohlcCallbacks, {
          poolAddress: msg.poolAddress as string,
          data: msg.data as WSOHLCUpdate["data"],
          timestamp: msg.timestamp as number,
        });
        break;

      case "event":
        this.notify(
          this.eventCallbacks,
          msg.data as WSBlockchainEvent,
        );
        break;

      case "loanEvent":
        this.notify(this.loanCallbacks, {
          type: "loanEvent",
          data: msg.data,
        } as WSLoanEvent);
        break;

      case "error":
        this.notifyError((msg.message as string) ?? "Unknown WS error");
        break;

      case "pong":
      case "welcome":
      case "subscribed":
      case "unsubscribed":
        break;

      default:
        break;
    }
  }

  private send(data: Record<string, string>): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(data));
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) this.send({ type: "ping" });
    }, WS_PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
      console.error("[WS] Max reconnection attempts reached");
      return;
    }

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    const delay =
      WS_RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((err) =>
        console.error("[WS] Reconnection failed", err),
      );
    }, delay);
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
