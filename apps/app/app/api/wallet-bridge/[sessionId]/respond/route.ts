/**
 * Page-facing response endpoint.
 *
 *   POST /api/wallet-bridge/<sessionId>/respond
 *   body: { id: string, result?: unknown, error?: { code, message } }
 *
 * The host page posts back here once it has the user's signed result
 * (or a rejection). Resolves the matching inflight request so the
 * agent's long-poll returns.
 */
import type { NextRequest } from "next/server";

import { respond, type BridgeResponse } from "@/lib/wallet-bridge";
import { corsHeaders, preflightResponse } from "@/lib/wallet-bridge-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

interface RespondBody {
  id?: string;
  result?: unknown;
  error?: { code: number; message: string };
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
  return preflightResponse(req);
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { sessionId } = await ctx.params;
  const headers = corsHeaders(req);
  headers.set("content-type", "application/json");

  let body: RespondBody;
  try {
    body = (await req.json()) as RespondBody;
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid JSON body" }),
      { status: 400, headers },
    );
  }

  if (typeof body?.id !== "string") {
    return new Response(
      JSON.stringify({ ok: false, error: "missing request id" }),
      { status: 400, headers },
    );
  }

  const resp: BridgeResponse =
    body.error !== undefined
      ? { error: body.error }
      : { result: body.result };

  const ok = respond(sessionId, body.id, resp);
  return new Response(JSON.stringify({ ok }), { status: 200, headers });
}
