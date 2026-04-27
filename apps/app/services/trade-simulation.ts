import { type Address, encodeFunctionData, decodeFunctionResult } from "viem";
import { getPublicClient } from "@/services/multicall";

/**
 * Quoter V2 ABI fragment for quoteExactInputSingle.
 */
const QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface TradeQuote {
  amountOut: bigint;
  sqrtPriceX96After: bigint;
  gasEstimate: bigint;
  priceImpact: number;
}

/**
 * Simulate a trade using the Quoter V2 contract to get exact output,
 * price after, and gas estimate.
 *
 * @example
 * const quote = await simulateTrade({
 *   quoterAddress: "0x...",
 *   tokenIn: "0xWBNB...",
 *   tokenOut: "0xOKS...",
 *   amountIn: parseEther("1"),
 *   fee: 3000,
 *   currentSqrtPriceX96: BigInt("..."),
 *   chainId: 56,
 * });
 */
export async function simulateTrade(params: {
  quoterAddress: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  fee: number;
  currentSqrtPriceX96?: bigint;
  chainId?: number;
}): Promise<TradeQuote> {
  const client = getPublicClient(params.chainId ?? 56);

  const result = (await client.readContract({
    address: params.quoterAddress,
    abi: QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        fee: params.fee,
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
  })) as [bigint, bigint, number, bigint];

  const [amountOut, sqrtPriceX96After, , gasEstimate] = result;

  // Calculate price impact
  let priceImpact = 0;
  if (params.currentSqrtPriceX96 && params.currentSqrtPriceX96 > BigInt(0)) {
    const priceBefore =
      Number(params.currentSqrtPriceX96) / 2 ** 96;
    const priceAfter = Number(sqrtPriceX96After) / 2 ** 96;
    priceImpact = Math.abs(
      ((priceAfter * priceAfter - priceBefore * priceBefore) /
        (priceBefore * priceBefore)) *
        100,
    );
  }

  return { amountOut, sqrtPriceX96After, gasEstimate, priceImpact };
}

/**
 * Calculate minimum received after slippage.
 */
export function calculateMinReceived(
  amountOut: bigint,
  slippageBps: number,
): bigint {
  return amountOut - (amountOut * BigInt(slippageBps)) / BigInt(10000);
}
