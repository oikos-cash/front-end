"use client";

import { ColumnDef } from "@tanstack/react-table";

// Components
import Table from "@/components/atoms/table";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { LiquidityDetail } from "@/types/interfaces";

const LABEL_COLORS: Record<string, string> = {
  reservesWbnb: "text-yellow-400",
  reservesOks: "text-green-400",
  capacityOks: "text-green-400",
  tickLower: "text-orange-400",
  tickUpper: "text-orange-400",
};

export default function LiquidityDetails({
  details,
}: {
  details: LiquidityDetail[];
}) {
  const t = useTranslations("liquidity");

  const columns: ColumnDef<LiquidityDetail>[] = [
    {
      accessorKey: "label",
      header: "",
      cell: ({ row }) => (
        <span
          className={`font-medium ${LABEL_COLORS[row.original.label] ?? ""}`}
        >
          {t(row.original.label as "reservesWbnb")}
        </span>
      ),
    },
    {
      accessorKey: "floor",
      header: () => (
        <span className="font-bold text-yellow-400">{t("floor")}</span>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.floor}</span>
      ),
    },
    {
      accessorKey: "anchor",
      header: () => (
        <span className="font-bold text-foreground">{t("anchor")}</span>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.anchor}</span>
      ),
    },
    {
      accessorKey: "discovery",
      header: () => (
        <span className="font-bold text-green-400">{t("discovery")}</span>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.discovery}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3 pt-6">
      <h2 className="text-lg font-bold">{t("details")}</h2>
      <Table columns={columns} data={details} />
    </div>
  );
}
