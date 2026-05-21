"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Card from "@/components/atoms/card";
import Table from "@/components/atoms/table";
import Button from "@/components/atoms/button";
import Tooltip from "@/components/atoms/tooltip";
import Empty from "@/components/atoms/empty";
import Skeleton from "@/components/atoms/skeleton";

// Hooks
import { useTranslations } from "next-intl";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useExchangeWS } from "@/hooks/use-exchange-ws";

// Types
import type { PriceTableToken, VaultInfo, TokenInfo } from "@/types/interfaces";

// Icons
import { RefreshCw, ServerOff } from "lucide-react";

// Utils
import { swrFetcher } from "@/utils/fetcher";
import { VAULT_API_URL, API_BASE_URL, OHLC_API_URL } from "@/types/constants";

interface OHLCCandle {
  timestamp: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

async function fetch24hChange(poolAddress: string): Promise<number> {
  try {
    // Two backend behaviours we have to defend against:
    // 1) The endpoint returns the candles array at the root — no
    //    { ohlc: [...] } envelope. The previous shape produced 0% silently.
    // 2) Passing &from=...&to=... causes the API to return gap-filled
    //    candles where open == close on every row, so the computed change
    //    is always 0. The same endpoint without those params returns the
    //    real candles. Fetch the full series and filter client-side.
    const url = `${OHLC_API_URL}?interval=1h&pool=${poolAddress}`;
    const data = await swrFetcher<OHLCCandle[]>(url);
    const allCandles = Array.isArray(data) ? data : [];
    if (allCandles.length < 2) return 0;

    const from24h = Date.now() - 86_400_000;
    const candles = allCandles.filter((c) => c.timestamp >= from24h);
    if (candles.length < 2) return 0;

    const first = candles[0].open;
    const last = candles[candles.length - 1].close;
    if (first <= 0 || !isFinite(first) || !isFinite(last)) return 0;
    return ((last - first) / first) * 100;
  } catch {
    return 0;
  }
}

async function fetchPriceTable(): Promise<PriceTableToken[]> {
  const [vaults, tokensRes] = await Promise.all([
    swrFetcher<VaultInfo[]>(`${VAULT_API_URL}/vaults`),
    swrFetcher<{ tokens: TokenInfo[] }>(`${API_BASE_URL}/api/tokens`),
  ]);

  const tokenMap = new Map<string, TokenInfo>();
  for (const t of tokensRes.tokens ?? []) {
    if (t.tokenSymbol) tokenMap.set(t.tokenSymbol.toLowerCase(), t);
  }

  const items = vaults.slice(0, 20);

  // Fetch 24h change for each vault's pool in parallel
  const changes = await Promise.all(
    items.map((v) =>
      v.poolAddress ? fetch24hChange(v.poolAddress) : Promise.resolve(0),
    ),
  );

  return items.map((vault, i) => {
    const info = tokenMap.get(vault.tokenSymbol.toLowerCase());
    const spotPriceX96 = BigInt(vault.spotPriceX96 || "0");
    const priceBnb =
      spotPriceX96 > BigInt(0)
        ? Number(spotPriceX96) / 1e18
        : 0;

    const decimals = parseInt(vault.tokenDecimals || "18", 10);
    const rawTotalSupply = parseFloat(vault.token0TotalSupply ?? "0");
    const totalSupply = rawTotalSupply > 0 ? rawTotalSupply / 10 ** decimals : 0;

    return {
      rank: i + 1,
      name: vault.tokenName,
      symbol: vault.tokenSymbol,
      price: priceBnb,
      change24h: changes[i],
      volume24h: 0,
      iconUrl: info?.logoUrl ?? info?.logoPreview,
      poolAddress: vault.poolAddress,
      totalSupply,
    };
  });
}

export default function PriceTable() {
  const t = useTranslations("priceTable");
  const te = useTranslations("error");
  const { bnbPrice } = useBnbPrice();

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "price-table-tokens",
    fetchPriceTable,
    {
      refreshInterval: 60_000,
      errorRetryCount: 0,
      revalidateOnFocus: false,
    },
  );

  const tokens = data ?? [];

  // Get live price from WS for the first token's pool
  const firstPool = tokens[0]?.poolAddress;
  const { livePrice } = useExchangeWS(firstPool);

  // Sidebar variant: drop FDV (lives in the dedicated Markets table) and pack
  // symbol/price/24h into three tight columns so nothing overflows the rail.
  const columns: ColumnDef<PriceTableToken>[] = useMemo(
    () => [
      {
        accessorKey: "symbol",
        header: t("token"),
        cell: ({ row }) => (
          <span className="text-xs font-medium">
            {row.original.symbol ?? row.original.token}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: () => <div className="text-right">{t("price")}</div>,
        cell: ({ row }) => {
          const priceBnb = livePrice ?? (row.getValue("price") as number);
          const priceUsd = priceBnb * bnbPrice;
          const display =
            priceUsd >= 1
              ? `$${priceUsd.toFixed(2)}`
              : priceUsd > 0
                ? `$${priceUsd.toPrecision(4)}`
                : "$0.00";
          return (
            <div className="text-right font-mono text-xs tabular-nums">
              {display}
            </div>
          );
        },
      },
      {
        accessorKey: "change24h",
        header: () => <div className="text-right">{t("24h")}</div>,
        cell: ({ row }) => {
          const change = row.getValue("change24h") as number;
          return (
            <div
              className={`text-right font-mono text-xs tabular-nums ${change >= 0 ? "text-success" : "text-destructive"}`}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </div>
          );
        },
      },
    ],
    [t, bnbPrice, livePrice],
  );

  return (
    <Card
      title={t("title")}
      description={t("description")}
      action={
        <Tooltip content={t("refresh")}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            <RefreshCw
              className={`size-3.5 ${isValidating ? "animate-spin" : ""}`}
            />
          </Button>
        </Tooltip>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : error || tokens.length === 0 ? (
        <Empty
          className="py-6"
          title={te("noBackend")}
          description={te("noBackendDesc")}
          icon={<ServerOff className="size-5 text-muted-foreground" />}
        />
      ) : (
        <Table columns={columns} data={tokens} />
      )}
    </Card>
  );
}
