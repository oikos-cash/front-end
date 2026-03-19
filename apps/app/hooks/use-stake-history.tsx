import { useCallback, useEffect, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { StakeHistoryItem } from "@/types/interfaces";

// Icons
import { ArrowUpRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";
import { generateMockStakeHistory, formatStakeNumber } from "@/utils/number";

// Constants
import { STAKE_HISTORY_PAGE_SIZE, STAKE_HISTORY_MAX_ITEMS } from "@/types/constants";

export function useStakeHistory(token: string = "OKS") {
  const t = useTranslations("stake");

  const [items, setItems] = useState<StakeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<StakeHistoryItem>[] = [
    {
      accessorKey: "type",
      header: t("historyType"),
      cell: ({ row }) => {
        const type = row.getValue("type") as StakeHistoryItem["type"];
        return (
          <Badge
            variant={type === "stake" ? "default" : "destructive"}
            className="px-1.5 py-0 text-[10px]"
          >
            {type === "stake" ? t("historyStake") : t("historyUnstake")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: t("historyAmount"),
      cell: ({ row }) => (
        <span className="text-xs font-medium whitespace-nowrap">
          {formatStakeNumber(row.getValue("amount") as number)} {row.original.token}
        </span>
      ),
    },
    {
      accessorKey: "rewards",
      header: t("historyRewards"),
      cell: ({ row }) => {
        const rewards = row.getValue("rewards") as number;
        return rewards > 0 ? (
          <span className="text-xs font-medium text-primary whitespace-nowrap">
            +{formatStakeNumber(rewards)} {row.original.token}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{"\u2014"}</span>
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

  const loadItems = useCallback(
    (reset?: boolean) => {
      setIsLoading(true);
      const currentLength = reset ? 0 : items.length;
      const remaining = STAKE_HISTORY_MAX_ITEMS - currentLength;

      if (remaining <= 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const count = Math.min(STAKE_HISTORY_PAGE_SIZE, remaining);
      setTimeout(() => {
        const newItems = generateMockStakeHistory(count, currentLength, token);
        setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
        setHasMore(currentLength + count < STAKE_HISTORY_MAX_ITEMS);
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

  return {
    t,
    items,
    isLoading,
    hasMore,
    sentinelRef,
    columns,
  };
}
