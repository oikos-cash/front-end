import { create } from "zustand";
import { WalletState } from "@/types/interfaces";

export const useWallet = create<WalletState>((set) => ({
  isConnected: false,
  address: null,
  balances: [],
  totalValue: "$0.00",

  handleConnect: () =>
    set({
      isConnected: true,
      address: "0x1234...abcd",
      balances: [
        {
          token: "BNB",
          iconUrl:
            "https://assets-cdn.trustwallet.com/blockchains/binance/info/logo.png",
          amount: "0.0100",
          usd: "$6.50",
        },
      ],
      totalValue: "$6.50",
    }),

  handleDisconnect: () =>
    set({
      isConnected: false,
      address: null,
      balances: [],
      totalValue: "$0.00",
    }),
}));
