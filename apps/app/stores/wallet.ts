"use client";

import { useMemo } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { Address } from "viem";

import { useBalances } from "@/hooks/use-balances";
import { useBnbPrice } from "@/hooks/use-bnb-price";

import type { WalletState, TokenBalance } from "@/types/interfaces";
import { SUPPORTED_CHAIN_IDS } from "@/types/constants";

/** WBNB on BSC Mainnet */
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as Address;

export function useWallet(): WalletState {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { bnbPrice } = useBnbPrice();

  const isCorrectNetwork =
    chainId != null &&
    (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);

  // Fetch native BNB + WBNB balance
  const { native, tokens: tokenMap, isLoading: isBalancesLoading } = useBalances(
    address as Address | undefined,
    [WBNB_ADDRESS],
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

    return result;
  }, [isConnected, native, tokenMap, bnbPrice]);

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
