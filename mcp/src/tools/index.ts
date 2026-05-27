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

import { navigationTools } from "./navigation.js";
import { walletTools } from "./wallet.js";
import { marketsTools } from "./markets.js";
import { swapTools } from "./swap.js";
import { modalsTools } from "./modals.js";

/**
 * The default tool set. Phase 1: read-only inspectors + navigate.
 * Phase 2 will add form prefill / modal control; Phase 3, submits.
 */
export const uiTools: UiTool[] = [
  ...navigationTools,
  ...walletTools,
  ...marketsTools,
  ...swapTools,
  ...modalsTools,
];
