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

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { PriceTableToken, VaultInfo, TokenInfo } from "@/types/interfaces";

// Icons
import { RefreshCw, ServerOff } from "lucide-react";

// Utils
import { swrFetcher } from "@/utils/fetcher";
import { VAULT_API_URL, API_BASE_URL } from "@/types/constants";

async function fetchPriceTable(): Promise<PriceTableToken[]> {
  const [vaults, tokensRes] = await Promise.all([
    swrFetcher<VaultInfo[]>(`${VAULT_API_URL}/vaults`),
    swrFetcher<{ tokens: TokenInfo[] }>(`${API_BASE_URL}/tokens`),
  ]);

  const tokenMap = new Map<string, TokenInfo>();
  for (const t of tokensRes.tokens ?? []) {
    if (t.tokenSymbol) tokenMap.set(t.tokenSymbol.toLowerCase(), t);
  }

  return vaults.slice(0, 20).map((vault, i) => {
    const info = tokenMap.get(vault.tokenSymbol.toLowerCase());
    const spotPriceX96 = BigInt(vault.spotPriceX96 || "0");
    const price =
      spotPriceX96 > BigInt(0)
        ? (Number(spotPriceX96) / 2 ** 96) ** 2
        : 0;

    return {
      rank: i + 1,
      name: vault.tokenName,
      symbol: vault.tokenSymbol,
      price,
      change24h: 0,
      volume24h: 0,
      iconUrl: info?.logoUrl ?? info?.logoPreview,
      poolAddress: vault.poolAddress,
    };
  });
}

export default function PriceTable() {
  const t = useTranslations("priceTable");
  const te = useTranslations("error");

  const { data, error, isLoading, mutate } = useSWR(
    "price-table-tokens",
    fetchPriceTable,
    {
      refreshInterval: 60_000,
      errorRetryCount: 0,
      revalidateOnFocus: false,
    },
  );

  const tokens = data ?? [];

  const columns: ColumnDef<PriceTableToken>[] = useMemo(
    () => [
      {
        accessorKey: "symbol",
        header: t("token"),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.symbol ?? row.original.token}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: () => <div className="text-right">{t("price")}</div>,
        cell: ({ row }) => {
          const val = row.getValue("price");
          const display =
            typeof val === "number" ? `$${val.toFixed(4)}` : val;
          return <div className="text-right">{display as string}</div>;
        },
      },
      {
        accessorKey: "change24h",
        header: () => <div className="text-right">{t("24h")}</div>,
        cell: ({ row }) => {
          const value = row.getValue("change24h") as number;
          return (
            <div
              className={`text-right ${value >= 0 ? "text-success" : "text-destructive"}`}
            >
              {value >= 0 ? "+" : ""}
              {value.toFixed(2)}%
            </div>
          );
        },
      },
      {
        accessorKey: "fdv",
        header: () => <div className="text-right">{t("fdv")}</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.getValue("fdv") ?? "—"}</div>
        ),
      },
    ],
    [t],
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
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </Tooltip>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
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
