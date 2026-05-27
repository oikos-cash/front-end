/**
 * Navigation tools — read the current route, push a new one.
 *
 * Tool names drop the `ui_` prefix because the MCPRegistry on the
 * agent side already prefixes the server name (`ui__navigate`).
 */
import type { UiTool } from "./index.js";

const navigate: UiTool = {
  name: "navigate",
  description:
    "Navigate the user's browser to a new path within the Oikos app. " +
    "Argument is an in-app pathname like '/en/swap' or '/en/trade/oks'. " +
    "Resolves once the route change settles.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "In-app pathname, e.g. '/en/swap'. Must start with '/'.",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
  handler: async (ctx, args) => {
    const path = args.path;
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw new Error("navigate: 'path' must be an in-app pathname starting with '/'");
    }
    await ctx.router.push(path);
    return { ok: true, path: ctx.router.getPath() };
  },
};

const getRoute: UiTool = {
  name: "get_route",
  description: "Return the current pathname the user is viewing in the app.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (ctx) => {
    return { path: ctx.router.getPath() };
  },
};

export const navigationTools: UiTool[] = [navigate, getRoute];
