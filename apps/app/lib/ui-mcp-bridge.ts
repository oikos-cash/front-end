/**
 * UI-MCP bridge — in-memory request/response queue for JSON-RPC frames.
 *
 * The /terminal page hosts the in-process MCP server (`@oikos/ui-mcp`).
 * The agent runs inside a WebContainer with no shared JS state with the
 * React tree, so it talks to the server over HTTP: each JSON-RPC frame
 * is a POST to /request, the page picks it up via SSE on /pending, runs
 * it through the MCP Server, and POSTs the response to /respond.
 *
 *   Agent                       Bridge (this module)            Page
 *   --------------------        --------------------            ----
 *   POST .../request       ---> enqueue, await ---------> SSE notify
 *                                                         ↓
 *                                                         MCP Server dispatch
 *                                                         ↓
 *                          <--- resolve <--- POST .../respond
 *   200 {response frame}   <---
 *
 * Same shape as wallet-bridge but pass-through: we don't parse the
 * JSON-RPC envelope, we just shuttle opaque frames and route by the
 * `id` field (notifications have no id and resolve immediately).
 *
 * Single in-memory store per Next process. Adequate for dev — for prod
 * multi-instance fan-out we'd swap to Redis or similar.
 */

/** Opaque JSON-RPC 2.0 frame. We don't validate the shape — the MCP
 *  server on the page side does that. */
export type JsonRpcFrame = Record<string, unknown> & {
  jsonrpc?: string;
  id?: number | string;
  method?: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

interface PendingRequest {
  /** The agent's JSON-RPC request id, used to route the response. */
  rpcId: number | string;
  frame: JsonRpcFrame;
  resolve: (resp: JsonRpcFrame) => void;
  enqueuedAt: number;
}

interface SessionState {
  /** Requests waiting for the page to pick them up (no SSE attached yet). */
  awaitingPickup: PendingRequest[];
  /** Requests picked up by the page, keyed by RPC id. */
  inFlight: Map<number | string, PendingRequest>;
  /** Page-side SSE listeners. */
  listeners: Set<(req: PendingRequest) => void>;
  lastActivityAt: number;
}

// See wallet-bridge.ts for why we pin the map on globalThis — Next App
// Router with Turbopack can compile each route as a separate bundle.
type SessionsHolder = { __oikosUiMcpBridgeSessions?: Map<string, SessionState> };
const holder = globalThis as unknown as SessionsHolder;
const sessions: Map<string, SessionState> =
  holder.__oikosUiMcpBridgeSessions ?? new Map<string, SessionState>();
holder.__oikosUiMcpBridgeSessions = sessions;

function getOrCreate(sessionId: string): SessionState {
  let s = sessions.get(sessionId);
  if (!s) {
    s = {
      awaitingPickup: [],
      inFlight: new Map(),
      listeners: new Set(),
      lastActivityAt: Date.now(),
    };
    sessions.set(sessionId, s);
  }
  s.lastActivityAt = Date.now();
  return s;
}

function isNotification(frame: JsonRpcFrame): boolean {
  // JSON-RPC 2.0: a notification has no `id`. We also treat null id as
  // a notification per the spec.
  return frame.id === undefined || frame.id === null;
}

/**
 * Agent-side entry. Enqueues a JSON-RPC frame for the page. For
 * requests, returns a promise that resolves with the page's response
 * frame (or a timeout error frame). For notifications, resolves
 * immediately with an empty frame — the agent's transport drops empty
 * bodies on the floor, so the round-trip stays cheap.
 */
export function enqueueRequest(
  sessionId: string,
  frame: JsonRpcFrame,
  options: { timeoutMs?: number } = {},
): Promise<JsonRpcFrame> {
  const session = getOrCreate(sessionId);

  if (isNotification(frame)) {
    // Still hand it to the page so it can dispatch the notification,
    // but don't track a pending entry — the agent doesn't wait.
    for (const listener of session.listeners) {
      listener({
        rpcId: '',
        frame,
        resolve: () => {
          /* drop */
        },
        enqueuedAt: Date.now(),
      });
    }
    return Promise.resolve({} as JsonRpcFrame);
  }

  const rpcId = frame.id!;
  // 60 s is comfortable for any tool call we expose in v1; longer than
  // this and the agent will retry anyway.
  const timeoutMs = options.timeoutMs ?? 60_000;

  return new Promise<JsonRpcFrame>((resolve) => {
    const pending: PendingRequest = {
      rpcId,
      frame,
      enqueuedAt: Date.now(),
      resolve,
    };

    const timer = setTimeout(() => {
      session.inFlight.delete(rpcId);
      const i = session.awaitingPickup.findIndex((p) => p.rpcId === rpcId);
      if (i >= 0) session.awaitingPickup.splice(i, 1);
      resolve({
        jsonrpc: '2.0',
        id: rpcId,
        error: {
          code: -32000,
          message: `ui-mcp bridge: request timed out after ${timeoutMs}ms`,
        },
      });
    }, timeoutMs);

    pending.resolve = (resp) => {
      clearTimeout(timer);
      resolve(resp);
    };

    if (session.listeners.size > 0) {
      session.inFlight.set(rpcId, pending);
      for (const listener of session.listeners) listener(pending);
    } else {
      session.awaitingPickup.push(pending);
    }
  });
}

/**
 * Page-facing pickup (non-SSE callers). Returns the next queued frame,
 * or null. Moves it into inFlight.
 */
export function takeNextRequest(sessionId: string): JsonRpcFrame | null {
  const session = getOrCreate(sessionId);
  const next = session.awaitingPickup.shift();
  if (!next) return null;
  if (!isNotification(next.frame)) {
    session.inFlight.set(next.rpcId, next);
  }
  return next.frame;
}

/**
 * Subscribe to new frames as they arrive (for SSE). Listener fires
 * immediately for any backlog, then for each subsequent enqueue.
 */
export function subscribe(
  sessionId: string,
  listener: (frame: JsonRpcFrame) => void,
): () => void {
  const session = getOrCreate(sessionId);
  const wrapped = (p: PendingRequest) => listener(p.frame);

  while (session.awaitingPickup.length > 0) {
    const p = session.awaitingPickup.shift()!;
    if (!isNotification(p.frame)) {
      session.inFlight.set(p.rpcId, p);
    }
    wrapped(p);
  }
  session.listeners.add(wrapped);
  return () => {
    session.listeners.delete(wrapped);
  };
}

/**
 * Page-facing response. Resolves the matching inflight request keyed
 * by `id`. Returns true if there was something to resolve.
 */
export function respond(sessionId: string, resp: JsonRpcFrame): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  const id = resp.id;
  if (id === undefined || id === null) return false;
  const pending = session.inFlight.get(id);
  if (!pending) return false;
  session.inFlight.delete(id);
  pending.resolve(resp);
  session.lastActivityAt = Date.now();
  return true;
}

export function gcStaleSessions(maxIdleMs = 30 * 60_000): void {
  const cutoff = Date.now() - maxIdleMs;
  for (const [id, session] of sessions) {
    if (
      session.lastActivityAt < cutoff &&
      session.inFlight.size === 0 &&
      session.listeners.size === 0
    ) {
      sessions.delete(id);
    }
  }
}
