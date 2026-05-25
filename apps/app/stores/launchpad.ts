import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  LaunchpadState,
  MissingField,
  TokenApiStatus,
} from "@/types/interfaces";
import { saveToken } from "@/services/token";
import { savePool } from "@/services/pool-api";
import {
  WBNB_ADDRESS,
  WBNB_DECIMALS,
  DEFAULT_LAUNCHPAD_PROTOCOL,
  DEFAULT_LAUNCHPAD_POOL_VERSION,
  DEFAULT_POOL_FEE,
} from "@/types/constants";

function deriveStatus(args: {
  contractAddress?: string;
  transactionHash?: string;
}): TokenApiStatus {
  if (args.contractAddress) return "deployed";
  if (args.transactionHash) return "pending";
  return "pending";
}

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
      // Mirror the on-chain default the factory uses for fresh deploys
      // (30 days). The form's <Select> overrides this when the user
      // picks a different option, but seeding here means the deployVault
      // call always carries a non-zero deadline — required by the
      // contract even when presale is disabled.
      presaleDuration: "2592000",
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

        if (!s.tokenName.trim())
          missing.push({ key: "tokenName", path: "/launchpad/token" });
        if (!s.tokenSymbol.trim())
          missing.push({ key: "tokenSymbol", path: "/launchpad/token" });
        if (!s.floorPrice || Number(s.floorPrice) <= 0)
          missing.push({ key: "floorPrice", path: "/launchpad/pool" });
        if (!s.totalSupply || Number(s.totalSupply) <= 0)
          missing.push({ key: "totalSupply", path: "/launchpad/pool" });

        return missing;
      },

      isReadyToDeploy: (): boolean => {
        return get().getMissingFields().length === 0;
      },

      // `auth` is the EIP-191 header bundle the backend AuthGuard expects
      // (`x-address`, `x-signature`, `x-message`). The store cannot invoke
      // wagmi hooks itself, so the React caller signs and passes them in.
      //
      // Backend derives deployerAddress from the signature; we no longer
      // send it in the body.
      saveTokenMetadata: async ({
        auth,
        contractAddress,
        vaultAddress,
        poolAddress,
        transactionHash,
      }) => {
        const s = get();
        if (!s.tokenSymbol) {
          throw new Error("saveTokenMetadata: tokenSymbol is required");
        }

        // `tokenLogoUrl` actually holds a base64 data URL (FileUpload writes
        // it that way). Keeping the state field name for compatibility but
        // mapping to the API's `logoBase64` to match the DTO contract.
        await saveToken(
          {
            tokenName: s.tokenName,
            tokenSymbol: s.tokenSymbol,
            tokenDescription: s.tokenDescription,
            tokenDecimals: s.tokenDecimals,
            tokenSupply: s.totalSupply,
            price: s.floorPrice,
            floorPrice: s.floorPrice,
            protocol: s.protocol,
            // Only persist presale config when the user actually enabled it.
            // Avoids storing ghost defaults (softCapPercent=30, etc.) on
            // tokens that never opted in.
            ...(s.enablePresale && {
              presaleEnabled: true,
              presalePrice: s.floorPrice,
              softCapPercent: s.softCapPercent,
              presaleDuration: s.presaleDuration,
            }),
            vaultAddress,
            poolAddress,
            contractAddress,
            transactionHash,
            status: deriveStatus({ contractAddress, transactionHash }),
            websiteUrl: s.website,
            twitterHandle: s.twitter,
            discordInvite: s.discord,
            logoBase64: s.tokenLogoUrl,
          },
          auth,
        );

        // savePool is best-effort: if it fails after saveToken succeeded, the
        // token row already exists with status=deployed. We surface the
        // failure to the caller so the wizard can offer a manual retry, but
        // we don't roll back the token (would need a transactional endpoint).
        if (poolAddress && contractAddress) {
          try {
            await savePool(
              {
                name: `${s.tokenSymbol}/WBNB`,
                address: poolAddress,
                protocol: s.protocol || DEFAULT_LAUNCHPAD_PROTOCOL,
                version: DEFAULT_LAUNCHPAD_POOL_VERSION,
                token0Address: contractAddress,
                token0Symbol: s.tokenSymbol,
                token0Decimals: s.tokenDecimals,
                token1Address: WBNB_ADDRESS,
                token1Symbol: "WBNB",
                token1Decimals: WBNB_DECIMALS,
                feeTier: DEFAULT_POOL_FEE,
                vaultAddress,
                enabled: true,
              },
              auth,
            );
          } catch (err) {
            console.error(
              "[launchpad] savePool failed after saveToken succeeded — pool row not persisted, retry needed",
              { poolAddress, contractAddress, err },
            );
            throw err;
          }
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
          presaleDuration: "2592000",
          softCapPercent: 30,
          completedSteps: [],
        }),
    }),
    {
      name: "launchpad-store",
      version: 1,
    },
  ),
);
