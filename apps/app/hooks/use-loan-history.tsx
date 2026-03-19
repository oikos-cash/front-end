import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { LoanHistoryItem } from "@/types/interfaces";

// Icons
import { ArrowUpRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";
import { generateMockLoanHistory, formatStakeNumber } from "@/utils/number";

// Constants
import {
  LOAN_HISTORY_PAGE_SIZE,
  LOAN_HISTORY_MAX_ITEMS,
} from "@/types/constants";
import { LOAN_HISTORY_FILTERS } from "@/types/constants";

export function useLoanHistory(token: string = "OKS") {
  const t = useTranslations("borrow");

  const [items, setItems] = useState<LoanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const sentinelRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<LoanHistoryItem>[] = [
    {
      accessorKey: "type",
      header: t("historyType"),
      cell: ({ row }) => {
        const type = row.getValue("type") as LoanHistoryItem["type"];
        const variantMap = {
          borrow: "default" as const,
          repay: "secondary" as const,
          roll: "outline" as const,
        };
        const labelMap = {
          borrow: t("historyBorrow"),
          repay: t("historyRepay"),
          roll: t("historyRoll"),
        };
        return (
          <Badge variant={variantMap[type]} className="px-1.5 py-0 text-[10px]">
            {labelMap[type]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: t("historyAmount"),
      cell: ({ row }) => (
        <span className="text-xs font-medium whitespace-nowrap">
          {formatStakeNumber(row.getValue("amount") as number)}{" "}
          {row.original.token}
        </span>
      ),
    },
    {
      accessorKey: "collateral",
      header: t("historyCollateral"),
      cell: ({ row }) => (
        <span className="text-xs font-medium whitespace-nowrap">
          {formatStakeNumber(row.getValue("collateral") as number)}{" "}
          {row.original.token}
        </span>
      ),
    },
    {
      accessorKey: "fees",
      header: t("historyFees"),
      cell: ({ row }) => {
        const fees = row.getValue("fees") as number;
        return fees > 0 ? (
          <span className="text-xs font-medium text-primary whitespace-nowrap">
            {formatStakeNumber(fees)} {row.original.token}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        );
      },
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

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  // Appends next page or resets the list on initial/filter changes
  const loadItems = useCallback(
    (reset?: boolean) => {
      setIsLoading(true);
      const currentLength = reset ? 0 : items.length;
      const remaining = LOAN_HISTORY_MAX_ITEMS - currentLength;

      if (remaining <= 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const count = Math.min(LOAN_HISTORY_PAGE_SIZE, remaining);
      setTimeout(() => {
        const newItems = generateMockLoanHistory(count, currentLength, token);
        setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
        setHasMore(currentLength + count < LOAN_HISTORY_MAX_ITEMS);
        setIsLoading(false);
      }, 300);
    },
    [items.length, token],
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

  // Translated filter options derived from the constant definitions
  const filterOptions = LOAN_HISTORY_FILTERS.map((f) => ({
    value: f.value,
    label: t(f.labelKey),
  }));

  return {
    t,
    items,
    isLoading,
    hasMore,
    filter,
    setFilter,
    sentinelRef,
    columns,
    filteredItems,
    filterOptions,
  };
}
