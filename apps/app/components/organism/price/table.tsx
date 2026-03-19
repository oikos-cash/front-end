"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Card from "@/components/atoms/card";
import Table from "@/components/atoms/table";
import Button from "@/components/atoms/button";
import Tooltip from "@/components/atoms/tooltip";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { PriceTableToken } from "@/types/interfaces";

// Icons
import { RefreshCw } from "lucide-react";

// Utils
import { generateMockPriceTableTokens } from "@/utils/number";

export default function PriceTable() {
  const t = useTranslations("priceTable");
  const tokens = useMemo(() => generateMockPriceTableTokens(), []);

  const columns: ColumnDef<PriceTableToken>[] = useMemo(
    () => [
      {
        accessorKey: "token",
        header: t("token"),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("token")}</span>
        ),
      },
      {
        accessorKey: "price",
        header: () => <div className="text-right">{t("price")}</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.getValue("price")}</div>
        ),
      },
      {
        accessorKey: "change24h",
        header: () => <div className="text-right">{t("24h")}</div>,
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
        header: () => <div className="text-right">{t("fdv")}</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.getValue("fdv")}</div>
        ),
      },
    ],
    [t],
  );

  return (
    <Card
      title={t("title")}
      description={t("description")}
      action={
        <Tooltip content={t("refresh")}>
          <Button variant="ghost" size="icon" className="size-7">
            <RefreshCw className="size-3.5" />
          </Button>
        </Tooltip>
      }
    >
      <Table columns={columns} data={tokens} />
    </Card>
  );
}
