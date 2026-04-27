import { type Address } from "viem";
import { getPublicClient } from "@/services/multicall";

// -------------------------------------------------------
//                      POOL ABI
// -------------------------------------------------------

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
  {
    inputs: [],
    name: "liquidity",
    outputs: [{ name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// -------------------------------------------------------
//                   VAULT ABI (positions)
// -------------------------------------------------------

const VAULT_POSITIONS_ABI = [
  {
    inputs: [],
    name: "getPositions",
    outputs: [
      {
        components: [
          { name: "lowerTick", type: "int24" },
          { name: "upperTick", type: "int24" },
          { name: "liquidity", type: "uint128" },
          { name: "price", type: "uint256" },
          { name: "tickSpacing", type: "int24" },
        ],
        name: "positions",
        type: "tuple[3]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "liquidityType", type: "uint8" }],
    name: "getUnderlyingBalances",
    outputs: [
      { name: "", type: "int24" },
      { name: "", type: "int24" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAccumulatedFees",
    outputs: [
      { name: "fees0", type: "uint256" },
      { name: "fees1", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// -------------------------------------------------------
//                     POOL WRITES ABI
// -------------------------------------------------------

export const POOL_WRITE_ABI = [
  {
    inputs: [
      { name: "recipient", type: "address" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "amount", type: "uint128" },
      { name: "data", type: "bytes" },
    ],
    name: "mint",
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "amount", type: "uint128" },
    ],
    name: "burn",
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "recipient", type: "address" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "amount0Requested", type: "uint128" },
      { name: "amount1Requested", type: "uint128" },
    ],
    name: "collect",
    outputs: [
      { name: "amount0", type: "uint128" },
      { name: "amount1", type: "uint128" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// -------------------------------------------------------
//                     READ FUNCTIONS
// -------------------------------------------------------

export interface PoolState {
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
}

export interface VaultPosition {
  zone: "floor" | "anchor" | "discovery";
  lowerTick: number;
  upperTick: number;
  liquidity: bigint;
  price: bigint;
  tickSpacing: number;
  amount0: bigint;
  amount1: bigint;
}

export interface VaultFees {
  fees0: bigint;
  fees1: bigint;
}

/**
 * Read pool slot0 + liquidity in one multicall.
 */
export async function readPoolState(
  poolAddress: Address,
  chainId?: number,
): Promise<PoolState> {
  const client = getPublicClient(chainId ?? 56);

  const [slot0Result, liquidityResult] = await Promise.all([
    client.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: "slot0",
    }),
    client.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: "liquidity",
    }),
  ]);

  return {
    sqrtPriceX96: slot0Result[0],
    tick: slot0Result[1],
    liquidity: liquidityResult,
  };
}

/**
 * Read the 3 vault positions (Floor, Anchor, Discovery).
 */
export async function readVaultPositions(
  vaultAddress: Address,
  chainId?: number,
): Promise<VaultPosition[]> {
  const client = getPublicClient(chainId ?? 56);
  const zones = ["floor", "anchor", "discovery"] as const;

  try {
    // Use getUnderlyingBalances for each zone (0=Floor, 1=Anchor, 2=Discovery)
    // This returns ticks + real amounts, which is what the chart needs
    const results = await Promise.all(
      zones.map((_, i) =>
        client.readContract({
          address: vaultAddress,
          abi: VAULT_POSITIONS_ABI,
          functionName: "getUnderlyingBalances",
          args: [i],
        }),
      ),
    );

    return results.map((r, i) => {
      const [lowerTick, upperTick, amount0, amount1] = r as [number, number, bigint, bigint];
      return {
        zone: zones[i],
        lowerTick,
        upperTick,
        liquidity: BigInt(0),
        price: BigInt(0),
        tickSpacing: 0,
        amount0,
        amount1,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Read accumulated fees from the vault.
 */
export async function readVaultFees(
  vaultAddress: Address,
  chainId?: number,
): Promise<VaultFees> {
  const client = getPublicClient(chainId ?? 56);

  try {
    const result = (await client.readContract({
      address: vaultAddress,
      abi: VAULT_POSITIONS_ABI,
      functionName: "getAccumulatedFees",
    })) as [bigint, bigint];

    return { fees0: result[0], fees1: result[1] };
  } catch {
    return { fees0: BigInt(0), fees1: BigInt(0) };
  }
}
