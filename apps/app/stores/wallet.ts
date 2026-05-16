"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { Address } from "viem";

import { useBalances } from "@/hooks/use-balances";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { swrFetcher } from "@/utils/fetcher";

import type { WalletState, TokenBalance, VaultInfo } from "@/types/interfaces";
import {
  SUPPORTED_CHAIN_IDS,
  VAULT_API_URL,
  WBNB_ADDRESS,
} from "@/types/constants";

export function useWallet(): WalletState {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { bnbPrice } = useBnbPrice();

  const isCorrectNetwork =
    chainId != null &&
    (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);

  // Shared SWR key with TradePanel / swap page — no extra request.
  const { data: vaults } = useSWR<VaultInfo[]>(
    `${VAULT_API_URL}/vaults`,
    swrFetcher,
    { errorRetryCount: 0, revalidateOnFocus: false },
  );
  const activeVault = vaults?.[0] ?? null;
  const wbnbLower = WBNB_ADDRESS.toLowerCase();

  // Fetch WBNB + every vault token0 so any panel can look up its source token's balance.
  const tokenList = useMemo<Address[]>(() => {
    const seen = new Set<string>([wbnbLower]);
    const list: Address[] = [WBNB_ADDRESS as Address];
    for (const v of vaults ?? []) {
      const addr = v.token0?.toLowerCase();
      if (addr && !seen.has(addr)) {
        seen.add(addr);
        list.push(v.token0 as Address);
      }
    }
    return list;
  }, [vaults, wbnbLower]);

  const { native, tokens: tokenMap, isLoading: isBalancesLoading } = useBalances(
    address as Address | undefined,
    tokenList,
    chainId ?? undefined,
  );

  const tokenBalances = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [addr, info] of Object.entries(tokenMap)) {
      out[addr] = info.formatted;
    }
    return out;
  }, [tokenMap]);

  const balances = useMemo<TokenBalance[]>(() => {
    if (!isConnected || !native) return [];

    const bnbAmount = parseFloat(native.formatted);
    const bnbUsd = bnbAmount * bnbPrice;

    const result: TokenBalance[] = [
      {
        token: "BNB",
        iconUrl:
          "https://assets-cdn.trustwallet.com/blockchains/binance/info/logo.png",
        amount: bnbAmount.toFixed(4),
        usd: `$${bnbUsd.toFixed(2)}`,
      },
    ];

    const wbnb = tokenMap[wbnbLower];
    if (wbnb && wbnb.balance > BigInt(0)) {
      const wbnbAmount = parseFloat(wbnb.formatted);
      const wbnbUsd = wbnbAmount * bnbPrice;
      result.push({
        token: "WBNB",
        iconUrl:
          "https://assets-cdn.trustwallet.com/blockchains/binance/info/logo.png",
        amount: wbnbAmount.toFixed(4),
        usd: `$${wbnbUsd.toFixed(2)}`,
      });
    }

    if (
      activeVault &&
      activeVault.token0 &&
      activeVault.token0.toLowerCase() !== wbnbLower
    ) {
      const pair = tokenMap[activeVault.token0.toLowerCase()];
      if (pair && pair.balance > BigInt(0)) {
        const pairAmount = parseFloat(pair.formatted);
        const priceBnb =
          Number(BigInt(activeVault.spotPriceX96 || "0")) / 1e18;
        const pairUsd = pairAmount * priceBnb * bnbPrice;
        result.push({
          token: activeVault.tokenSymbol,
          iconUrl: "",
          amount: pairAmount.toFixed(4),
          usd: `$${pairUsd.toFixed(2)}`,
        });
      }
    }

    return result;
  }, [isConnected, native, tokenMap, bnbPrice, activeVault, wbnbLower]);

  const totalValue = useMemo(() => {
    if (balances.length === 0) return "$0.00";
    const total = balances.reduce(
      (sum, b) => sum + parseFloat(b.usd.replace("$", "")),
      0,
    );
    return `$${total.toFixed(2)}`;
  }, [balances]);

  return {
    isConnected,
    isBalancesLoading,
    address: address ?? null,
    chainId: chainId ?? null,
    isCorrectNetwork,
    balances,
    tokenBalances,
    totalValue,
    handleConnect: () => openConnectModal?.(),
    handleDisconnect: () => disconnect(),
  };
}
