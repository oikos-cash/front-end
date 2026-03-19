import { useCallback, useEffect, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";

// Types
import { Trade } from "@/types/interfaces";

// Icons
import { ArrowUpRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";

// Constants
import { TRADES_PAGE_SIZE, TRADES_MAX_TRADES } from "@/types/constants";

// Mock data generator — will be replaced by API calls
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

export function useTradesHistory(token: string = "OKS") {
  const t = useTranslations("tradesHistory");

  // State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [view, setView] = useState("global");
  const [tokenFilter, setTokenFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Sentinel for infinite scroll via IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Column definitions with JSX cell renderers
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

  // Loads a page of trades, optionally resetting the list (e.g. on view change)
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

  // Reload when switching between global/myTrades views
  useEffect(() => {
    loadTrades(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Trigger next page load when sentinel enters viewport
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

  const filteredTrades =
    tokenFilter === "all"
      ? trades
      : trades.filter((trade) => trade.token === tokenFilter);

  const tokenOptions = [
    { value: "all", label: t("allTokens") },
    { value: "OKS", label: "OKS" },
    { value: "BNB", label: "BNB" },
    { value: "SFL", label: "SFL" },
  ];

  const handleViewChange = (value: string) => {
    setView(value);
    setTrades([]);
    setHasMore(true);
  };

  const handleClearHistory = () => {
    setTrades([]);
    setHasMore(false);
  };

  return {
    t,
    trades,
    view,
    tokenFilter,
    setTokenFilter,
    isLoading,
    hasMore,
    sentinelRef,
    columns,
    filteredTrades,
    tokenOptions,
    handleViewChange,
    handleClearHistory,
  };
}
