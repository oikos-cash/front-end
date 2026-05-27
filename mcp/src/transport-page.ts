/**
 * Page-side MCP transport.
 *
 * The MCP SDK's Server expects a Transport that:
 *   - Delivers incoming JSON-RPC frames via `onmessage(frame)`.
 *   - Lets the server emit outgoing frames via `send(frame)`.
 *
 * On the page we don't own a socket — the bridge does. The hook holds
 * the SSE EventSource and, for each event, calls `deliver(frame)` on
 * this transport to feed the server. The server's `send()` invokes a
 * `write` callback the hook wires to a POST to /respond.
 *
 * Pair with `HttpBridgeTransport` (agent-side). Both go over the same
 * /api/ui-mcp/<sid>/{request,pending,respond} routes.
 */

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export interface PageBridgeTransportOptions {
  /** Called for every outbound frame the server emits. The hook wires
   *  this to a POST to /respond. */
  write: (message: JSONRPCMessage) => void | Promise<void>;
}

export class PageBridgeTransport implements Transport {
  private readonly write: PageBridgeTransportOptions["write"];
  private closed = false;

  onmessage: ((message: JSONRPCMessage) => void) | undefined;
  onclose: (() => void) | undefined;
  onerror: ((error: Error) => void) | undefined;

  constructor(opts: PageBridgeTransportOptions) {
    this.write = opts.write;
  }

  async start(): Promise<void> {
    /* no-op — the SSE stream is owned by the hook */
  }

  /** Called externally (from the hook) when an SSE event arrives. */
  deliver(message: JSONRPCMessage): void {
    if (this.closed) return;
    this.onmessage?.(message);
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error("PageBridgeTransport is closed");
    }
    try {
      await this.write(message);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.onerror?.(e);
      throw e;
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }
}
