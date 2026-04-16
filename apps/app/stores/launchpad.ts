import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LaunchpadState, MissingField } from "@/types/interfaces";
import { saveToken } from "@/services/token";
import { savePool } from "@/services/pool-api";

export const useLaunchpadStore = create<LaunchpadState>()(
  persist(
    (set, get) => ({
      tokenName: "",
      tokenSymbol: "",
      tokenDescription: "",
      tokenDecimals: 18,
      enablePresale: false,
      tokenLogoUrl: "",
      website: "",
      twitter: "",
      discord: "",
      telegram: "",
      floorPrice: "",
      totalSupply: "",
      reserveAsset: "",
      protocol: "",
      presaleDuration: "",
      softCapPercent: 30,
      completedSteps: [],

      setTokenInfo: (data) => set((state) => ({ ...state, ...data })),
      setPoolConfig: (data) => set((state) => ({ ...state, ...data })),
      setPresaleConfig: (data) => set((state) => ({ ...state, ...data })),

      markStepCompleted: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),

      getMissingFields: (): MissingField[] => {
        const s = get();
        const missing: MissingField[] = [];

        if (!s.tokenName.trim()) missing.push({ key: "tokenName", path: "/launchpad/token" });
        if (!s.tokenSymbol.trim()) missing.push({ key: "tokenSymbol", path: "/launchpad/token" });
        if (!s.floorPrice || Number(s.floorPrice) <= 0) missing.push({ key: "floorPrice", path: "/launchpad/pool" });
        if (!s.totalSupply || Number(s.totalSupply) <= 0) missing.push({ key: "totalSupply", path: "/launchpad/pool" });

        return missing;
      },

      isReadyToDeploy: (): boolean => {
        return get().getMissingFields().length === 0;
      },

      saveTokenMetadata: async (deployerAddress, contractAddress, vaultAddress, poolAddress) => {
        const s = get();
        await saveToken({
          tokenName: s.tokenName,
          tokenSymbol: s.tokenSymbol,
          tokenDescription: s.tokenDescription,
          tokenDecimals: String(s.tokenDecimals),
          tokenSupply: s.totalSupply,
          price: s.floorPrice,
          floorPrice: s.floorPrice,
          presalePrice: s.floorPrice,
          token1: "WBNB",
          selectedProtocol: s.protocol,
          presale: s.enablePresale ? "true" : "false",
          softCap: String(s.softCapPercent),
          duration: s.presaleDuration,
          deployerAddress,
          vaultAddress,
          poolAddress,
          tokenAddress: contractAddress,
          websiteUrl: s.website,
          twitterHandle: s.twitter,
          discordInvite: s.discord,
          logoPreview: s.tokenLogoUrl,
        });

        if (poolAddress) {
          await savePool({
            name: `${s.tokenSymbol}/WBNB`,
            address: poolAddress,
            protocol: s.protocol || "uniswap-v3",
            version: "3",
            token0: { symbol: s.tokenSymbol, address: contractAddress ?? "", decimals: s.tokenDecimals },
            token1: { symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
            feeTier: 3000,
            enabled: true,
          });
        }
      },

      reset: () =>
        set({
          tokenName: "",
          tokenSymbol: "",
          tokenDescription: "",
          tokenDecimals: 18,
          enablePresale: false,
          tokenLogoUrl: "",
          website: "",
          twitter: "",
          discord: "",
          telegram: "",
          floorPrice: "",
          totalSupply: "",
          reserveAsset: "",
          protocol: "",
          presaleDuration: "",
          softCapPercent: 30,
          completedSteps: [],
        }),
    }),
    {
      name: "launchpad-store",
    },
  ),
);
