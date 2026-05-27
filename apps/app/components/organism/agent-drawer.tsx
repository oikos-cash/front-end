"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

import { useAgentDrawerStore } from "@/lib/agent-drawer-store";
import { useWallet } from "@/stores/wallet";
import { WEBCONTAINER_BACKEND, WEBCONTAINER_WS_URL } from "@/types/constants";

// Mirrors TerminalTemplate: xterm touches window at module load, so we
// keep both shells client-only.
const SHELL_LOADER = (
  <div className="size-full animate-pulse bg-card/60" />
);

const AgentShell = dynamic(
  () => import("@/components/organism/agent-shell"),
  { ssr: false, loading: () => SHELL_LOADER },
);

const TerminalShell = dynamic(
  () => import("@/components/organism/terminal-shell"),
  { ssr: false, loading: () => SHELL_LOADER },
);

const OSS_DEFAULT_COMMAND = [
  "node",
  "./agent-entry-server.mjs",
  "auth",
  "status",
];

function DrawerBody(): React.ReactElement {
  const { isConnected } = useWallet();
  const configured =
    WEBCONTAINER_BACKEND === "stackblitz" ? true : !!WEBCONTAINER_WS_URL;

  if (!configured) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Terminal backend isn&apos;t configured for this build.
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Connect your wallet from the header to use the agent.
      </div>
    );
  }

  return WEBCONTAINER_BACKEND === "stackblitz" ? (
    <AgentShell embedded />
  ) : (
    <TerminalShell command={OSS_DEFAULT_COMMAND} />
  );
}

export default function AgentDrawer(): React.ReactElement {
  const open = useAgentDrawerStore((s) => s.open);
  const height = useAgentDrawerStore((s) => s.height);
  const maximized = useAgentDrawerStore((s) => s.maximized);
  const mountedEver = useAgentDrawerStore((s) => s.mountedEver);
  const setOpen = useAgentDrawerStore((s) => s.setOpen);
  const setHeight = useAgentDrawerStore((s) => s.setHeight);
  const setMaximized = useAgentDrawerStore((s) => s.setMaximized);

  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(
    null,
  );

  const onDragMove = useCallback(
    (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const delta = state.startY - event.clientY;
      setHeight(state.startHeight + delta);
    },
    [setHeight],
  );

  const onDragEnd = useCallback(() => {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, [onDragMove]);

  const onDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (maximized) return;
      event.preventDefault();
      dragStateRef.current = { startY: event.clientY, startHeight: height };
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", onDragEnd);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";
    },
    [height, maximized, onDragEnd, onDragMove],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragEnd);
    };
  }, [onDragEnd, onDragMove]);

  // Keep the drawer rendered (even when hidden) once mountedEver is true,
  // so the iframe never unmounts. translate-y, not display:none — vaul-
  // style display removal kills the iframe paint context.
  const renderBody = mountedEver;

  return (
    <div
      aria-hidden={!open}
      className={[
        "fixed inset-x-0 bottom-0 z-40 flex flex-col",
        "border-t border-border/60 bg-background shadow-2xl",
        "transition-transform duration-200 ease-out",
        open ? "translate-y-0" : "translate-y-full pointer-events-none",
      ].join(" ")}
      style={{ height: maximized ? "100vh" : `${height}px` }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={onDragStart}
        className={[
          "group relative h-2 w-full shrink-0",
          maximized ? "cursor-default" : "cursor-ns-resize",
        ].join(" ")}
      >
        <span className="absolute left-1/2 top-1 h-1 w-12 -translate-x-1/2 rounded-full bg-border/60 transition-colors group-hover:bg-border" />
      </div>

      <header className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-1.5">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.7)]"
          />
          <span className="eyebrow-strong text-xs">Agent</span>
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMaximized(!maximized)}
            aria-label={maximized ? "Restore drawer" : "Maximize drawer"}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {maximized ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close drawer"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {renderBody ? <DrawerBody /> : null}
      </div>
    </div>
  );
}
