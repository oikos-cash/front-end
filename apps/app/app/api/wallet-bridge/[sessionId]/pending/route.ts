/**
 * Page-facing SSE stream.
 *
 *   GET /api/wallet-bridge/<sessionId>/pending
 *
 * Streams incoming agent requests to the host page as Server-Sent
 * Events. Each event has data: { id, method, params }. The page is
 * expected to handle each one and POST to /respond.
 *
 * Heartbeat every 20s so proxies don't close the connection.
 */
import type { NextRequest } from "next/server";

import { subscribe } from "@/lib/wallet-bridge";
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

      // Open the stream with a comment so the client sees the connection.
      enqueue(": wallet-bridge open\n\n");

      unsubscribe = subscribe(sessionId, (request) => {
        enqueue(`event: request\ndata: ${JSON.stringify(request)}\n\n`);
      });

      heartbeat = setInterval(() => enqueue(": ping\n\n"), 20_000);

      const teardown = () => {
        // Belt-and-suspenders: controller.close() doesn't fire cancel()
        // on the stream, so we have to remove the listener + clear the
        // heartbeat ourselves on client disconnect. Without this the
        // listener leaks and swallows future bridge events silently
        // (writing to a closed controller throws — caught by enqueue's
        // try/catch — and the live listener from a strict-mode remount
        // never gets a chance).
        unsubscribe?.();
        unsubscribe = null;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
      };

      // Close cleanly when the client disconnects.
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
  // Defeat any nginx-style proxy buffering on the response.
  headers.set("X-Accel-Buffering", "no");

  return new Response(stream, { status: 200, headers });
}
