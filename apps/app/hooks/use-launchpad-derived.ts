"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useLaunchpadStore } from "@/stores/launchpad";
import { LAUNCHPAD_STEPS } from "@/types/constants";

/**
 * Multiplier applied to floor price to get the presale price (matches the
 * legacy frontend constant of 1.25).
 */
const PRESALE_PRICE_MULTIPLIER = 1.25;

/** Required fields per step, used for the progress bar. */
function requiredFieldsFilled(
  store: ReturnType<typeof useLaunchpadStore.getState>,
): number {
  let filled = 0;
  if (store.tokenName.trim()) filled++;
  if (store.tokenSymbol.trim()) filled++;
  if (parseFloat(store.floorPrice) > 0) filled++;
  if (parseFloat(store.totalSupply) > 0) filled++;
  if (store.reserveAsset) filled++;
  if (store.protocol) filled++;
  if (store.enablePresale) {
    if (parseInt(store.presaleDuration || "0") > 0) filled++;
  }
  return filled;
}

function totalRequired(
  store: ReturnType<typeof useLaunchpadStore.getState>,
): number {
  // tokenName, tokenSymbol, floorPrice, totalSupply, reserveAsset, protocol
  let total = 6;
  if (store.enablePresale) total++;
  return total;
}

/**
 * Live preview / summary numbers driven by the launchpad store + the
 * current BNB price. Used by the inline Summary card under each step's
 * form and by the sticky Preview panel on the right.
 *
 * Formulas (match legacy frontend):
 *   presalePrice = floorPrice × 1.25
 *   fdvBnb       = totalSupply × floorPrice
 *   marketCapBnb = totalSupply × presalePrice
 */
export function useLaunchpadDerived() {
  const store = useLaunchpadStore();
  const { bnbPrice } = useBnbPrice();
  const pathname = usePathname();

  return useMemo(() => {
    const floor = parseFloat(store.floorPrice) || 0;
    const supply = parseFloat(store.totalSupply) || 0;
    const presalePrice = floor * PRESALE_PRICE_MULTIPLIER;
    const fdvBnb = supply * floor;
    const marketCapBnb = supply * presalePrice;

    const usd = (bnb: number) => bnb * bnbPrice;

    const currentStepIndex = Math.max(
      0,
      LAUNCHPAD_STEPS.findIndex((s) => pathname.endsWith(s.path)),
    );
    const totalSteps = LAUNCHPAD_STEPS.length;
    const filled = requiredFieldsFilled(store);
    const total = totalRequired(store);
    const progressPercent =
      total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;

    return {
      // Raw store values surfaced for convenience
      tokenName: store.tokenName,
      tokenSymbol: store.tokenSymbol,
      tokenLogoUrl: store.tokenLogoUrl,
      protocol: store.protocol,
      reserveAsset: store.reserveAsset,
      enablePresale: store.enablePresale,
      // Numeric inputs
      floorPriceBnb: floor,
      supply,
      // Derived
      presalePriceBnb: presalePrice,
      fdvBnb,
      marketCapBnb,
      // USD-converted (0 when bnbPrice not loaded)
      floorPriceUsd: usd(floor),
      presalePriceUsd: usd(presalePrice),
      fdvUsd: usd(fdvBnb),
      marketCapUsd: usd(marketCapBnb),
      // Progress
      currentStepIndex,
      totalSteps,
      progressPercent,
    };
  }, [store, bnbPrice, pathname]);
}

export type LaunchpadDerived = ReturnType<typeof useLaunchpadDerived>;
