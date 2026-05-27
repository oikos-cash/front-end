/**
 * Wallet tools — read-only Phase-1 surface. The actual signing path
 * stays on the existing wallet-bridge (eth_signTypedData_v4 etc.); this
 * server just exposes what the page knows about the user's connection.
 */
import type { UiTool } from "./index";

const getConnectedAccount: UiTool = {
  name: "get_connected_account",
  description:
    "Return the wagmi-connected wallet address and active chain id, " +
    "or { connected: false } if the user has not connected MetaMask " +
    "on the /terminal page.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (ctx) => {
    const connected = ctx.account.isConnected();
    if (!connected) return { connected: false };
    return {
      connected: true,
      address: ctx.account.getAddress(),
      chainId: ctx.account.getChainId(),
    };
  },
};

const promptConnect: UiTool = {
  name: "prompt_connect",
  description:
    "Open the wallet-connect modal so the user can connect MetaMask. " +
    "Resolves once the user closes the modal (whether or not they connected).",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (ctx) => {
    await ctx.account.promptConnect();
    return { connected: ctx.account.isConnected(), address: ctx.account.getAddress() };
  },
};

export const walletTools: UiTool[] = [getConnectedAccount, promptConnect];
