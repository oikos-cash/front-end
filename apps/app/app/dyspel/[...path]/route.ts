import { NextRequest } from "next/server";

/**
 * Same-origin proxy to the Dyspel backend. The agent process inside
 * the in-browser WebContainer can't reach `https://stg-app.dyspel.xyz`
 * directly (CORS preflight failures), so the bundled fetch-shim
 * rewrites those calls to `${OIKOS_HOST_ORIGIN}/dyspel/...`, which
 * lands here. This route streams the request through to the real
 * backend server-side.
 *
 * Mirrors the Vite middleware in
 * `/data2/code/Oikos/agent-wasm/vite.config.ts` (search "dyspel-passthrough").
 */
const DEFAULT_BACKEND = "https://stg-app.dyspel.xyz";

// Dyspel staging's /api/lite/cc-wasm-host/session endpoint returns
// `ws_url` pointing at `ws://127.0.0.1:8787` — it assumes the agent
// runs on the same machine as the wasm-host server. Our in-browser
// agent runs inside StackBlitz's WebContainer, whose `127.0.0.1` is
// its own loopback, not the host's. We rewrite the ws_url to the
// public hostname that cloudflared maps to localhost:8787 so the
// agent's WebSocket reaches the real backend.
const WS_HOST_REWRITES: ReadonlyArray<[from: RegExp, to: string]> = [
  [/^wss?:\/\/127\.0\.0\.1:8787/i, "wss://oikos-ws.dyspel.xyz"],
  [/^wss?:\/\/localhost:8787/i, "wss://oikos-ws.dyspel.xyz"],
];

function rewriteWsUrl(url: string): string {
  for (const [from, to] of WS_HOST_REWRITES) {
    if (from.test(url)) return url.replace(from, to);
  }
  return url;
}

// Force the route off the edge so we can stream large response bodies
// without buffering them in memory.
export const runtime = "nodejs";
// Don't cache anything; auth poll endpoints depend on freshness.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

// Headers we always add so the StackBlitz iframe (different origin)
// can read the response in a COEP:credentialless realm.
function addCrossOriginHeaders(
  out: Headers,
  reqOrigin: string | null,
  reqHeaders: string | null,
): void {
  // Echo back the caller's origin when present; fall back to "*" for
  // non-credentialed requests. The agent's fetches don't carry cookies
  // so wildcard is safe here.
  out.set("Access-Control-Allow-Origin", reqOrigin ?? "*");
  out.set("Vary", "Origin, Access-Control-Request-Headers");
  out.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  // Echo back whatever the caller requested in the preflight. Saves us
  // playing whack-a-mole every time the agent SDK introduces a new
  // header (Authorization, X-Session-Id, X-Stainless-*, etc.). The
  // upstream — not us — is the one that enforces what's actually
  // meaningful per endpoint.
  out.set("Access-Control-Allow-Headers", reqHeaders ?? "*");
  // Short cache (5 min). Long enough to spare the upstream from repeated
  // preflights during a session; short enough that any change to allowed
  // headers takes effect without a browser cache-clear dance.
  out.set("Access-Control-Max-Age", "300");
  // CORP is required for the iframe to consume the body under credentialless COEP.
  out.set("Cross-Origin-Resource-Policy", "cross-origin");
}

async function proxy(req: NextRequest, ctx: Ctx): Promise<Response> {
  const reqOrigin = req.headers.get("origin");
  const acrh = req.headers.get("access-control-request-headers");

  // CORS preflight — answer before touching the upstream.
  if (req.method === "OPTIONS") {
    const h = new Headers();
    addCrossOriginHeaders(h, reqOrigin, acrh);
    return new Response(null, { status: 204, headers: h });
  }

  const backend = process.env.DYSPEL_BACKEND_URL ?? DEFAULT_BACKEND;
  const { path } = await ctx.params;
  const targetPath = "/" + (path?.join("/") ?? "");
  const search = req.nextUrl.search;
  const targetUrl = backend + targetPath + search;

  const headers = new Headers(req.headers);
  // Strip headers that would leak the proxy origin / break the upstream
  // host check, plus accept-encoding so we don't have to decode br/gzip
  // before relaying.
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("accept-encoding");
  try {
    headers.set("host", new URL(backend).host);
  } catch {
    /* malformed backend env — fall through and let fetch throw */
  }

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : req.body;

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
    // @ts-expect-error — Node fetch needs this when forwarding a body stream
    duplex: "half",
  });

  // Drop content-encoding / transfer-encoding so the browser doesn't
  // try to re-decode an already-identity response.
  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete("content-encoding");
  outHeaders.delete("transfer-encoding");
  addCrossOriginHeaders(outHeaders, reqOrigin, acrh);

  // The cc-wasm-host/session response returns a ws_url that points at
  // localhost — rewrite it to the public tunnel hostname so the
  // in-container agent can actually reach it.
  const isMintHostSession =
    targetPath === "/api/lite/cc-wasm-host/session" &&
    (upstream.headers.get("content-type") ?? "").includes("application/json");

  if (isMintHostSession && upstream.ok) {
    const text = await upstream.text();
    let rewritten = text;
    try {
      const json = JSON.parse(text) as { ws_url?: unknown };
      if (typeof json.ws_url === "string") {
        json.ws_url = rewriteWsUrl(json.ws_url);
        rewritten = JSON.stringify(json);
      }
    } catch {
      /* not JSON or malformed — pass through unmodified */
    }
    outHeaders.set("content-length", String(Buffer.byteLength(rewritten)));
    return new Response(rewritten, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
