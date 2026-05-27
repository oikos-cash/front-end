/**
 * Page-facing SSE stream.
 *
 *   GET /api/ui-mcp/<sessionId>/pending
 *
 * Streams incoming JSON-RPC frames from the agent to the host page as
 * Server-Sent Events. Each `request` event's `data` is a raw JSON-RPC
 * frame the page-side useUiMcpServer hook hands to its MCP Server
 * transport.
 *
 * Same pattern as the wallet-bridge /pending stream — 20 s heartbeat,
 * clean teardown on abort.
 */
import type { NextRequest } from "next/server";

import { subscribe } from "@/lib/ui-mcp-bridge";
import { corsHeaders, preflightResponse } from "@/lib/wallet-bridge-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function OPTIONS(req: NextRequest): Promise<Response> {
  return preflightResponse(req);
}

export async function GET(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { sessionId } = await ctx.params;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (line: string) => {
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          /* controller closed — listener cleanup happens via cancel() */
        }
      };

      enqueue(": ui-mcp open\n\n");

      unsubscribe = subscribe(sessionId, (frame) => {
        enqueue(`event: request\ndata: ${JSON.stringify(frame)}\n\n`);
      });

      heartbeat = setInterval(() => enqueue(": ping\n\n"), 20_000);

      const teardown = () => {
        unsubscribe?.();
        unsubscribe = null;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
      };

      req.signal.addEventListener("abort", () => {
        teardown();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      unsubscribe?.();
      unsubscribe = null;
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    },
  });

  const headers = corsHeaders(req);
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.set("X-Accel-Buffering", "no");

  return new Response(stream, { status: 200, headers });
}
