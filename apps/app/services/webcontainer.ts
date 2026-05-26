/**
 * Minimal thin-client for the webcontainer-oss server-resident RPC
 * protocol. Mirrors enough of the wire format to spawn a process,
 * stream stdin/stdout, propagate resize events, and shut down cleanly.
 *
 * Wire format reference: `/data4/ex-cc/webcontainer-oss/packages/
 * webcontainer/src/remote-protocol.ts`.
 *
 *   • Text WS frames carry plain JSON control traffic.
 *   • Binary WS frames carry [4-byte BE u32 header length][JSON header
 *     bytes][payload bytes] — used for stdin chunks and process output
 *     to avoid base64 bloat.
 *
 * The full `@dyspel/webcontainer` package adds VFS mounting, multi-
 * process orchestration, file I/O, etc. We don't need any of that for
 * the v1 terminal spike, so we ship a self-contained client. Swap to
 * the real package later if/when richer features land.
 */

export interface SpawnOptions {
  /** Command and args, e.g. `["jsh"]` to start the default shell. */
  command: string[];
  /** Initial terminal size; reasonable defaults if omitted. */
  cols?: number;
  rows?: number;
  /** Optional cwd inside the container. */
  cwd?: string;
}

export interface SpawnHandle {
  /** Server-assigned process id. */
  pid: number;
  /** Write stdin bytes to the running process. */
  writeStdin: (chunk: Uint8Array | string) => void;
  /** Send a window resize. */
  resize: (cols: number, rows: number) => void;
  /** Kill the process (best-effort; the server may ignore an unknown signal). */
  kill: (signal?: string) => void;
}

export interface WebContainerClient {
  /** True once the WS handshake has completed. */
  readonly isReady: () => boolean;
  /** Spawn a process inside the container. */
  spawn: (opts: SpawnOptions) => Promise<SpawnHandle>;
  /** Subscribe to a process's stdout/stderr stream. */
  onOutput: (
    pid: number,
    listener: (chunk: Uint8Array) => void,
  ) => () => void;
  /** Subscribe to a process's exit event. */
  onExit: (
    pid: number,
    listener: (code: number, signal: string | null) => void,
  ) => () => void;
  /** Subscribe to connection lifecycle changes. */
  onConnectionChange: (listener: (connected: boolean) => void) => () => void;
  /** Tear everything down. */
  close: () => void;
}

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
}

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Open a WebSocket against a server-resident webcontainer-oss instance
 * and return a thin client. The WS is created eagerly; `isReady()`
 * flips to `true` once the open handshake completes. All RPC methods
 * await readiness internally.
 */
