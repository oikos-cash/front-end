/**
 * Tool registry. Each tool exports
 *
 *   { name, description, inputSchema, handler(ctx, args) }
 *
 * and is added to `uiTools`. Handlers are async (write tools wait for
 * the React state change / wagmi tx) but can return any JSON-serialisable
 * value — the server wraps it as a text block before sending back.
 *
 * Naming convention: kebab snake `ui_<verb>` (the agent's MCPRegistry
 * already prefixes the server name on top, so the LLM sees
 * `ui__ui_navigate`, etc.; we drop the redundant `ui_` on the tool
 * name itself to surface as `ui__navigate`).
 */

import type { UiContext } from "../context.js";

export interface UiTool {
  /** Tool name as the LLM sees it after the server prefix. */
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  handler: (ctx: UiContext, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * The default tool set. Empty in the scaffold — Phase 1 adds the
 * read-only tools, Phase 2 the writes, Phase 3 the submits.
 */
export const uiTools: UiTool[] = [];
