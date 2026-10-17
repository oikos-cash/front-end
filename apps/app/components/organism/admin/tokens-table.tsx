"use client";

import { useMemo } from "react";

// Components
import Table from "@/components/atoms/table";
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import { SectionTitle } from "./shared";

// Hooks
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useRouter } from "next/navigation";

// Utils / types
import { formatUsd } from "@/utils/admin";
import { formatStakeNumber } from "@/utils/number";
import { formatShortDate } from "@/utils/date";
import type { ColumnDef } from "@tanstack/react-table";
import type { MarketToken, TokenStatus, TokenHealth } from "@/types/interfaces";
import { Table2 } from "lucide-react";

const STATUS_VARIANT: Record<
  TokenStatus,
  { variant: "default" | "secondary" | "success" | "outline"; label: string }
> = {
  graduated: { variant: "success", label: "Graduated" },
  inProgress: { variant: "default", label: "In Progress" },
  finalized: { variant: "secondary", label: "Finalized" },
  preparing: { variant: "outline", label: "Preparing" },
};

const HEALTH_VARIANT: Record<
  TokenHealth,
  { variant: "success" | "default" | "destructive"; label: string }
> = {
  healthy: { variant: "success", label: "Healthy" },
  warning: { variant: "default", label: "Warning" },
  critical: { variant: "destructive", label: "Critical" },
};

export default function TokensTable({ tokens }: { tokens: MarketToken[] }) {
  const { bnbPrice } = useBnbPrice();
  const router = useRouter();

  const columns = useMemo<ColumnDef<MarketToken>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Token",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-semibold text-foreground">
              {row.original.symbol}
            </span>
            <span className="text-2xs text-muted-foreground">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: () => <span className="block text-right">Price</span>,
        cell: ({ row }) => {
          const price = row.original.price ?? 0;
          const usd = price * bnbPrice;
          return (
            <div className="text-right font-mono num text-sm">
              {usd > 0 ? `$${formatStakeNumber(usd, 6, true)}` : "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "marketCap",
        header: () => <span className="block text-right">Market Cap</span>,
        cell: ({ row }) => {
          const mc = (row.original.marketCap ?? 0) * bnbPrice;
          return (
            <div className="text-right font-mono num text-sm">
              {mc > 0 ? formatUsd(mc) : "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "circulatingSupply",
        header: () => <span className="block text-right">Circulating</span>,
        cell: ({ row }) => {
          const c = row.original.circulatingSupply ?? 0;
          return (
            <div className="text-right font-mono num text-sm text-muted-foreground">
              {c > 0 ? formatStakeNumber(c, 2) : "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = STATUS_VARIANT[row.original.status];
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      },
      {
        accessorKey: "health",
        header: "Health",
        cell: ({ row }) => {
          const h = HEALTH_VARIANT[row.original.health];
          return <Badge variant={h.variant}>{h.label}</Badge>;
        },
      },
      {
        accessorKey: "createdAt",
        header: () => <span className="block text-right">Launched</span>,
        cell: ({ row }) => (
          <div className="text-right text-2xs text-muted-foreground">
            {row.original.createdAt
              ? formatShortDate(row.original.createdAt)
              : "—"}
          </div>
        ),
      },
    ],
    [bnbPrice],
  );

  return (
    <Card
      title={
        <SectionTitle badge={`${tokens.length}`}>Protocol Tokens</SectionTitle>
      }
      description="Every token launched on Oikos, with live market data"
    >
      {tokens.length === 0 ? (
        <Empty
          className="py-10"
          title="No tokens indexed"
          description="The vault indexer returned no tokens."
          icon={<Table2 className="size-6 text-muted-foreground" />}
        />
      ) : (
        <Table
          columns={columns}
          data={tokens}
          pageSize={10}
          onRowClick={(t) =>
            router.push(`/trade/${t.symbol.toLowerCase()}`)
          }
        />
      )}
    </Card>
  );
}
