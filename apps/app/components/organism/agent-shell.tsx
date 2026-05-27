"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Terminal, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";

import "@xterm/xterm/css/xterm.css";

import Button from "@/components/atoms/button";

import { useWebContainer } from "@/hooks/use-webcontainer";
import { useWalletBridge } from "@/hooks/use-wallet-bridge";
import { useUiMcpSession } from "@/components/atoms/ui-mcp-provider";
import { API_BASE_URL, WEBCONTAINER_HOST_TUNNEL } from "@/types/constants";

import type { SpawnHandle, WebContainerClient } from "@/services/webcontainer";

/**
 * xterm theme aligned with the Oikos palette. Kept in sync with
 * terminal-shell.tsx — duplicated rather than shared because xterm reads
 * the theme literal once at construction.
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

const WORKDIR_NAME = "oikos-agent";
const HOME_DIR = `/home/${WORKDIR_NAME}`;
const GUEST_FILES = [
  "agent-entry.mjs",
  "agent.bundle.mjs",
  "mcp-server.bundle.mjs",
] as const;
const SIGNIN_SENTINEL = "Not signed in to Dyspel";
// Cap the rolling stdout capture so long sessions don't grow without
// bound — we only need recent state to spot the sign-in sentinel.
const CAPTURE_CAP_BYTES = 16 * 1024;

type Phase =
  | "booting"
  | "mounting"
  | "running"
  | "needs-auth"
  | "signing-in"
  | "exited"
  | "lost";

interface AgentShellProps {
  /** Status banner label override; defaults to "Agent". */
  label?: string;
  /** When true, the shell fills its parent (no rounded card chrome,
   * no fixed height). The bottom-bar drawer uses this so its own
   * frame governs the dimensions. */
  embedded?: boolean;
}

/**
 * Boots the oikos-agent CLI inside a (StackBlitz) WebContainer:
 *   1. Mount the three guest bundles into /home/oikos-agent.
 *   2. Spawn `node ./agent-entry.mjs`.
 *   3. If the run prints "Not signed in to Dyspel", surface a Sign-In
 *      button. On click, respawn with `auth login` (the agent prints a
 *      device-grant URL into xterm; WebLinksAddon makes it clickable),
 *      then respawn the REPL once that exits 0.
 *
 * The full reference implementation lives at
 * `/data2/code/Oikos/agent-wasm/src/host/main.ts`; this is the same
 * choreography ported into the React shape.
 */
