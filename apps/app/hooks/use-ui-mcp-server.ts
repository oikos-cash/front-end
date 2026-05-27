"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useChainId } from "wagmi";

import {
  createUiMcpServer,
  PageBridgeTransport,
  type UiContext,
  type ModalName,
  type SwapFormState,
  type VisibleMarket,
} from "@oikos/ui-mcp";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

/**
 * Mounts an in-page MCP server bound to the React tree's router /
 * wagmi / modal / form state, exposing it over the /api/ui-mcp/<sid>
 * bridge to the in-WebContainer agent.
 *
 * Surface is driven by `UiContext`. The hook builds that context once
 * per render with ref-stable handles — handlers always see the latest
 * React state without re-registering tools.
 *
 * Phase 1 wires router + account + minimal stubs for modals/swap/markets
 * (so the read tools can return at least an empty/null shape). Phase 2
 * will plug those stubs into the real form/modal stores.
 */

export interface UseUiMcpServerOptions {
  /** Bridge session id (must match the OIKOS_UI_MCP_URL the agent gets). */
  sessionId: string;
  /** Disable wiring without unmounting the consumer. */
  enabled?: boolean;
}

interface UiMcpDeps {
  pathname: string;
  push: (path: string) => void | Promise<void>;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
}

function noopContextExtensions(): Pick<UiContext, "modals" | "swap" | "markets"> {
  // Phase-1 stubs: the read tools have to return *something*, so we
  // hand back the dormant shape. Phase 2 swaps these for real store
  // wiring (modals slice, swap form atoms, markets selector).
  return {
    modals: {
      getActive: () => null as ModalName | null,
      open: () => {
        throw new Error("ui-mcp: modal control lands in Phase 2");
      },
      close: () => {
        throw new Error("ui-mcp: modal control lands in Phase 2");
      },
    },
    swap: {
      getState: (): SwapFormState => ({
        sellToken: null,
        buyToken: null,
        amount: null,
        slippageBps: null,
      }),
      set: () => {
        throw new Error("ui-mcp: swap form writes land in Phase 2");
      },
      submit: () => {
        throw new Error("ui-mcp: swap submit lands in Phase 3");
      },
    },
    markets: {
      getVisible: (): VisibleMarket[] => [],
      select: async () => {
        throw new Error("ui-mcp: market select lands in Phase 2");
      },
    },
  };
}

export function useUiMcpServer({
  sessionId,
  enabled = true,
}: UseUiMcpServerOptions): void {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Refs that the long-lived MCP handlers read at call time, so we
  // never need to tear down + re-register the server on every render.
  const depsRef = useRef<UiMcpDeps>({
    pathname: pathname ?? "/",
    push: (p: string) => router.push(p),
    address: (address as string | undefined) ?? null,
    chainId: chainId ?? null,
    isConnected,
  });

  useEffect(() => {
    depsRef.current = {
      pathname: pathname ?? "/",
      push: (p: string) => router.push(p),
      address: (address as string | undefined) ?? null,
      chainId: chainId ?? null,
      isConnected,
    };
  }, [pathname, router, address, chainId, isConnected]);

  // Build the UiContext once. Each accessor closes over depsRef so it
  // always sees current state.
  const context = useMemo<UiContext>(() => {
    return {
      router: {
        getPath: () => depsRef.current.pathname,
        push: async (path) => {
          await depsRef.current.push(path);
          // next/navigation's router.push is fire-and-forget; we can't
          // synchronously confirm the route landed. The pathname will
          // update on the next render — we settle by awaiting one
          // microtask so a subsequent get_route call from the agent
          // sees the new value in the common case. (For SPA-internal
          // pushes the layout swap happens within a few ms.)
          await new Promise((res) => setTimeout(res, 0));
        },
      },
      account: {
        getAddress: () => depsRef.current.address,
        getChainId: () => depsRef.current.chainId,
        isConnected: () => depsRef.current.isConnected,
        promptConnect: async () => {
          // The wallet panel is opened via the existing wallet store
          // elsewhere; Phase-2 wiring will route through there. For now
          // a no-op is safer than guessing the API.
          throw new Error("ui-mcp: promptConnect lands in Phase 2");
        },
      },
      ...noopContextExtensions(),
    };
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const abort = new AbortController();
    let server: ReturnType<typeof createUiMcpServer> | null = null;
    let transport: PageBridgeTransport | null = null;
    let es: EventSource | null = null;

    (async () => {
      // POST every outgoing response frame to /respond. The bridge
      // routes it back to the agent's awaiting long-poll on /request.
      const write = async (msg: JSONRPCMessage) => {
        try {
          await fetch(
            `/api/ui-mcp/${encodeURIComponent(sessionId)}/respond`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(msg),
              signal: abort.signal,
            },
          );
        } catch {
          // Swallow — agent will time out and retry. Nothing useful to
          // recover here.
        }
      };

      transport = new PageBridgeTransport({ write });
      server = createUiMcpServer({ context });
      await server.connect(transport);

      // Subscribe to incoming agent requests over SSE.
      const url = `/api/ui-mcp/${encodeURIComponent(sessionId)}/pending`;
      es = new EventSource(url, { withCredentials: false });
      es.addEventListener("request", (ev) => {
        let frame: JSONRPCMessage;
        try {
          frame = JSON.parse((ev as MessageEvent).data) as JSONRPCMessage;
        } catch {
          return;
        }
        transport?.deliver(frame);
      });
      es.addEventListener("error", () => {
        // EventSource auto-reconnects. Nothing to do.
      });
    })();

    return () => {
      abort.abort();
      es?.close();
      es = null;
      void server?.close();
      server = null;
      void transport?.close();
      transport = null;
    };
  }, [enabled, sessionId, context]);
}
