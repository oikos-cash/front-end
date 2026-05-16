"use client";

import { useState } from "react";
import { http, WagmiProvider } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { WALLETCONNECT_PROJECT_ID } from "@/types/constants";

import "@rainbow-me/rainbowkit/styles.css";

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [wagmiConfig] = useState(() =>
    getDefaultConfig({
      appName: "Oikos",
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [bsc, bscTestnet],
      transports: {
        [bsc.id]: http(),
        [bscTestnet.id]: http(),
      },
      ssr: true,
    }),
  );

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
