import {
  getAbi,
  getAddress as getProtocolAddress,
  isSupported,
} from "@oikos/core-addresses";
import { bsc } from "wagmi/chains";
import type { Abi, Address } from "viem";

/**
 * Look up an Oikos protocol address for a given chain. Returns undefined
 * instead of throwing when the chain has no bundled deployment, so callers
 * can degrade gracefully on testnet / unsupported chains.
 */
export function getOikosAddress(
  chainId: number,
  name: string,
): Address | undefined {
  if (!isSupported(chainId)) return undefined;
  try {
    return getProtocolAddress(chainId, name) as Address;
  } catch {
    return undefined;
  }
}

// Mainnet defaults — for module-init / SSR contexts that can't read chainId
// reactively. Switch to getOikosAddress(chainId, …) once multi-chain matters.
export const FACTORY_ADDRESS = getProtocolAddress(bsc.id, "Factory") as Address;
export const EXCHANGE_HELPER_ADDRESS = getProtocolAddress(
  bsc.id,
  "ExchangeHelper",
) as Address;
export const MODEL_HELPER_ADDRESS = getProtocolAddress(
  bsc.id,
  "ModelHelper",
) as Address;

export const FACTORY_ABI = getAbi("Factory") as Abi;
export const EXCHANGE_HELPER_ABI = getAbi("ExchangeHelper") as Abi;
export const MODEL_HELPER_ABI = getAbi("ModelHelper") as Abi;
