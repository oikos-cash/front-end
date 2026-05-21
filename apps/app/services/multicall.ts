import {
  createPublicClient,
  http,
  erc20Abi,
  formatUnits,
  formatEther,
  type Address,
  type PublicClient,
} from "viem";
import { bsc } from "viem/chains";

import { SUPPORTED_CHAIN_IDS } from "@/types/constants";

// =================================================
//              PUBLIC CLIENT (singleton)
// =================================================

const clients: Record<number, PublicClient> = {};

/**
 * Get a viem PublicClient for the given chain.
 * Reuses existing instances (singleton per chain).
 */
export function getPublicClient(chainId: number = bsc.id): PublicClient {
  if (!clients[chainId]) {
    // BNB Chain is the only supported network; ignore the chainId argument
    // beyond keying the singleton cache.
    clients[chainId] = createPublicClient({
      chain: bsc,
      transport: http(),
      batch: { multicall: true },
    });
  }
  return clients[chainId];
}

/**
 * Clear cached clients (call on network switch).
 */
export function clearClients(): void {
  for (const key of Object.keys(clients)) {
    delete clients[Number(key)];
  }
}

// =================================================
//              BATCH TOKEN BALANCES
// =================================================

export interface TokenBalanceResult {
  address: Address;
  balance: bigint;
  formatted: string;
  decimals: number;
  symbol: string;
}

/**
 * Fetch native (BNB) + multiple ERC20 token balances in a single multicall.
 *
 * @returns Object with `native` (BNB) and `tokens` (ERC20 balances by address).
 *
 * @example
 * const { native, tokens } = await fetchBalances(
 *   "0xUser...",
 *   ["0xToken1...", "0xToken2..."],
 *   56,
 * );
 * console.log(native.formatted); // "1.234"
 * console.log(tokens["0xtoken1..."].formatted); // "500.00"
 */
export async function fetchBalances(
  userAddress: Address,
  tokenAddresses: Address[],
  chainId: number = bsc.id,
): Promise<{
  native: { balance: bigint; formatted: string };
  tokens: Record<string, TokenBalanceResult>;
}> {
  const client = getPublicClient(chainId);

  // Build multicall contracts array
  const balanceCalls = tokenAddresses.map((token) => ({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf" as const,
    args: [userAddress] as const,
  }));

  const decimalsCalls = tokenAddresses.map((token) => ({
    address: token,
    abi: erc20Abi,
    functionName: "decimals" as const,
  }));

  const symbolCalls = tokenAddresses.map((token) => ({
    address: token,
    abi: erc20Abi,
    functionName: "symbol" as const,
  }));

  // Execute all in one multicall
  const [nativeBalance, ...multicallResults] = await Promise.all([
    client.getBalance({ address: userAddress }),
    client.multicall({ contracts: balanceCalls, allowFailure: true }),
    client.multicall({ contracts: decimalsCalls, allowFailure: true }),
    client.multicall({ contracts: symbolCalls, allowFailure: true }),
  ]);

  const [balances, decimals, symbols] = multicallResults;

  const tokens: Record<string, TokenBalanceResult> = {};

  for (let i = 0; i < tokenAddresses.length; i++) {
    const addr = tokenAddresses[i].toLowerCase();
    const bal = balances[i];
    const dec = decimals[i];
    const sym = symbols[i];

    const balValue =
      bal.status === "success" ? (bal.result as bigint) : BigInt(0);
    const decValue = dec.status === "success" ? (dec.result as number) : 18;
    const symValue = sym.status === "success" ? (sym.result as string) : "???";

    tokens[addr] = {
      address: tokenAddresses[i],
      balance: balValue,
      formatted: formatUnits(balValue, decValue),
      decimals: decValue,
      symbol: symValue,
    };
  }

  return {
    native: {
      balance: nativeBalance,
      formatted: formatEther(nativeBalance),
    },
    tokens,
  };
}

// =================================================
//              BATCH ALLOWANCES
// =================================================

export interface AllowanceResult {
  token: Address;
  spender: Address;
  allowance: bigint;
  isMaxApproved: boolean;
}

const MAX_UINT256 = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
);

/**
 * Fetch multiple ERC20 allowances in a single multicall.
 *
 * @example
 * const allowances = await fetchAllowances(
 *   "0xUser...",
 *   [{ token: "0xToken...", spender: "0xRouter..." }],
 *   56,
 * );
 * console.log(allowances[0].isMaxApproved); // true
 */
export async function fetchAllowances(
  ownerAddress: Address,
  pairs: Array<{ token: Address; spender: Address }>,
  chainId: number = bsc.id,
): Promise<AllowanceResult[]> {
  if (pairs.length === 0) return [];

  const client = getPublicClient(chainId);

  const calls = pairs.map(({ token, spender }) => ({
    address: token,
    abi: erc20Abi,
    functionName: "allowance" as const,
    args: [ownerAddress, spender] as const,
  }));

  const results = await client.multicall({
    contracts: calls,
    allowFailure: true,
  });

  return results.map((result, i) => {
    const allowance =
      result.status === "success" ? (result.result as bigint) : BigInt(0);
    return {
      token: pairs[i].token,
      spender: pairs[i].spender,
      allowance,
      isMaxApproved: allowance >= MAX_UINT256 / BigInt(2),
    };
  });
}

// =================================================
//           GENERIC MULTICALL (advanced)
// =================================================

/**
 * Execute arbitrary contract reads in a single multicall batch.
 * Use this for custom reads beyond balances/allowances.
 *
 * @example
 * const results = await batchRead([
 *   { address: poolAddr, abi: poolAbi, functionName: "slot0" },
 *   { address: poolAddr, abi: poolAbi, functionName: "liquidity" },
 * ], 56);
 */
export async function batchRead<T extends readonly unknown[]>(
  contracts: Parameters<PublicClient["multicall"]>[0]["contracts"],
  chainId: number = bsc.id,
): Promise<T> {
  const client = getPublicClient(chainId);
  const results = await client.multicall({
    contracts,
    allowFailure: true,
  });
  return results as unknown as T;
}
