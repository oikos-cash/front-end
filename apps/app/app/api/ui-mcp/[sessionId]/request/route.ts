/**
 * Agent-facing endpoint.
 *
 *   POST /api/ui-mcp/<sessionId>/request
 *   body: JSONRPCMessage   (opaque — we don't validate the shape)
 *
 * For JSON-RPC requests, long-polls until the page POSTs the matching
 * response to /respond, then returns that frame in the body. For
 * notifications (no `id`), returns 200 with an empty JSON object
 * immediately — the agent's HttpBridgeTransport drops empty bodies.
 *
 * Always 200; transport errors propagate as the response frame's
 * `error` field so the agent gets a uniform parse path.
 */
import type { NextRequest } from "next/server";

import {
  enqueueRequest,
  gcStaleSessions,
  type JsonRpcFrame,
} from "@/lib/ui-mcp-bridge";
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

  let frame: JsonRpcFrame;
  try {
    frame = (await req.json()) as JsonRpcFrame;
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "invalid JSON body" } }),
      { status: 200, headers },
    );
  }

  gcStaleSessions();

  const resp = await enqueueRequest(sessionId, frame);
  return new Response(JSON.stringify(resp), { status: 200, headers });
}
