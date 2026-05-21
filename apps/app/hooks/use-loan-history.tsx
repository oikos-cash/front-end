import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";
import { useWebSocket } from "@/hooks/use-websocket";
import { useWallet } from "@/stores/wallet";

// Services
import { fetchLoansByVault } from "@/services/loan";

// Types
import type { LoanHistoryItem, LoanEvent, WSLoanEvent } from "@/types/interfaces";

// Icons
import { ArrowUpRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";
import { formatStakeNumber } from "@/utils/number";

// Constants
import { LOAN_HISTORY_FILTERS } from "@/types/constants";

/**
 * Map a raw LoanEvent from the API to a LoanHistoryItem for the table.
 */
function toLoanHistoryItem(event: LoanEvent): LoanHistoryItem {
  const typeMap: Record<string, LoanHistoryItem["type"]> = {
    Borrow: "borrow",
    Payback: "repay",
    RollLoan: "roll",
  };

  const amount = event.args.borrowAmount ?? event.args.amount ?? "0";

  return {
    id: event.id,
    type: typeMap[event.eventName] ?? "borrow",
    amount: parseFloat(amount) / 1e18,
    collateral: 0,
    fees: 0,
    token: event.vaultSymbol ?? "TOKEN",
    txHash: event.transactionHash,
    timestamp: new Date(
      event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000,
    ),
  };
}

export function useLoanHistory(vaultAddress?: string) {
  const t = useTranslations("borrow");
  const { address } = useWallet();

  const [items, setItems] = useState<LoanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch loan history from API — scoped to the connected wallet so the
  // table doesn't surface other users' positions.
  useEffect(() => {
    if (!vaultAddress || !address) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const me = address.toLowerCase();

    async function load() {
      setIsLoading(true);
      try {
        const loans = await fetchLoansByVault(vaultAddress!);
        if (!cancelled) {
          const mapped = loans
            .filter((e) => e.eventName !== "DefaultLoans")
            .filter((e) => {
              // The indexer carries the originator under both userAddress
              // (top-level, normalised) and args.who. Match against either.
              const evUser = (
                e.userAddress ??
                (e.args as { who?: string } | undefined)?.who ??
                ""
              ).toLowerCase();
              return evUser === me;
            })
            .map(toLoanHistoryItem);
          setItems(mapped);
        }
      } catch (err) {
        console.error("[useLoanHistory] fetch error:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [vaultAddress, address]);

  // WebSocket real-time updates — same vault + user predicate as the
  // initial fetch so foreign positions can't sneak in via push.
  const onLoan = useCallback(
    (event: WSLoanEvent) => {
      const loan = event.data;

      if (
        vaultAddress &&
        loan.vaultAddress.toLowerCase() !== vaultAddress.toLowerCase()
      )
        return;

      if (loan.eventName === "DefaultLoans") return;

      if (address) {
        const evUser = (
          loan.userAddress ??
          (loan.args as { who?: string } | undefined)?.who ??
          ""
        ).toLowerCase();
        if (evUser !== address.toLowerCase()) return;
      }

      const item = toLoanHistoryItem(loan);
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [item, ...prev];
      });
    },
    [vaultAddress, address],
  );

  useWebSocket({
    onLoan,
    enabled: !!vaultAddress,
  });

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

  const filterOptions = LOAN_HISTORY_FILTERS.map((f) => ({
    value: f.value,
    label: t(f.labelKey),
  }));

  return {
    t,
    items,
    isLoading,
    hasMore: false,
    filter,
    setFilter,
    sentinelRef,
    columns,
    filteredItems,
    filterOptions,
  };
}
