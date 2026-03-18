"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Card from "@/components/atoms/card";
import Table from "@/components/atoms/table";
import Badge from "@/components/atoms/badge";
import Empty from "@/components/atoms/empty";
import Skeleton from "@/components/atoms/skeleton";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { ArrowUpRight, Loader2 } from "lucide-react";

// Types
import type { DividendClaimHistory, DividendClaimHistoryProps } from "@/types/interfaces";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";
import { generateMockDividendHistory, formatCompactNumber } from "@/utils/number";

// Constants
import { DIVIDEND_HISTORY_PAGE_SIZE, DIVIDEND_HISTORY_MAX_ITEMS } from "@/types/constants";

export default function DividendClaimHistory({ token }: DividendClaimHistoryProps) {
  const t = useTranslations("dividends");

  const [items, setItems] = useState<DividendClaimHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<DividendClaimHistory>[] = [
    {
      accessorKey: "type",
      header: t("historyType"),
      cell: ({ row }) => {
        const type = row.getValue("type") as DividendClaimHistory["type"];
        return (
          <Badge
            variant={type === "lock" ? "default" : "destructive"}
            className="px-1.5 py-0 text-[10px]"
          >
            {type === "lock" ? t("historyLock") : t("historyWithdraw")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "token",
      header: t("historyToken"),
      cell: ({ row }) => (
        <span className="text-xs font-medium">{row.getValue("token")}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: t("historyAmount"),
      cell: ({ row }) => (
        <span className="text-xs font-medium whitespace-nowrap">
          {formatCompactNumber(row.getValue("amount") as number)} {row.original.token}
        </span>
      ),
    },
    {
      accessorKey: "txHash",
      header: t("historyTx"),
      cell: ({ row }) => (
        <a
          href={`https://bscscan.com/tx/${row.original.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {truncateAddress(row.original.txHash)}
          <ArrowUpRight className="size-3 text-muted-foreground/50" />
        </a>
      ),
    },
    {
      accessorKey: "timestamp",
      header: t("historyTime"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {timeAgo(row.getValue("timestamp") as Date)}
        </span>
      ),
    },
  ];

  const loadItems = useCallback(
    (reset?: boolean) => {
      setIsLoading(true);
      const currentLength = reset ? 0 : items.length;
      const remaining = DIVIDEND_HISTORY_MAX_ITEMS - currentLength;

      if (remaining <= 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const count = Math.min(DIVIDEND_HISTORY_PAGE_SIZE, remaining);
      setTimeout(() => {
        const newItems = generateMockDividendHistory(count, currentLength);
        setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
        setHasMore(currentLength + count < DIVIDEND_HISTORY_MAX_ITEMS);
        setIsLoading(false);
      }, 300);
    },
    [items.length],
  );

  useEffect(() => {
    loadItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          loadItems();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadItems]);

  return (
    <Card
      title={t("historyTitle")}
      description={t("historyDescription")}
    >
      {items.length > 0 ? (
        <div>
          <Table columns={columns} data={items} />
          <div ref={sentinelRef} className="h-1" />
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      ) : (
        <Empty
          className="py-12"
          title={t("historyEmpty")}
          description={t("historyEmptyDesc")}
        />
      )}
    </Card>
  );
}
