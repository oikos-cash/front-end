"use client";

import { ColumnDef } from "@tanstack/react-table";

// Components
import Table from "@/components/atoms/table";
import Button from "@/components/atoms/button";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { RefreshCw } from "lucide-react";

// Types
type Token = {
  token: string;
  price: string;
  change24h: number;
  fdv: string;
};

// Mock data
const tokens: Token[] = [
  { token: "OKS", price: "$0.1800", change24h: 0.16, fdv: "$801.57K" },
  { token: "BNB", price: "$630.09", change24h: 7.19, fdv: "$94.5B" },
  { token: "ETH", price: "$2,521.30", change24h: -1.42, fdv: "$303.2B" },
  { token: "BTC", price: "$97,840.00", change24h: 3.25, fdv: "$1.94T" },
  { token: "USDT", price: "$1.0000", change24h: 0.01, fdv: "$144.1B" },
];

const columns: ColumnDef<Token>[] = [
  {
    accessorKey: "token",
    header: "Token",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("token")}</span>
    ),
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("price")}</div>
    ),
  },
  {
    accessorKey: "change24h",
    header: () => <div className="text-right">24h</div>,
    cell: ({ row }) => {
      const value = row.getValue("change24h") as number;
      return (
        <div
          className={`text-right ${value >= 0 ? "text-success" : "text-destructive"}`}
        >
          {value >= 0 ? "+" : ""}
          {value.toFixed(2)}%
        </div>
      );
    },
  },
  {
    accessorKey: "fdv",
    header: () => <div className="text-right">FDV</div>,
    cell: ({ row }) => <div className="text-right">{row.getValue("fdv")}</div>,
  },
];

export default function PriceTable() {
  const t = useTranslations("priceTable");

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-medium">
          <span>{t("price")}</span>
          <span className="text-muted-foreground">{t("change24h")}</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7">
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
      <Table columns={columns} data={tokens} />
    </div>
  );
}
