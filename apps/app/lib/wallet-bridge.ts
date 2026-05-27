/**
 * Wallet bridge — in-memory request/response queue.
 *
 * The /terminal page hosts a wagmi-connected wallet (MetaMask). The
 * agent runs inside StackBlitz's WebContainer with no `window`, so it
 * can't pop MetaMask directly. We bridge the gap with a tiny in-memory
 * queue keyed by a session id.
 *
 *   Agent (in container)           Bridge (this module)            Page
 *   --------------------           --------------------            ----
 *   POST .../request          ---> enqueue, await --------> SSE notify
 *                                                           ↓
 *                                                           wagmi prompt
 *                                                           ↓
 *                             <--- resolve <--- POST .../respond
 *   200 {result}              <---
 *
 * Single in-memory store per Next process. Adequate for dev — production
 * would need Redis or similar for multi-instance fan-out.
 *
 * Wire shape (kept close to MetaMask's provider RPC so the contract is
 * familiar and we can grow it cleanly):
 *
 *   AgentRequest  = { method: "eth_accounts" | "eth_signTypedData_v4" | ...,
 *                     params: unknown[] }
 *   AgentResponse = { result: unknown } | { error: { code, message } }
 */

type Json = unknown;

export interface BridgeRequest {
  /** Method name, JSON-RPC style (e.g. "eth_accounts"). */
  method: string;
  /** Method-specific positional params. */
  params: Json[];
}

export interface BridgeError {
  /** RPC-style error code. 4001 = user rejected, 4100 = unauthorized, etc. */
  code: number;
  message: string;
}

export type BridgeResponse =
  | { result: Json; error?: undefined }
  | { result?: undefined; error: BridgeError };

interface PendingRequest extends BridgeRequest {
  id: string;
  resolve: (resp: BridgeResponse) => void;
  reject: (err: Error) => void;
  /** When this request was enqueued. */
  enqueuedAt: number;
}

interface SessionState {
  /** Requests waiting for the page to pick them up. */
  awaitingPickup: PendingRequest[];
  /** Requests picked up by the page but not yet responded to. */
  inFlight: Map<string, PendingRequest>;
  /** Page-side SSE listeners; called when a new request arrives. */
  listeners: Set<(req: PendingRequest) => void>;
  /** Most recent activity timestamp for GC purposes. */
  lastActivityAt: number;
}

// Pin the sessions Map on globalThis so every route handler module
// shares the same instance. Next App Router (especially with Turbopack
// in dev) can compile each route as a separate bundle, which means a
// plain top-level `const sessions = new Map()` would give the /request
// handler and the /pending handler each their own private Map —
// silently breaking the bridge.
type SessionsHolder = { __oikosWalletBridgeSessions?: Map<string, SessionState> };
const holder = globalThis as unknown as SessionsHolder;
const sessions: Map<string, SessionState> =
  holder.__oikosWalletBridgeSessions ?? new Map<string, SessionState>();
holder.__oikosWalletBridgeSessions = sessions;

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

function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Called from the agent-facing route. Enqueues the request and returns
 * a promise that resolves when the page responds (or the timeout fires).
 */
export function enqueueRequest(
  sessionId: string,
  req: BridgeRequest,
  options: { timeoutMs?: number } = {},
): Promise<BridgeResponse> {
  const session = getOrCreate(sessionId);
  const id = newRequestId();
  // 5 minutes is long enough for MetaMask popup → user-reads-tx →
  // user-approves → wagmi broadcasts. The agent-side MCP timeout and
  // RemoteSigner.timeoutMs both match this.
  const timeoutMs = options.timeoutMs ?? 5 * 60_000;

  return new Promise<BridgeResponse>((resolve, reject) => {
    const pending: PendingRequest = {
      id,
      method: req.method,
      params: req.params,
      enqueuedAt: Date.now(),
      resolve,
      reject,
    };

    const timer = setTimeout(() => {
      // Pull from whichever bucket holds it.
      const i = session.awaitingPickup.findIndex((p) => p.id === id);
      if (i >= 0) session.awaitingPickup.splice(i, 1);
      session.inFlight.delete(id);
      resolve({
        error: {
          code: -32000,
          message: `wallet-bridge request timed out after ${timeoutMs}ms`,
        },
      });
    }, timeoutMs);
    // Wrap resolve/reject to clear the timer on completion.
    pending.resolve = (resp) => {
      clearTimeout(timer);
      resolve(resp);
    };
    pending.reject = (err) => {
      clearTimeout(timer);
      reject(err);
    };

    // Hand off to listeners if any, otherwise queue.
    if (session.listeners.size > 0) {
      session.inFlight.set(id, pending);
      for (const listener of session.listeners) listener(pending);
    } else {
      session.awaitingPickup.push(pending);
    }
  });
}

/**
 * Called from the page-facing pickup route. Returns the next request
 * waiting for the page, or null if none are queued. Moves the request
 * into `inFlight`.
 */
export function takeNextRequest(
  sessionId: string,
): { id: string; method: string; params: Json[] } | null {
  const session = getOrCreate(sessionId);
  const next = session.awaitingPickup.shift();
  if (!next) return null;
  session.inFlight.set(next.id, next);
  return { id: next.id, method: next.method, params: next.params };
}

/**
 * Subscribe to new requests as they arrive (for SSE). Returns an
 * unsubscribe function. The listener is called immediately with any
 * already-queued requests, then for each subsequent one.
 */
export function subscribe(
  sessionId: string,
  listener: (req: { id: string; method: string; params: Json[] }) => void,
): () => void {
  const session = getOrCreate(sessionId);
  const wrapped = (p: PendingRequest) =>
    listener({ id: p.id, method: p.method, params: p.params });

  // Drain any pending requests first.
  while (session.awaitingPickup.length > 0) {
    const p = session.awaitingPickup.shift()!;
    session.inFlight.set(p.id, p);
    wrapped(p);
  }
  session.listeners.add(wrapped);
  return () => {
    session.listeners.delete(wrapped);
  };
}

/**
 * Called from the page-facing respond route. Resolves the matching
 * inflight request. Returns true if the request existed and was settled.
 */
export function respond(
  sessionId: string,
  requestId: string,
  resp: BridgeResponse,
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  const pending = session.inFlight.get(requestId);
  if (!pending) return false;
  session.inFlight.delete(requestId);
  pending.resolve(resp);
  session.lastActivityAt = Date.now();
  return true;
}

/**
 * Garbage-collect sessions that have been idle for too long. Called
 * opportunistically from any route handler so we don't need a separate
 * timer / background worker.
 */
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
