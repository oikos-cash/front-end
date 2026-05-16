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

  // Active pair = first vault returned by the backend (same convention TradePanel uses).
  // Shared SWR key dedupes the request when both panels mount.
  const { data: vaults } = useSWR<VaultInfo[]>(
    `${VAULT_API_URL}/vaults`,
    swrFetcher,
    { errorRetryCount: 0, revalidateOnFocus: false },
  );
  const activeVault = vaults?.[0] ?? null;
  const pairToken =
    activeVault?.token0 &&
    activeVault.token0.toLowerCase() !== WBNB_ADDRESS.toLowerCase()
      ? (activeVault.token0 as Address)
      : null;

  const tokenList = useMemo<Address[]>(() => {
    const list: Address[] = [WBNB_ADDRESS as Address];
    if (pairToken) list.push(pairToken);
    return list;
  }, [pairToken]);

  const { native, tokens: tokenMap, isLoading: isBalancesLoading } = useBalances(
    address as Address | undefined,
    tokenList,
    chainId ?? undefined,
  );

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

    const wbnb = tokenMap[WBNB_ADDRESS.toLowerCase()];
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

    if (pairToken && activeVault) {
      const pair = tokenMap[pairToken.toLowerCase()];
      if (pair && pair.balance > BigInt(0)) {
        const pairAmount = parseFloat(pair.formatted);
        // spotPriceX96 here is stored as wei-denominated BNB price (see use-exchange-kpis.ts).
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
  }, [isConnected, native, tokenMap, bnbPrice, pairToken, activeVault]);

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
    totalValue,
    handleConnect: () => openConnectModal?.(),
    handleDisconnect: () => disconnect(),
  };
}
