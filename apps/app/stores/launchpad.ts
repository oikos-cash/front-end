import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LaunchpadState, MissingField } from "@/types/interfaces";

export const useLaunchpadStore = create<LaunchpadState>()(
  persist(
    (set, get) => ({
      tokenName: "",
      tokenSymbol: "",
      tokenDescription: "",
      tokenDecimals: 18,
      enablePresale: false,
      tokenLogoUrl: "",
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

      reset: () =>
        set({
          tokenName: "",
          tokenSymbol: "",
          tokenDescription: "",
          tokenDecimals: 18,
          enablePresale: false,
          tokenLogoUrl: "",
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
