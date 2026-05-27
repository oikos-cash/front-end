/**
 * Shared CORS / credentialless-COEP header builder for the wallet
 * bridge routes. Same posture as app/dyspel/[...path]/route.ts:
 *
 *   - Allow-Origin echoes the caller's Origin (works for the
 *     StackBlitz iframe + same-origin /terminal page alike).
 *   - Allow-Headers echoes Access-Control-Request-Headers so the
 *     agent / page can send Authorization, content-type, x-stainless-*,
 *     etc. without us maintaining a whitelist.
 *   - Cross-Origin-Resource-Policy: cross-origin so the credentialless
 *     iframe can read the body.
 */
import type { NextRequest } from "next/server";

export function corsHeaders(req: NextRequest): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", req.headers.get("origin") ?? "*");
  h.set("Vary", "Origin, Access-Control-Request-Headers");
  h.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS",
  );
  h.set(
    "Access-Control-Allow-Headers",
    req.headers.get("access-control-request-headers") ?? "*",
  );
  h.set("Access-Control-Max-Age", "300");
  h.set("Cross-Origin-Resource-Policy", "cross-origin");
  return h;
}

export function preflightResponse(req: NextRequest): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
