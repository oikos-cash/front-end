/**
 * createUiMcpServer — wires a stock `@modelcontextprotocol/sdk` Server
 * to our React-bound UiContext.
 *
 * Tools are static modules under `./tools/`; each exports
 *   { name, description, inputSchema, handler(ctx, args) }
 * and the server dispatches by name. Handlers receive the UiContext
 * the page mounted with — ref-backed reads / Promise-returning writes.
 *
 * The server is transport-agnostic. Pair it with `HttpBridgeTransport`
 * (agent side, in `transport-http.ts`) — or in tests, a plain in-memory
 * transport.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type { UiContext } from "./context.js";
import { uiTools, type UiTool } from "./tools/index.js";

export interface CreateUiMcpServerOptions {
  /** React-bound surface the tools call into. Must be referentially
   *  stable across React renders. */
  context: UiContext;
  /** Override the tool set — useful for tests or for scoping by route. */
  tools?: UiTool[];
}

export function createUiMcpServer(opts: CreateUiMcpServerOptions): Server {
  const { context } = opts;
  const tools = opts.tools ?? uiTools;
  const byName = new Map<string, UiTool>(tools.map((t) => [t.name, t]));

  const server = new Server(
    { name: "oikos-ui", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const tool = byName.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown ui tool: ${name}` }],
      };
    }
    try {
      const result = await tool.handler(context, args ?? {});
      const text =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text", text: `Tool ${name} failed: ${message}` }],
      };
    }
  });

  return server;
}
