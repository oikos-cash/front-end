/**
 * Swap tools. Reads, form prefill, and submit-via-wallet-bridge.
 * Signing for submit goes through the existing wallet-bridge / MetaMask
 * flow — no new signing infra here, just an indirection that drives
 * the same useSwap mutation the UI button would.
 */
import type { UiTool } from "./index";

const getSwapState: UiTool = {
  name: "get_swap_state",
  description:
    "Return the current state of the swap form: sellToken, buyToken, " +
    "amount, slippageBps. Null fields mean the user has not filled them in.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (ctx) => {
    return ctx.swap.getState();
  },
};

const setSwapForm: UiTool = {
  name: "set_swap_form",
  description:
    "Prefill the swap form. Any omitted field is left as-is. The user still " +
    "has to click Submit (or you call ui_submit_swap) — this tool only fills " +
    "in the values.",
  inputSchema: {
    type: "object",
    properties: {
      sellToken: {
        type: "string",
        description: "Token symbol or address being sold (e.g. 'BNB', 'OKS', or 0x…).",
      },
      buyToken: {
        type: "string",
        description: "Token symbol or address being bought.",
      },
      amount: {
        type: "string",
        description:
          "Human-readable amount of `sellToken` (e.g. '0.05'). Decimal string, NOT wei.",
      },
      slippageBps: {
        type: "number",
        description: "Slippage tolerance in basis points (50 = 0.5%).",
      },
    },
    additionalProperties: false,
  },
  handler: async (ctx, args) => {
    const partial: Record<string, unknown> = {};
    for (const key of ["sellToken", "buyToken", "amount", "slippageBps"]) {
      if (args[key] !== undefined) partial[key] = args[key];
    }
    ctx.swap.set(partial as Parameters<typeof ctx.swap.set>[0]);
    return { ok: true, state: ctx.swap.getState() };
  },
};

const submitSwap: UiTool = {
  name: "submit_swap",
  description:
    "Submit the swap currently in the form. Triggers the same path as the " +
    "user clicking the Swap button: MetaMask pops via the wallet-bridge, " +
    "user approves or rejects, the tx broadcasts on approve. Returns the tx " +
    "hash on success; throws on rejection or other failure.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (ctx) => {
    const { hash } = await ctx.swap.submit();
    return { ok: true, hash };
  },
};

export const swapTools: UiTool[] = [getSwapState, setSwapForm, submitSwap];
