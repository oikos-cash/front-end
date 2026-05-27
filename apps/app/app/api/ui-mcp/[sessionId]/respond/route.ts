/**
 * Page-facing response endpoint.
 *
 *   POST /api/ui-mcp/<sessionId>/respond
 *   body: JSONRPCMessage   (an MCP response frame — must carry `id`)
 *
 * Routes the frame by its JSON-RPC id back to the agent's awaiting
 * long-poll on /request. The agent's HttpBridgeTransport unblocks and
 * surfaces the frame to its MCP client.
 */
import type { NextRequest } from "next/server";

import { respond, type JsonRpcFrame } from "@/lib/ui-mcp-bridge";
import { corsHeaders, preflightResponse } from "@/lib/wallet-bridge-cors";

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
      JSON.stringify({ ok: false, error: "invalid JSON body" }),
      { status: 400, headers },
    );
  }

  if (frame.id === undefined || frame.id === null) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing JSON-RPC id" }),
      { status: 400, headers },
    );
  }

  const ok = respond(sessionId, frame);
  return new Response(JSON.stringify({ ok }), { status: 200, headers });
}
