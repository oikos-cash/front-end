import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

import { WALLETCONNECT_PROJECT_ID } from "@/types/constants";

export const wagmiConfig = createConfig({
  connectors:
    typeof window !== "undefined" && WALLETCONNECT_PROJECT_ID
      ? [injected(), walletConnect({ projectId: WALLETCONNECT_PROJECT_ID })]
      : [injected()],
  chains: [bsc, bscTestnet],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
