/**
 * Markets tools — read what the markets/trade pages are showing, and
 * navigate the user into a specific market.
 */
import type { UiTool } from "./index";

const getVisibleMarkets: UiTool = {
  name: "get_visible_markets",
  description:
    "Return the list of markets currently visible on the user's screen " +
    "(after any filters/sorts the user has applied). Each entry has " +
    "{ symbol, vaultAddress, spotPrice, imv }.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (ctx) => {
    return { markets: ctx.markets.getVisible() };
  },
};

const selectMarket: UiTool = {
  name: "select_market",
  description:
    "Drill into a specific market by symbol — navigates the user to " +
    "/trade/<symbol>. Use after `ui_get_visible_markets` to pick one.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Token symbol (e.g. 'OKS', 'DWS', 'DFS').",
      },
    },
    required: ["symbol"],
    additionalProperties: false,
  },
  handler: async (ctx, args) => {
    const symbol = args.symbol;
    if (typeof symbol !== "string" || symbol.length === 0) {
      throw new Error("select_market: 'symbol' must be a non-empty string");
    }
    await ctx.markets.select(symbol);
    return { ok: true, path: ctx.router.getPath() };
  },
};

export const marketsTools: UiTool[] = [getVisibleMarkets, selectMarket];
