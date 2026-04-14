import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { bsc } from "viem/chains";

const POOL_ADDRESS = "0x7862d9b4be2156b15d54f41ee4ede2d5b0b455e4" as Address;

const POOL_ABI = [
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const client = createPublicClient({
  chain: bsc,
  transport: http(),
});

/**
 * GET /api/price/bnb
 *
 * Reads BNB/USD price directly from PancakeSwap V3 WBNB/USDT pool on BSC.
 * No database needed — pure blockchain read.
 */
export async function GET() {
  try {
    const result = await client.readContract({
      address: POOL_ADDRESS,
      abi: POOL_ABI,
      functionName: "slot0",
    });

    const sqrtPriceX96 = result[0];
    const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
    const price = sqrtPrice * sqrtPrice * 10 ** 12;

    if (price < 0.01 || price > 100_000) {
      return NextResponse.json(
        { error: "Price out of valid range" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { price, timestamp: Date.now() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read price from blockchain", details: String(err) },
      { status: 502 },
    );
  }
}
