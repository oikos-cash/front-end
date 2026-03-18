"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Card from "@/components/atoms/card";
import Table from "@/components/atoms/table";
import Empty from "@/components/atoms/empty";
import Skeleton from "@/components/atoms/skeleton";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { ArrowRight, Loader2 } from "lucide-react";

// Types
import type { RecentSwap } from "@/types/interfaces";

// Utils
import { timeAgo } from "@/utils/date";
import { generateMockRecentSwaps, formatCompactNumber } from "@/utils/number";

// Constants
import { SWAP_HISTORY_PAGE_SIZE, SWAP_HISTORY_MAX_ITEMS } from "@/types/constants";

export default function SwapHistory() {
  const t = useTranslations("swap");

  const [items, setItems] = useState<RecentSwap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<RecentSwap>[] = [
    {
      accessorKey: "fromToken",
      header: t("from"),
      cell: ({ row }) => (
        <span className="text-sm font-medium whitespace-nowrap">
          {formatCompactNumber(row.original.fromAmount)} {row.original.fromToken}
        </span>
      ),
    },
    {
      id: "arrow",
      header: "",
      cell: () => <ArrowRight className="size-3.5 text-muted-foreground" />,
    },
    {
      accessorKey: "toToken",
      header: t("to"),
      cell: ({ row }) => (
        <span className="text-sm font-medium whitespace-nowrap">
          {formatCompactNumber(row.original.toAmount)} {row.original.toToken}
        </span>
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

  const loadItems = useCallback(
    (reset?: boolean) => {
      setIsLoading(true);
      const currentLength = reset ? 0 : items.length;
      const remaining = SWAP_HISTORY_MAX_ITEMS - currentLength;

      if (remaining <= 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const count = Math.min(SWAP_HISTORY_PAGE_SIZE, remaining);
      setTimeout(() => {
        const newItems = generateMockRecentSwaps(count, currentLength);
        setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
        setHasMore(currentLength + count < SWAP_HISTORY_MAX_ITEMS);
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
    <Card title={t("recentSwaps")} description={t("recentSwapsDesc")}>
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
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-4" />
              <Skeleton className="h-3 w-24" />
              <div className="flex-1" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      ) : (
        <Empty
          className="py-12"
          title={t("noRecentSwaps")}
        />
      )}
    </Card>
  );
}
