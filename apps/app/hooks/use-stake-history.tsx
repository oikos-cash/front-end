"use client";

import { useEffect, useState } from "react";
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
import { STAKE_HISTORY_MAX_ITEMS } from "@/types/constants";

export function useStakeHistory(token: string = "OKS") {
  const t = useTranslations("stake");

  const [items, setItems] = useState<StakeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        <span className="text-sm font-medium whitespace-nowrap">
          {formatStakeNumber(row.getValue("amount") as number)} {token}
        </span>
      ),
    },
    {
      accessorKey: "rewards",
      header: t("historyRewards"),
      cell: ({ row }) => {
        const rewards = row.getValue("rewards") as number;
        return rewards > 0 ? (
          <span className="text-sm font-medium text-primary whitespace-nowrap">
            +{formatStakeNumber(rewards)} {token}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "txHash",
      header: t("historyTx"),
      cell: ({ row }) => (
        <a
          href={`https://bscscan.com/tx/${row.getValue("txHash")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {truncateAddress(row.getValue("txHash") as string)}
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

  // Load all mock items once (will be replaced with API call when backend endpoint exists)
  useEffect(() => {
    const data = generateMockStakeHistory(STAKE_HISTORY_MAX_ITEMS, 0, token);
    setItems(data);
    setIsLoading(false);
  }, [token]);

  return {
    t,
    items,
    isLoading,
    columns,
  };
}
