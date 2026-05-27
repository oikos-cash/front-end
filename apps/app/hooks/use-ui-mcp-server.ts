"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import {
  createUiMcpServer,
  PageBridgeTransport,
  type UiContext,
  type ModalName,
  type SwapFormState,
} from "@oikos/ui-mcp";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

import { useUiBridgeStore } from "@/stores/ui-bridge";

/**
 * Mounts an in-page MCP server bound to the React tree's router /
 * wagmi / modal / form state, exposing it over the /api/ui-mcp/<sid>
 * bridge to the in-WebContainer agent.
 *
 * UiContext is bound to two layers:
 *
 *   1. Globally-addressable surfaces (router, wagmi, rainbow-kit
 *      connect modal) — direct calls.
 *
 *   2. Page-local surfaces (modals, swap form, markets) — routed
 *      through the ui-bridge Zustand store. The hook writes a
 *      request; page-side consumers (HedgeModal owner, swap form,
 *      MarketsCatalog) subscribe to the relevant slice and react.
 *
 * Refs hold the latest external state (router, wagmi) so the
 * long-lived MCP handlers always see current values without
 * re-registering tools across renders.
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
  openConnectModal: (() => void) | undefined;
}

export function useUiMcpServer({
  sessionId,
  enabled = true,
}: UseUiMcpServerOptions): void {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();

  // Refs that the long-lived MCP handlers read at call time, so we
  // never need to tear down + re-register the server on every render.
  const depsRef = useRef<UiMcpDeps>({
    pathname: pathname ?? "/",
    push: (p: string) => router.push(p),
    address: (address as string | undefined) ?? null,
    chainId: chainId ?? null,
    isConnected,
    openConnectModal,
  });

  useEffect(() => {
    depsRef.current = {
      pathname: pathname ?? "/",
      push: (p: string) => router.push(p),
      address: (address as string | undefined) ?? null,
      chainId: chainId ?? null,
      isConnected,
      openConnectModal,
    };
  }, [pathname, router, address, chainId, isConnected, openConnectModal]);

  // Build the UiContext once. Each accessor closes over depsRef
  // (current external state) and / or the ui-bridge store (page-local
  // state via Zustand). Store reads use `.getState()` so we don't tie
  // tool handlers to render cycles.
  const context = useMemo<UiContext>(() => {
    return {
      router: {
        getPath: () => depsRef.current.pathname,
        push: async (path) => {
          await depsRef.current.push(path);
          // next/navigation's router.push is fire-and-forget; settle
          // by awaiting one microtask so a subsequent get_route call
          // sees the new pathname in the common case.
          await new Promise((res) => setTimeout(res, 0));
        },
      },
      account: {
        getAddress: () => depsRef.current.address,
        getChainId: () => depsRef.current.chainId,
        isConnected: () => depsRef.current.isConnected,
        promptConnect: async () => {
          const open = depsRef.current.openConnectModal;
          if (!open) {
            throw new Error(
              "promptConnect: rainbow-kit connect modal not available " +
                "(already connected, or wallet UI not yet mounted)",
            );
          }
          open();
          // The connect modal is fire-and-forget — rainbow-kit doesn't
          // surface a settle promise. Tool returns immediately;
          // subsequent `get_connected_account` calls will reflect the
          // outcome once the user closes the modal.
        },
      },
      modals: {
        getActive: (): ModalName | null =>
          useUiBridgeStore.getState().activeModal,
        open: (name, props) =>
          useUiBridgeStore.getState().requestModal(name, props),
        close: () => useUiBridgeStore.getState().requestCloseModal(),
      },
      swap: {
        getState: (): SwapFormState =>
          useUiBridgeStore.getState().swapFormState ?? {
            sellToken: null,
            buyToken: null,
            amount: null,
            slippageBps: null,
          },
        set: (partial) =>
          useUiBridgeStore.getState().requestSetSwapForm(partial),
        submit: () => useUiBridgeStore.getState().requestSubmitSwap(),
      },
      markets: {
        getVisible: () => useUiBridgeStore.getState().visibleMarkets,
        select: (symbol) =>
          useUiBridgeStore.getState().requestSelectMarket(symbol),
      },
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
