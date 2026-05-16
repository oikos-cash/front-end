"use client";

import { useState } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import { bsc, bscTestnet } from "wagmi/chains";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { WALLETCONNECT_PROJECT_ID } from "@/types/constants";

import "@rainbow-me/rainbowkit/styles.css";

const transports = {
  [bsc.id]: http(),
  [bscTestnet.id]: http(),
};

// Server / pre-hydration config: only wagmi-native connectors (SSR-safe).
// Avoids RainbowKit defaults like Coinbase Wallet SDK, which touch indexedDB
// at construction and throw unhandledRejection during server render.
const ssrConfig = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [injected()],
  transports,
  ssr: true,
});

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [wagmiConfig] = useState(() => {
    if (typeof window === "undefined") return ssrConfig;
    return getDefaultConfig({
      appName: "Oikos",
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [bsc, bscTestnet],
      transports,
      ssr: true,
    });
  });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