export default function AgentShell({
  label = "Agent",
  embedded = false,
}: AgentShellProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const handleRef = useRef<SpawnHandle | null>(null);
  const dataSubRef = useRef<{ dispose: () => void } | null>(null);
  const captureRef = useRef("");
  const mountedAssetsRef = useRef(false);
  const bootGuardRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("booting");
  const [statusMsg, setStatusMsg] = useState<string>("booting kernel…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // One bridge session per AgentShell mount. The agent process gets
  // ${tunnel}/api/wallet-bridge/<sessionId> in its env; useWalletBridge
  // subscribes to the same id from this React tree, so signing
  // requests from the in-container ethers Signer round-trip back here
  // and pop MetaMask via wagmi.
  const bridgeSessionId = useMemo(
    () => `bridge_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
    [],
  );
  useWalletBridge({ sessionId: bridgeSessionId });

  // UI-MCP session lives at the root layout (UiMcpProvider) so the
  // server survives across route changes — the agent will navigate
  // the user to /swap, /markets, etc., and the bridge has to keep
  // talking. AgentShell only needs the id here to plumb it into the
  // agent's env so both sides agree on the same queue.
  const uiMcpSessionId = useUiMcpSession();

  const { client, isConnected } = useWebContainer({
    backend: "stackblitz",
    workdirName: WORKDIR_NAME,
  });

  // Bootstrap the xterm instance once; survives client churn.
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

    term.writeln("\x1b[36m▶ oikos-agent · WebContainer host\x1b[0m");
    term.writeln("  Booting kernel…");

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        const h = handleRef.current;
        if (h && term.cols && term.rows) h.resize(term.cols, term.rows);
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

  // Track lost-connection state.
  useEffect(() => {
    if (
      (phase === "running" ||
        phase === "needs-auth" ||
        phase === "signing-in") &&
      !isConnected
    ) {
      setPhase("lost");
      setStatusMsg("connection lost");
    }
  }, [isConnected, phase]);

  /**
   * Spawn one agent invocation, fan stdout to both xterm and a rolling
   * capture buffer (so callers can pattern-match on sentinels), and
   * resolve with the exit code + captured tail.
   */
  const runAgent = useCallback(
    async (
      c: WebContainerClient,
      args: string[],
    ): Promise<{ code: number; output: string }> => {
      const term = termRef.current!;
      captureRef.current = "";
      const decoder = new TextDecoder();

      const handle = await c.spawn({
        command: ["node", "./agent-entry.mjs", ...args],
        cols: term.cols,
        rows: term.rows,
        env: agentEnv(bridgeSessionId, uiMcpSessionId),
      });
      handleRef.current = handle;

      const cleanups: Array<() => void> = [];
      const exitPromise = new Promise<{ code: number; signal: string | null }>(
        (resolve) => {
          cleanups.push(
            c.onExit(handle.pid, (code, signal) => {
              resolve({ code, signal });
            }),
          );
        },
      );
      cleanups.push(
        c.onOutput(handle.pid, (chunk) => {
          const text = decoder.decode(chunk, { stream: true });
          term.write(text);
          captureRef.current = (captureRef.current + text).slice(
            -CAPTURE_CAP_BYTES,
          );
          // Auto-open the Dyspel device-grant URL on first sighting.
          // The terminal can clip its bottom rows on smaller windows
          // (Windows taskbar etc.), making WebLinksAddon's hit-test
          // useless because the line is below the fold. Detect the
          // URL ourselves and window.open() so the user never has to
          // hunt for it.
          maybeOpenDeviceGrantUrl(text);
        }),
      );

      const sub = term.onData((data) => handle.writeStdin(data));
      dataSubRef.current = sub;
      cleanups.push(() => sub.dispose());

      const { code } = await exitPromise;
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
      dataSubRef.current = null;
      handleRef.current = null;
      return { code, output: captureRef.current };
    },
    [bridgeSessionId, uiMcpSessionId],
  );

  // Drive the boot → mount → spawn pipeline once the client is live.
  useEffect(() => {
    if (!client || !isConnected) return;
    if (bootGuardRef.current) return;
    bootGuardRef.current = true;

    let cancelled = false;

    (async () => {
      const term = termRef.current!;
      try {
        // ─── mount guest bundle (idempotent) ───────────────────────────
        if (!mountedAssetsRef.current) {
          setPhase("mounting");
          setStatusMsg("mounting guest bundle…");

          // StackBlitz's fs.* API operates on a workdir-rooted virtual
          // tree: writes to `/foo` land at `<workdir>/foo` on the real
          // FS that spawned processes see. So we write bare names here
          // — no `/home/oikos-agent/` prefix, no mkdir needed.

          term.writeln("  Fetching guest assets…");
          const tf = performance.now();
          const fetched = await Promise.all(
            GUEST_FILES.map(async (name) => {
              const r = await fetch(`/guest/${name}`);
              if (!r.ok) throw new Error(`/guest/${name} → ${r.status}`);
              return { name, contents: await r.text() };
            }),
          );
          term.write(
            `\r\x1b[K  ✓ all assets fetched (${(
              performance.now() - tf
            ).toFixed(0)}ms)\r\n`,
          );

          for (const { name, contents } of fetched) {
            const mb = (contents.length / 1024 / 1024).toFixed(2);
            term.write(`  Writing ${name} (${mb} MiB)…`);
            await new Promise((res) => setTimeout(res, 0));
            const t0 = performance.now();
            await client.writeFile(`/${name}`, contents);
            term.write(
              `\r\x1b[K  ✓ ${name} written in ${(
                performance.now() - t0
              ).toFixed(0)}ms\r\n`,
            );
          }
          mountedAssetsRef.current = true;
          term.writeln("\x1b[32m✓ guest bundle mounted\x1b[0m");
        }

        if (cancelled) return;

        // ─── first run: try REPL, watch for sign-in sentinel ──────────
        setPhase("running");
        setStatusMsg("agent running");
        term.writeln("  Spawning oikos-agent…");
        const first = await runAgent(client, []);
        if (cancelled) return;

        if (first.code === 0) {
          setPhase("exited");
          setStatusMsg("agent exited");
          return;
        }
        if (first.output.includes(SIGNIN_SENTINEL)) {
          term.writeln("");
          term.writeln(
            '\x1b[33mℹ Click "Sign in to Dyspel" above to authenticate.\x1b[0m',
          );
          setPhase("needs-auth");
          setStatusMsg("sign-in required");
          return;
        }
        setPhase("exited");
        setStatusMsg(`exited ${first.code}`);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
        setPhase("exited");
        setStatusMsg("boot failed");
        term.writeln(`\r\n\x1b[31m✗ ${msg}\x1b[0m`);
      }
    })();

    return () => {
      cancelled = true;
      const h = handleRef.current;
      if (h) {
        try {
          h.kill();
        } catch {
          /* ignore */
        }
        handleRef.current = null;
      }
      dataSubRef.current?.dispose();
      dataSubRef.current = null;
      // Allow re-bootstrap on next live client.
      bootGuardRef.current = false;
    };
  }, [client, isConnected, runAgent]);

  const handleSignIn = useCallback(async () => {
    if (!client || phase !== "needs-auth") return;
    const term = termRef.current;
    if (!term) return;
    setPhase("signing-in");
    setStatusMsg("signing in…");
    term.writeln("");
    term.writeln("\x1b[36m▶ running: oikos-agent auth login\x1b[0m");

    try {
      const r = await runAgent(client, ["auth", "login"]);
      if (r.code !== 0) {
        setPhase("needs-auth");
        setStatusMsg(`login failed (${r.code})`);
        return;
      }
      term.writeln("\x1b[32m✓ signed in\x1b[0m");
      setPhase("running");
      setStatusMsg("agent running");
      const repl = await runAgent(client, []);
      setPhase("exited");
      setStatusMsg(repl.code === 0 ? "agent exited" : `exited ${repl.code}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setPhase("needs-auth");
      setStatusMsg("login failed");
    }
  }, [client, phase, runAgent]);

  const statusKind = statusKindFor(phase);

  return (
    <div
      className={[
        "relative flex w-full flex-col overflow-hidden bg-card",
        embedded
          ? "h-full"
          : "h-[min(60vh,640px)] min-h-[320px] rounded-xl border border-border/60 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_18px_50px_-24px_rgba(0,0,0,0.75)]",
      ].join(" ")}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.7)]"
          />
          <span className="eyebrow-strong">{label} · StackBlitz</span>
        </span>
        <span className="flex items-center gap-2">
          {phase === "needs-auth" && (
            <Button variant="default" size="sm" onClick={handleSignIn}>
              Sign in to Dyspel
            </Button>
          )}
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em]",
              statusKind === "ok"
                ? "border-success/35 bg-success/10 text-success"
                : statusKind === "warn"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : statusKind === "err"
                    ? "border-destructive/35 bg-destructive/10 text-destructive"
                    : "border-border/70 bg-muted/30 text-muted-foreground",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={[
                "block size-1 rounded-full",
                statusKind === "ok"
                  ? "bg-success shadow-[0_0_6px_currentColor]"
                  : statusKind === "warn"
                    ? "bg-primary"
                    : statusKind === "err"
                      ? "bg-destructive"
                      : "bg-muted-foreground/60",
              ].join(" ")}
            />
            {statusMsg}
          </span>
        </span>
      </header>
      <div className="flex-1 px-2 pt-2" ref={hostRef} />
      {errorMsg && (
        <p className="border-t border-border/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

// Tracks user_codes we've already popped a tab for in this page lifetime
// so a redraw / repeated stdout chunk doesn't open the same URL twice.
const openedDeviceCodes = new Set<string>();

/**
 * Scan a stdout chunk for the Dyspel device-grant URL and open it in
 * a new tab on first sighting. Matches user_codes of the shape
 * `XXXX-XXXX` (uppercase alphanumerics + hyphen).
 *
 * Why: the terminal's fixed height (h-[min(70vh,640px)]) can clip its
 * bottom rows on smaller windows / when the OS taskbar takes vertical
 * space, dropping the URL below the visible viewport. WebLinksAddon
 * makes it clickable but you have to find it first.
 */
function maybeOpenDeviceGrantUrl(text: string): void {
  if (typeof window === "undefined") return;
  const re = /https?:\/\/[^\s]*\/auth\/device\.html\?user_code=([A-Z0-9-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const code = match[1];
    if (openedDeviceCodes.has(code)) continue;
    openedDeviceCodes.add(code);
    // noopener so the new tab can't reach back into our page.
    window.open(match[0], "_blank", "noopener,noreferrer");
  }
}

function statusKindFor(phase: Phase): "" | "ok" | "warn" | "err" {
  switch (phase) {
    case "running":
      return "ok";
    case "needs-auth":
    case "signing-in":
    case "mounting":
      return "warn";
    case "exited":
      return "";
    case "lost":
      return "err";
    case "booting":
    default:
      return "";
  }
}

function agentEnv(
  bridgeSessionId: string,
  uiMcpSessionId: string,
): Record<string, string> {
  return {
    OIKOS_AGENT_PROVIDER: "dyspel",
    OIKOS_MCP_COMMAND: "node",
    OIKOS_MCP_ARGS: "./mcp-server.bundle.mjs",
    OIKOS_CHAIN_ID: "56",
    // OIKOS_DRY_RUN intentionally set to "false" in remote-signer mode:
    // the user's MetaMask is the per-transaction gatekeeper, and
    // dry-run short-circuits the SDK before it ever reaches the
    // signer (so MetaMask would never pop). The user can still reject
    // any tx in the wallet UI.
    OIKOS_DRY_RUN: WEBCONTAINER_HOST_TUNNEL ? "false" : "true",
    // Point the SDK at the same Oikos backend the page uses for
    // /vaults, /api/tokens, etc. The SDK's hardcoded default is a
    // different host that doesn't expose those endpoints, which is
    // why `oikos_get_all_markets` was coming back empty.
    ...(API_BASE_URL ? { OIKOS_API_URL: API_BASE_URL } : {}),
    DYSPEL_BACKEND_URL: "https://stg-app.dyspel.xyz",
    DYSPEL_NO_BROWSER: "1",
    HOME: HOME_DIR,
    NODE_NO_WARNINGS: "1",
    TERM: "xterm-256color",
    FORCE_COLOR: "1",
    // The agent's fetch-shim rewrites backend calls through
    // ${OIKOS_HOST_ORIGIN}/dyspel/* when set. StackBlitz's container
    // outbound IPs are Cloudflare-bot-flagged on POST, so the auth
    // flow (device/code is POST) only succeeds when routed via a
    // tunnel pointing at our /dyspel/* proxy. Leave empty to let the
    // container hit dyspel.xyz directly (GET-only paths only).
    //
    // Set NEXT_PUBLIC_WEBCONTAINER_HOST_TUNNEL to e.g.
    // `https://abc-123.ngrok-free.app` to enable.
    ...(WEBCONTAINER_HOST_TUNNEL
      ? {
          OIKOS_HOST_ORIGIN: WEBCONTAINER_HOST_TUNNEL,
          // Bridge URL the agent's mcp-sdk RemoteSigner posts to. Same
          // tunnel hostname, different path. See use-wallet-bridge.ts
          // for the host-side handler.
          OIKOS_REMOTE_SIGNER_URL: `${WEBCONTAINER_HOST_TUNNEL}/api/wallet-bridge/${bridgeSessionId}`,
          // Bridge URL for the in-process UI MCP server. The agent's
          // MCPRegistry picks this up via cli.ts and registers an `ui`
          // server backed by MCPHttpClient. See use-ui-mcp-server.ts.
          OIKOS_UI_MCP_URL: `${WEBCONTAINER_HOST_TUNNEL}/api/ui-mcp/${uiMcpSessionId}`,
        }
      : {}),
  };
}
