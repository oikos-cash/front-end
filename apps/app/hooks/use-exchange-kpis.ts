"use client";

import { useMemo } from "react";

// Hooks
import { useTranslations } from "next-intl";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useExchangeWS } from "@/hooks/use-exchange-ws";

// Types
import type { VaultInfo } from "@/types/interfaces";

// Utils
import { formatCompactNumber } from "@/utils/number";

/**
 * Computes Exchange KPI cards from SSR vault data + live WS updates + BNB price.
 * Priority: WS live price → WS stats price → SSR spotPriceX96.
 */
export function useExchangeKpis(initialVault: VaultInfo | null) {
  const t = useTranslations("home");
  const { bnbPrice } = useBnbPrice();
  const { stats, livePrice } = useExchangeWS(initialVault?.poolAddress);

  const kpis = useMemo(() => {
    const spotPriceX96 = BigInt(initialVault?.spotPriceX96 || "0");
    const ssrPrice =
      spotPriceX96 > BigInt(0)
        ? (Number(spotPriceX96) / 2 ** 96) ** 2
        : 0;

    const currentPrice = livePrice ?? stats?.currentPrice ?? ssrPrice;
    const priceUsd = currentPrice * bnbPrice;

    const volume24h = stats?.volume24h ?? 0;
    const volumeUsd = volume24h * bnbPrice;

    const change24h = stats?.priceChange24h ?? 0;
    const changeStr =
      change24h >= 0
        ? `+${change24h.toFixed(2)}%`
        : `${change24h.toFixed(2)}%`;

    const circulatingSupply = parseFloat(
      initialVault?.circulatingSupply ||
        initialVault?.token0CirculatingSupply ||
        "0",
    );
    const marketCapUsd = priceUsd * circulatingSupply;
    const symbol = initialVault?.tokenSymbol ?? "OKS";

    return [
      {
        key: "spot",
        value: `$${priceUsd.toFixed(4)}`,
        change: changeStr,
        secondary: `${currentPrice.toFixed(8)} ${symbol}/BNB`,
      },
      {
        key: "volume",
        value: `$${formatCompactNumber(volumeUsd)}`,
        secondary: `${formatCompactNumber(volume24h)} BNB`,
      },
      {
        key: "marketCap",
        value: `$${formatCompactNumber(marketCapUsd)}`,
        secondary: `${formatCompactNumber(marketCapUsd / bnbPrice)} BNB`,
      },
      {
        key: "imv",
        value: `$${(priceUsd * 0.44).toFixed(4)}`,
        subtitle: "(44% OF SPOT)",
        secondary: `${(currentPrice * 0.44).toFixed(8)} ${symbol}/BNB`,
      },
    ];
  }, [initialVault, livePrice, stats, bnbPrice]);

  return { kpis, t };
}
