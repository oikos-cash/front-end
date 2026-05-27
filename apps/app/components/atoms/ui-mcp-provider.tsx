"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useUiMcpServer } from "@/hooks/use-ui-mcp-server";

/**
 * Per-tab ui-mcp session id, lifted to the root layout so the
 * useUiMcpServer hook stays mounted across route changes. Without
 * this, navigating from /terminal to /swap would unmount the hook
 * along with the page — defeating the whole reason for the bridge
 * (driving UI on routes the agent navigates to).
 *
 * AgentShell pulls the same id out of context to set OIKOS_UI_MCP_URL
 * in the in-container agent's env. Same session = both sides agree on
 * which queue to talk to.
 */

interface UiMcpContextValue {
  sessionId: string;
}

const UiMcpContext = createContext<UiMcpContextValue | null>(null);

export function useUiMcpSession(): string {
  const v = useContext(UiMcpContext);
  if (!v) {
    throw new Error("useUiMcpSession must be called inside <UiMcpProvider>");
  }
  return v.sessionId;
}

export default function UiMcpProvider({ children }: { children: ReactNode }) {
  // One session per page load. Stable across navigation since the
  // provider lives in the persistent root layout.
  const sessionId = useMemo(
    () =>
      `uimcp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
    [],
  );

  // Mount the server here so it survives route changes and can see
  // every page-side consumer (modal, swap form, markets catalog) that
  // syncs through the ui-bridge store.
  useUiMcpServer({ sessionId });

  const value = useMemo(() => ({ sessionId }), [sessionId]);

  return <UiMcpContext.Provider value={value}>{children}</UiMcpContext.Provider>;
}
