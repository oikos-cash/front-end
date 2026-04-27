"use client";

import { useMemo } from "react";
import useSWR from "swr";

// Hooks
import { useTranslations } from "next-intl";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useExchangeWS } from "@/hooks/use-exchange-ws";

// Types
import type { VaultInfo } from "@/types/interfaces";

// Utils
import { formatCompactNumber } from "@/utils/number";
import { swrFetcher } from "@/utils/fetcher";
import { OHLC_API_URL } from "@/types/constants";

interface OHLCCandle {
  timestamp: number;
  open: number;
  close: number;
  volume: number;
}

interface OHLCStats {
  change24h: number;
  volume30d: number;
}

async function fetchOHLCStats(poolAddress: string): Promise<OHLCStats> {
  try {
    const data = await swrFetcher<{ ohlc: OHLCCandle[] }>(
      `${OHLC_API_URL}?interval=1h&pool=${poolAddress}`,
    );
    const candles = data.ohlc ?? [];
    const now = Date.now();
    const from24h = now - 86_400_000;
    const from30d = now - 30 * 86_400_000;

    const candles24h = candles.filter((c) => c.timestamp >= from24h);
    const candles30d = candles.filter((c) => c.timestamp >= from30d);

    let change24h = 0;
    if (candles24h.length >= 2) {
      const first = candles24h[0].open;
      const last = candles24h[candles24h.length - 1].close;
      if (first > 0 && isFinite(first) && isFinite(last)) {
        change24h = ((last - first) / first) * 100;
      }
    }

    const volume30d = candles30d.reduce((sum, c) => sum + (c.volume || 0), 0);

    return { change24h, volume30d };
  } catch {
    return { change24h: 0, volume30d: 0 };
  }
}

/**
 * Computes Exchange KPI cards from SSR vault data + live WS updates + BNB price.
 * Priority: WS live price → WS stats price → SSR spotPriceX96.
 */
export function useExchangeKpis(initialVault: VaultInfo | null) {
  const t = useTranslations("home");
  const { bnbPrice, isLoading: bnbLoading } = useBnbPrice();
  const { stats, livePrice } = useExchangeWS(initialVault?.poolAddress);

  const { data: ohlcStats } = useSWR(
    initialVault?.poolAddress
      ? `ohlc-stats-${initialVault.poolAddress}`
      : null,
    () => fetchOHLCStats(initialVault!.poolAddress),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const kpis = useMemo(() => {
    const spotPriceX96 = BigInt(initialVault?.spotPriceX96 || "0");
    const ssrPrice =
      spotPriceX96 > BigInt(0)
        ? Number(spotPriceX96) / 1e18
        : 0;

    const currentPrice = livePrice ?? stats?.currentPrice ?? ssrPrice;
    const priceUsd = currentPrice * bnbPrice;

    const volume30dBnb = ohlcStats?.volume30d ?? stats?.volume24h ?? 0;
    const volumeUsd = volume30dBnb * bnbPrice;

    const change24h = ohlcStats?.change24h ?? stats?.priceChange24h ?? 0;
    const changeStr =
      change24h >= 0
        ? `+${change24h.toFixed(2)}%`
        : `${change24h.toFixed(2)}%`;

    const decimals = parseInt(initialVault?.tokenDecimals || "18", 10);
    const rawSupply = parseFloat(
      initialVault?.circulatingSupply ||
        initialVault?.token0CirculatingSupply ||
        "0",
    );
    const circulatingSupply = rawSupply / 10 ** decimals;
    const marketCapUsd = priceUsd * circulatingSupply;
    const marketCapBnb = currentPrice * circulatingSupply;
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
        secondary: `${formatCompactNumber(volume30dBnb)} BNB`,
      },
      {
        key: "marketCap",
        value: `$${formatCompactNumber(marketCapUsd)}`,
        secondary: `${formatCompactNumber(marketCapBnb)} BNB`,
      },
      {
        key: "imv",
        value: `$${(priceUsd * 0.44).toFixed(4)}`,
        subtitle: "(44% OF SPOT)",
        secondary: `${(currentPrice * 0.44).toFixed(8)} ${symbol}/BNB`,
      },
    ];
  }, [initialVault, livePrice, stats, bnbPrice, ohlcStats]);

  const isLoading = bnbLoading || !initialVault;

  return { kpis, t, isLoading };
}
