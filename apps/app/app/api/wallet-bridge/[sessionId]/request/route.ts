/**
 * Agent-facing endpoint.
 *
 *   POST /api/wallet-bridge/<sessionId>/request
 *   body: { method: string, params: unknown[] }
 *
 * Enqueues the request for the host page, then long-polls for the
 * page's response. Returns
 *
 *   200 { result: <method-specific> }   on success
 *   200 { error: { code, message } }    on user-rejection / timeout
 *
 * (We always return 200 with a JSON envelope so the agent's RemoteSigner
 * can inspect the error shape uniformly — RPC-style.)
 */
import type { NextRequest } from "next/server";

import {
  enqueueRequest,
  gcStaleSessions,
  type BridgeRequest,
} from "@/lib/wallet-bridge";
import {
  corsHeaders,
  preflightResponse,
} from "@/lib/wallet-bridge-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function OPTIONS(req: NextRequest): Promise<Response> {
  return preflightResponse(req);
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { sessionId } = await ctx.params;
  const headers = corsHeaders(req);
  headers.set("content-type", "application/json");

  let payload: BridgeRequest;
  try {
    payload = (await req.json()) as BridgeRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: { code: -32700, message: "invalid JSON body" } }),
      { status: 200, headers },
    );
  }

  if (typeof payload?.method !== "string" || !Array.isArray(payload.params)) {
    return new Response(
      JSON.stringify({
        error: { code: -32600, message: "expected { method: string, params: unknown[] }" },
      }),
      { status: 200, headers },
    );
  }

  gcStaleSessions();

  const resp = await enqueueRequest(sessionId, payload);
  return new Response(JSON.stringify(resp), { status: 200, headers });
}
