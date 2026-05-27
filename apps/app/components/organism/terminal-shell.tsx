"use client";

import { useEffect, useRef, useState } from "react";

import { Terminal, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";

import "@xterm/xterm/css/xterm.css";

import { useWebContainer } from "@/hooks/use-webcontainer";
import { WEBCONTAINER_BACKEND, WEBCONTAINER_WS_URL } from "@/types/constants";

import type { SpawnHandle } from "@/services/webcontainer";

const BACKEND_LABEL: Record<typeof WEBCONTAINER_BACKEND, string> = {
  oss: "WC-OSS",
  stackblitz: "StackBlitz",
};

/**
 * xterm theme aligned with the Oikos palette. xterm injects its own
 * CSS at runtime and doesn't read CSS variables, so the colours have
 * to be passed as literals.
 */
const OIKOS_XTERM_THEME: ITheme = {
  background: "#0a0a0c",
  foreground: "#e6e8f5",
  cursor: "#f5c843",
  cursorAccent: "#1a1300",
  selectionBackground: "rgba(245, 200, 67, 0.25)",
  selectionForeground: "#e6e8f5",
  black: "#0a0a0c",
  red: "#e34f4f",
  green: "#00c897",
  yellow: "#f5c843",
  blue: "#6b8bff",
  magenta: "#b46cff",
  cyan: "#67d8ff",
  white: "#e6e8f5",
  brightBlack: "#9ca0d2",
  brightRed: "#ec6868",
  brightGreen: "#1ad6a3",
  brightYellow: "#f6cf5a",
  brightBlue: "#8aa4ff",
  brightMagenta: "#cf8eff",
  brightCyan: "#8be0ff",
  brightWhite: "#ffffff",
};

/**
 * Renders an xterm.js instance inside its container `<div>` and wires
 * stdin/stdout to a process spawned in the webcontainer-oss RPC. Only
 * mounts on the client (xterm touches `window` at module load); the
 * caller is expected to render this behind a wallet/config gate.
 */
export default function TerminalShell({
  command = ["jsh"],
}: {
  /** Shell command to spawn; defaults to `jsh` (the WC built-in). */
  command?: string[];
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const handleRef = useRef<SpawnHandle | null>(null);
  const [phase, setPhase] = useState<"booting" | "ready" | "lost">("booting");
  const { client, isConnected, error } = useWebContainer({
    // The hook ignores `url` when backend === "stackblitz", but pass
    // it anyway so the OSS path still has it without conditional logic.
    url: WEBCONTAINER_WS_URL || undefined,
  });

  // Boot the xterm instance once, regardless of WS state. Even if the
  // backend never comes up we still want the chrome to render so the
  // user sees what's happening.
  useEffect(() => {
    if (!hostRef.current) return;
    const term = new Terminal({
      fontSize: 13,
      fontFamily:
        "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      theme: OIKOS_XTERM_THEME,
      cursorBlink: true,
      cursorStyle: "block",
      allowTransparency: true,
      scrollback: 5000,
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(hostRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        const handle = handleRef.current;
        if (handle && term.cols && term.rows) {
          handle.resize(term.cols, term.rows);
        }
      } catch {
        /* size 0 during teardown is fine */
      }
    });
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Spawn the shell once the WS is live.
  useEffect(() => {
    const term = termRef.current;
    if (!client || !isConnected || !term) return;

    let cancelled = false;
    let cleanupOutput: (() => void) | null = null;
    let cleanupExit: (() => void) | null = null;
    let cleanupInput: (() => void) | null = null;
    const decoder = new TextDecoder();

    (async () => {
      try {
        const handle = await client.spawn({
          command,
          cols: term.cols,
          rows: term.rows,
        });
        if (cancelled) {
          handle.kill();
          return;
        }
        handleRef.current = handle;
        setPhase("ready");

        cleanupOutput = client.onOutput(handle.pid, (chunk) => {
          term.write(decoder.decode(chunk, { stream: true }));
        });
        cleanupExit = client.onExit(handle.pid, (code, signal) => {
          term.writeln("");
          term.writeln(
            `\x1b[33m[process exited code=${code}${
              signal ? ` signal=${signal}` : ""
            }]\x1b[0m`,
          );
          handleRef.current = null;
        });

        const dataSub = term.onData((data) => {
          handle.writeStdin(data);
        });
        cleanupInput = () => dataSub.dispose();
      } catch (err) {
        if (cancelled) return;
        term.writeln(
          `\x1b[31m[spawn failed: ${
            err instanceof Error ? err.message : String(err)
          }]\x1b[0m`,
        );
      }
    })();

    return () => {
      cancelled = true;
      cleanupOutput?.();
      cleanupExit?.();
      cleanupInput?.();
      const handle = handleRef.current;
      if (handle) {
        handle.kill();
        handleRef.current = null;
      }
    };
  }, [client, isConnected, command]);

  // Surface lost-connection state once we've been connected at least
  // once.
  useEffect(() => {
    if (phase === "ready" && !isConnected) setPhase("lost");
  }, [isConnected, phase]);

  return (
    <div
      className={[
        "relative flex h-[min(70vh,640px)] w-full flex-col overflow-hidden",
        "rounded-xl border border-border/60 bg-card",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_18px_50px_-24px_rgba(0,0,0,0.75)]",
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.7)]"
          />
          <span className="eyebrow-strong">
            Webcontainer · {BACKEND_LABEL[WEBCONTAINER_BACKEND]}
          </span>
        </span>
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em]",
            isConnected
              ? "border-success/35 bg-success/10 text-success"
              : phase === "lost"
                ? "border-destructive/35 bg-destructive/10 text-destructive"
                : "border-border/70 bg-muted/30 text-muted-foreground",
          ].join(" ")}
        >
          <span
            aria-hidden
            className={[
              "block size-1 rounded-full",
              isConnected
                ? "bg-success shadow-[0_0_6px_currentColor]"
                : phase === "lost"
                  ? "bg-destructive"
                  : "bg-muted-foreground/60",
            ].join(" ")}
          />
          {isConnected ? "Online" : phase === "lost" ? "Lost" : "Booting"}
        </span>
      </header>
      <div className="flex-1 px-2 pt-2" ref={hostRef} />
      {error && (
        <p className="border-t border-border/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}
