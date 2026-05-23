import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";

// Hooks
import { useTranslations } from "next-intl";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { usePoolState, useVaultPositions, useVaultFees } from "@/hooks/use-pool-state";
import { useSpotPrice } from "@/hooks/use-spot-price";

// Types
import type { VaultInfo, LiquidityData } from "@/types/interfaces";
import { formatCompactNumber } from "@/utils/number";

/**
 * Manages liquidity page state with real data integration.
 * Falls back to mock data when no vault is provided.
 */
export function useLiquidity(initialVault: VaultInfo | null = null) {
  const t = useTranslations("liquidity");
  const hasVault = initialVault !== null;

  const [selectedPool, setSelectedPool] = useState(
    initialVault?.tokenSymbol?.toLowerCase() ?? "oks",
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // ----- P5: BNB price for USD -----
  const { bnbPrice } = useBnbPrice();

  // ----- 3.2: Pool state (slot0 + liquidity) -----
  const poolAddress = initialVault?.poolAddress as Address | undefined;
  const vaultAddress = initialVault?.address as Address | undefined;

  const { poolState } = usePoolState(poolAddress);

  // ----- 3.3 + 3.4: Vault positions + fees -----
  const { positions } = useVaultPositions(vaultAddress);
  const { fees } = useVaultFees(vaultAddress);

  // ----- 3.8: live price via SWR poll of /api/price -----
  const { price: livePrice } = useSpotPrice(initialVault?.poolAddress);

  // Build LiquidityData from real data (null when no vault)
  const data: LiquidityData | null = useMemo(() => {
    if (!hasVault || !initialVault) return null;

    // poolState.sqrtPriceX96 is a real Uniswap sqrtPriceX96 → (val/2^96)^2
    // vault.spotPriceX96 is stored as wei-denominated BNB price → val/1e18
    let spotBnb = 0;
    if (poolState?.sqrtPriceX96 && poolState.sqrtPriceX96 > BigInt(0)) {
      const sqrtPrice = Number(poolState.sqrtPriceX96) / 2 ** 96;
      spotBnb = sqrtPrice * sqrtPrice;
    } else {
      const vaultPrice = BigInt(initialVault.spotPriceX96 || "0");
      spotBnb = vaultPrice > BigInt(0) ? Number(vaultPrice) / 1e18 : 0;
    }
    const currentSpot = livePrice ?? spotBnb;
    const spotPrice = currentSpot * bnbPrice;

    const liquidityRatio = parseFloat(initialVault.liquidityRatio || "0");
    const decimals = parseInt(initialVault.tokenDecimals || "18", 10);
    const rawCirculating = parseFloat(
      initialVault.circulatingSupply || initialVault.token0CirculatingSupply || "0",
    );
    const circulatingSupply = rawCirculating / 10 ** decimals;
    const imvPrice = spotPrice * 0.44;

    const bars = positions.map((pos) => {
      const zone = pos.zone;
      const fill =
        zone === "floor"
          ? "#f5c843"
          : zone === "anchor"
            ? "#d4a84b"
            : "#86efac";
      const amt0 = Number(pos.amount0) / 1e18;
      const amt1 = Number(pos.amount1) / 1e18;
      // Use Uniswap V3 liquidity (L) for the bar height — that's the
      // concentrated-depth measure the reference renders. Total $ value
      // looks wrong because the wide Discovery range dwarfs the tight
      // Floor's value even though the Floor has way more depth-per-tick.
      //
      //   P ≤ Pa (all token0): L = amt0 · √Pa · √Pb / (√Pb − √Pa)
      //   P ≥ Pb (all token1): L = amt1 / (√Pb − √Pa)
      //   in range:            L = amt1 / (√P − √Pa)
      const lowerPrice = tickToPrice(pos.lowerTick);
      const upperPrice = tickToPrice(pos.upperTick);
      const sqrtA = Math.sqrt(lowerPrice);
      const sqrtB = Math.sqrt(upperPrice);
      const sqrtP = Math.sqrt(currentSpot);
      let liquidity = 0;
      if (sqrtB > sqrtA) {
        if (sqrtP <= sqrtA) {
          liquidity = (amt0 * sqrtA * sqrtB) / (sqrtB - sqrtA);
        } else if (sqrtP >= sqrtB) {
          liquidity = amt1 / (sqrtB - sqrtA);
        } else {
          // Inside the range — both formulas yield the same L when amounts
          // are correct; take the larger to dodge floating-point drift near
          // a boundary.
          const fromAmt0 = (amt0 * sqrtP * sqrtB) / (sqrtB - sqrtP);
          const fromAmt1 = amt1 / (sqrtP - sqrtA);
          liquidity = Math.max(fromAmt0, fromAmt1);
        }
      }
      return {
        name: zone.charAt(0).toUpperCase() + zone.slice(1),
        from: lowerPrice,
        to: upperPrice,
        height: liquidity > 0 && isFinite(liquidity) ? liquidity : 0,
        fill,
        amount0: amt0,
        amount1: amt1,
      };
    });

    // Build details table from position data
    const posMap: Record<string, { amt0: number; amt1: number; lower: number; upper: number }> = {};
    for (const pos of positions) {
      posMap[pos.zone] = {
        amt0: Number(pos.amount0) / 1e18,
        amt1: Number(pos.amount1) / 1e18,
        lower: pos.lowerTick,
        upper: pos.upperTick,
      };
    }

    const fmt = (n: number, d = 4) => n > 0 ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "0";
    const fmtPrice = (tick: number) => tickToPrice(tick).toFixed(8);
    const f = posMap.floor ?? { amt0: 0, amt1: 0, lower: 0, upper: 0 };
    const a = posMap.anchor ?? { amt0: 0, amt1: 0, lower: 0, upper: 0 };
    const d = posMap.discovery ?? { amt0: 0, amt1: 0, lower: 0, upper: 0 };

    const details: LiquidityData["details"] = [
      { label: "reservesWbnb", floor: fmt(f.amt1, 6), anchor: fmt(a.amt1, 6), discovery: fmt(d.amt1, 6) },
      { label: "reservesToken", floor: fmt(f.amt0, 2), anchor: fmt(a.amt0, 2), discovery: fmt(d.amt0, 2) },
      { label: "tickRange", floor: `${fmtPrice(f.lower)} – ${fmtPrice(f.upper)}`, anchor: `${fmtPrice(a.lower)} – ${fmtPrice(a.upper)}`, discovery: `${fmtPrice(d.lower)} – ${fmtPrice(d.upper)}` },
    ];

    return {
      spotPrice,
      spotBnb: currentSpot,
      liquidityRatio,
      circulatingSupply,
      imvPrice,
      bars,
      details,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVault, initialVault, poolState, positions, livePrice, bnbPrice, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  function handlePoolChange(v: string) {
    setSelectedPool(v);
    setRefreshKey((k) => k + 1);
  }

  // Mirror the exchange page's KPI formatting:
  //  • USD prices get a $ prefix and 4 decimals.
  //  • Token-count values use compact K / M / B notation.
  //  • Secondary lines surface the BNB-denominated counterpart in the
  //    same `<value> <unit>` pattern as exchange KPIs.
  const tokenSymbol = initialVault?.tokenSymbol ?? "OKS";
  const kpiCards = data
    ? [
        {
          key: "spotPrice",
          value: `$${data.spotPrice.toFixed(4)}`,
          secondary: `${data.spotBnb.toFixed(8)} ${tokenSymbol}/BNB`,
        },
        {
          key: "liquidityRatio",
          value: data.liquidityRatio.toFixed(4),
          secondary: t("protocolHealth"),
        },
        {
          key: "circulatingSupply",
          value: formatCompactNumber(data.circulatingSupply),
          secondary: tokenSymbol,
        },
        {
          key: "imvPrice",
          value: `$${data.imvPrice.toFixed(4)}`,
          secondary: t("floorProtection"),
        },
      ]
    : [];

  return {
    t,
    data,
    selectedPool,
    handlePoolChange,
    handleRefresh,
    kpiCards,
    positions,
    fees,
    bnbPrice,
  };
}

/** Convert tick to approximate price (simplified). */
function tickToPrice(tick: number): number {
  return 1.0001 ** tick;
}
