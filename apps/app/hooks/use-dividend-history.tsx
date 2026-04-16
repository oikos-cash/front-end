"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { DividendClaimHistory } from "@/types/interfaces";

// Icons
import { ArrowUpRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";
import {
  formatCompactNumber,
  generateMockDividendHistory,
} from "@/utils/number";

// Constants
import {
  DIVIDEND_HISTORY_PAGE_SIZE,
  DIVIDEND_HISTORY_MAX_ITEMS,
} from "@/types/constants";

export function useDividendHistory(token?: string) {
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
          {formatCompactNumber(row.getValue("amount") as number)}{" "}
          {row.original.token}
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

  // When token prop is set, only show items matching that token
  const filteredItems = useMemo(() => {
    if (!token) return items;
    return items.filter((item) => item.token === token);
  }, [items, token]);

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

  // Card title/description changes based on whether filtering by specific token
  const title = token ? t("claimHistoryTitle") : t("historyTitle");
  const description = token
    ? t("claimHistoryDescription")
    : t("historyDescription");

  return {
    t,
    items,
    isLoading,
    hasMore,
    sentinelRef,
    columns,
    filteredItems,
    title,
    description,
  };
}
