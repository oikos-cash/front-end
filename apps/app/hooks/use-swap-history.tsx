import { useCallback, useEffect, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { RecentSwap } from "@/types/interfaces";

// Icons
import { ArrowRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { generateMockRecentSwaps, formatCompactNumber } from "@/utils/number";

// Constants
import { SWAP_HISTORY_PAGE_SIZE, SWAP_HISTORY_MAX_ITEMS } from "@/types/constants";

export function useSwapHistory() {
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

  // Infinite scroll via IntersectionObserver on the sentinel element
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

  return {
    t,
    items,
    isLoading,
    hasMore,
    sentinelRef,
    columns,
  };
}
