"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Card from "@/components/atoms/card";
import Table from "@/components/atoms/table";
import Badge from "@/components/atoms/badge";
import Empty from "@/components/atoms/empty";
import Skeleton from "@/components/atoms/skeleton";
import Select from "@/components/atoms/select";
import Button from "@/components/atoms/button";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { ArrowUpRight, Loader2 } from "lucide-react";

// Types
import { Trade, TradesHistoryProps } from "@/types/interfaces";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";

// Constants
import { TRADES_PAGE_SIZE, TRADES_MAX_TRADES } from "@/types/constants";

// Helpers
function generateMockTrades(count: number, offset: number): Trade[] {
  const wallets = [
    "0x1a2B3c4D5e6F7890abCdEf1234567890AbCdEf12",
    "0xaBcDeF1234567890aBcDeF1234567890AbCdEf34",
    "0x9876543210FeDcBa9876543210FeDcBa98765432",
    "0xDeAdBeEf00112233445566778899AaBbCcDdEeFf",
    "0x1111222233334444555566667777888899990000",
  ];

  return Array.from({ length: count }, (_, i) => {
    const index = offset + i;
    const isBuy = Math.random() > 0.5;
    const amount = Math.floor(Math.random() * 100000) + 1000;
    const price = parseFloat((Math.random() * 0.001 + 0.0001).toFixed(6));
    const bnbAmount = parseFloat((amount * price).toFixed(4));
    const usdValue = parseFloat((bnbAmount * 636.42).toFixed(2));

    return {
      id: `trade-${index}`,
      type: isBuy ? ("buy" as const) : ("sell" as const),
      token: "OKS",
      amount,
      price,
      bnbAmount,
      usdValue,
      wallet: wallets[index % wallets.length]!,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      timestamp: new Date(Date.now() - index * 30000 - Math.random() * 60000),
    };
  });
}

export default function TradesHistory({ token = "OKS" }: TradesHistoryProps) {
  const t = useTranslations("tradesHistory");

  // State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [view, setView] = useState("global");
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Refs
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Columns
  const columns: ColumnDef<Trade>[] = [
    {
      accessorKey: "type",
      header: t("type"),
      cell: ({ row }) => {
        const type = row.getValue("type") as Trade["type"];
        return (
          <Badge
            variant={type === "buy" ? "default" : "destructive"}
            className="text-[10px] px-1.5 py-0"
          >
            {type === "buy" ? t("buy") : t("sell")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: t("details"),
      cell: ({ row }) => {
        const amount = (row.getValue("amount") as number).toLocaleString();
        const price = row.original.price.toFixed(6);
        return (
          <span className="text-xs whitespace-nowrap">
            {amount} {row.original.token} @ {price}
          </span>
        );
      },
    },
    {
      accessorKey: "bnbAmount",
      header: t("value"),
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap">
          {row.original.bnbAmount} BNB / ${row.original.usdValue}
        </span>
      ),
    },
    {
      accessorKey: "wallet",
      header: t("wallet"),
      cell: ({ row }) => (
        <a
          href={`https://bscscan.com/tx/${row.original.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {truncateAddress(row.getValue("wallet") as string)}
          <ArrowUpRight className="size-3 text-muted-foreground/50" />
        </a>
      ),
    },
    {
      accessorKey: "timestamp",
      header: t("time"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {timeAgo(row.getValue("timestamp") as Date)}
        </span>
      ),
    },
  ];

  // Load trades
  const loadTrades = useCallback(
    (reset?: boolean) => {
      setIsLoading(true);
      const currentLength = reset ? 0 : trades.length;
      const remaining = TRADES_MAX_TRADES - currentLength;

      if (remaining <= 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const count = Math.min(TRADES_PAGE_SIZE, remaining);
      setTimeout(() => {
        const newTrades = generateMockTrades(count, currentLength);
        setTrades((prev) => (reset ? newTrades : [...prev, ...newTrades]));
        setHasMore(currentLength + count < TRADES_MAX_TRADES);
        setIsLoading(false);
      }, 300);
    },
    [trades.length],
  );

  // Initial load
  useEffect(() => {
    loadTrades(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // IntersectionObserver for infinite scroll (global viewport)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          loadTrades();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadTrades]);

  // Handlers
  const handleViewChange = (value: string) => {
    setView(value);
    setTrades([]);
    setHasMore(true);
  };

  const handleClearHistory = () => {
    setTrades([]);
    setHasMore(false);
  };

  return (
    <Card
      header={
        <div className="flex w-full items-center gap-2">
          <Select
            className="w-32"
            defaultValue="global"
            disabled={isLoading && trades.length === 0}
            onValueChange={handleViewChange}
            items={[
              { value: "global", label: t("global") },
              { value: "myTrades", label: t("myTrades") },
            ]}
          />
          <Badge variant="outline">{token}</Badge>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading && trades.length === 0}
            onClick={handleClearHistory}
          >
            {t("clearHistory")}
          </Button>
        </div>
      }
    >
      {trades.length > 0 ? (
        <div>
          <Table columns={columns} data={trades} />
          <div ref={sentinelRef} className="h-1" />
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="overflow-hidden rounded-md border">
          <div className="relative w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b">
                  <th className="h-10 px-2 text-left align-middle"><Skeleton className="h-3 w-10" /></th>
                  <th className="h-10 px-2 text-left align-middle"><Skeleton className="h-3 w-14" /></th>
                  <th className="h-10 px-2 text-left align-middle"><Skeleton className="h-3 w-12" /></th>
                  <th className="h-10 px-2 text-left align-middle"><Skeleton className="h-3 w-14" /></th>
                  <th className="h-10 px-2 text-left align-middle"><Skeleton className="h-3 w-10" /></th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 align-middle"><Skeleton className="h-5 w-10 rounded-full" /></td>
                    <td className="p-2 align-middle"><Skeleton className="h-3 w-44" /></td>
                    <td className="p-2 align-middle"><Skeleton className="h-3 w-40" /></td>
                    <td className="p-2 align-middle"><Skeleton className="h-3 w-24" /></td>
                    <td className="p-2 align-middle"><Skeleton className="h-3 w-14" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Empty
          className="py-12"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}
    </Card>
  );
}