export function connectWebContainer(
  url: string,
  options?: { authToken?: string },
): WebContainerClient {
  // Browsers don't expose a way to set custom headers on a WS upgrade,
  // so auth tokens travel as a query param (same trick teleport-server
  // accepts for unauthenticated browser clients).
  const finalUrl = options?.authToken
    ? appendQuery(url, "token", options.authToken)
    : url;

  const ws = new WebSocket(finalUrl);
  ws.binaryType = "arraybuffer";

  let ready = false;
  let nextRequestId = 1;
  const pending = new Map<number, PendingRequest>();
  const outputListeners = new Map<number, Set<(chunk: Uint8Array) => void>>();
  const exitListeners = new Map<
    number,
    Set<(code: number, signal: string | null) => void>
  >();
  const connectionListeners = new Set<(connected: boolean) => void>();
  let readyResolvers: Array<() => void> = [];

  ws.addEventListener("open", () => {
    ready = true;
    for (const r of readyResolvers) r();
    readyResolvers = [];
    for (const cb of connectionListeners) cb(true);
  });

  ws.addEventListener("close", () => {
    ready = false;
    for (const { reject } of pending.values())
      reject(new Error("WebContainer WS closed before response"));
    pending.clear();
    for (const cb of connectionListeners) cb(false);
  });

  ws.addEventListener("error", (ev) => {
    // Browsers don't surface error detail; just log and let `close`
    // unwind the pending requests.
    console.error("[webcontainer] WS error", ev);
  });

  ws.addEventListener("message", (ev) => {
    if (typeof ev.data === "string") {
      handleTextFrame(ev.data);
      return;
    }
    if (ev.data instanceof ArrayBuffer) {
      handleBinaryFrame(new Uint8Array(ev.data));
      return;
    }
  });

  function handleTextFrame(raw: string) {
    let msg: { kind?: string; id?: number; [k: string]: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      console.error("[webcontainer] non-JSON text frame", raw);
      return;
    }
    if (msg.kind === "response" && typeof msg.id === "number") {
      const req = pending.get(msg.id);
      if (!req) return;
      pending.delete(msg.id);
      if (msg.error) {
        req.reject(new Error(String((msg.error as { message?: string }).message ?? msg.error)));
      } else {
        req.resolve((msg as { result?: unknown }).result);
      }
      return;
    }
    if (msg.kind === "process.exit" && typeof msg.pid === "number") {
      const pid = msg.pid as number;
      const code = (msg.code as number | undefined) ?? 0;
      const signal = (msg.signal as string | null | undefined) ?? null;
      const listeners = exitListeners.get(pid);
      if (listeners) for (const cb of listeners) cb(code, signal);
      return;
    }
    if (msg.kind === "event.server-ready" || msg.kind === "event.port") {
      // Surface to callers later; for now, log so dev visibility is
      // there without spamming the terminal.
      console.debug("[webcontainer] event", msg);
      return;
    }
  }

  function handleBinaryFrame(buf: Uint8Array) {
    if (buf.byteLength < 4) return;
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const headerLen = view.getUint32(0, false);
    const headerEnd = 4 + headerLen;
    if (headerEnd > buf.byteLength) return;
    let header: { kind?: string; pid?: number };
    try {
      header = JSON.parse(new TextDecoder().decode(buf.subarray(4, headerEnd)));
    } catch {
      return;
    }
    const payload = buf.subarray(headerEnd);
    if (header.kind === "process.output" && typeof header.pid === "number") {
      const listeners = outputListeners.get(header.pid);
      if (listeners) for (const cb of listeners) cb(payload);
    }
  }

  function whenReady(): Promise<void> {
    if (ready) return Promise.resolve();
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      return Promise.reject(new Error("WebContainer WS not open"));
    }
    return new Promise((resolve) => {
      readyResolvers.push(resolve);
    });
  }

  async function call<T>(kind: string, extra: Record<string, unknown>): Promise<T> {
    await whenReady();
    const id = nextRequestId++;
    const frame = { kind, id, ...extra };
    return new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: (r) => resolve(r as T),
        reject,
      });
      ws.send(JSON.stringify(frame));
      // Belt-and-suspenders timeout in case the server drops the call.
      const timer = setTimeout(() => {
        if (pending.delete(id))
          reject(new Error(`WebContainer RPC '${kind}' timed out`));
      }, REQUEST_TIMEOUT_MS);
      // If pending resolves before timeout, cleanup happens via .delete().
      timer.unref?.();
    });
  }

  function sendStdin(pid: number, chunk: Uint8Array) {
    if (!ready) return;
    const header = JSON.stringify({ kind: "spawn.stdin", pid });
    const headerBytes = new TextEncoder().encode(header);
    const out = new Uint8Array(4 + headerBytes.length + chunk.byteLength);
    new DataView(out.buffer).setUint32(0, headerBytes.length, false);
    out.set(headerBytes, 4);
    out.set(chunk, 4 + headerBytes.length);
    ws.send(out);
  }

  return {
    isReady: () => ready,
    spawn: async (opts) => {
      const result = await call<{ pid: number }>("spawn", {
        command: opts.command,
        cols: opts.cols,
        rows: opts.rows,
        cwd: opts.cwd,
      });
      const pid = result.pid;
      return {
        pid,
        writeStdin: (chunk) => {
          const bytes =
            typeof chunk === "string"
              ? new TextEncoder().encode(chunk)
              : chunk;
          sendStdin(pid, bytes);
        },
        resize: (cols, rows) => {
          if (!ready) return;
          ws.send(JSON.stringify({ kind: "process.resize", pid, cols, rows }));
        },
        kill: (signal) => {
          if (!ready) return;
          ws.send(JSON.stringify({ kind: "spawn.kill", pid, signal }));
        },
      };
    },
    onOutput: (pid, listener) => {
      let set = outputListeners.get(pid);
      if (!set) {
        set = new Set();
        outputListeners.set(pid, set);
      }
      set.add(listener);
      return () => {
        const s = outputListeners.get(pid);
        if (!s) return;
        s.delete(listener);
        if (s.size === 0) outputListeners.delete(pid);
      };
    },
    onExit: (pid, listener) => {
      let set = exitListeners.get(pid);
      if (!set) {
        set = new Set();
        exitListeners.set(pid, set);
      }
      set.add(listener);
      return () => {
        const s = exitListeners.get(pid);
        if (!s) return;
        s.delete(listener);
        if (s.size === 0) exitListeners.delete(pid);
      };
    },
    onConnectionChange: (listener) => {
      connectionListeners.add(listener);
      return () => {
        connectionListeners.delete(listener);
      };
    },
    close: () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
  };
}

function appendQuery(url: string, key: string, value: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
