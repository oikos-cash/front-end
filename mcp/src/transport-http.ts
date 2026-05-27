/**
 * Agent-side custom MCP transport that goes over our HTTP bridge:
 *
 *   client.send(jsonRpcFrame)  →  POST <baseUrl>/request
 *                              ←  long-poll JSON-RPC response
 *
 * Each `send()` is its own POST. The server is React-mounted in the
 * host page and replies via /respond on the bridge, which unblocks
 * our pending fetch. No persistent socket — every JSON-RPC frame is
 * its own round-trip.
 *
 * (MCP's Transport interface expects an event-emitter-style message
 * channel. We adapt by attaching the response from each POST as an
 * onmessage event.)
 */

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export interface HttpBridgeTransportOptions {
  /** Base URL of the bridge, e.g.
   *  `https://staging.oikos.cash/api/ui-mcp/<sessionId>`. */
  baseUrl: string;
  /** Per-request timeout. */
  timeoutMs?: number;
}

export class HttpBridgeTransport implements Transport {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private closed = false;

  onmessage: ((message: JSONRPCMessage) => void) | undefined;
  onclose: (() => void) | undefined;
  onerror: ((error: Error) => void) | undefined;

  constructor(options: HttpBridgeTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  /** No persistent connection to open. The bridge accepts any /request
   *  POST at any time; the page replies via /respond. */
  async start(): Promise<void> {
    /* no-op */
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error("HttpBridgeTransport is closed");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`ui-mcp bridge HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const body = (await res.json()) as JSONRPCMessage | null;
      // Notifications (no id) get no response; the server might return
      // an empty body. Don't synthesize a message for those.
      if (body && typeof body === "object") {
        this.onmessage?.(body);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.onerror?.(e);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }
}
