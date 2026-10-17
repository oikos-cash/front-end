"use client";

import { useMemo } from "react";

// Components
import Table from "@/components/atoms/table";
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import Link from "next/link";
import { SectionTitle } from "./shared";

// Utils / types
import { truncateAddress } from "@/utils/string";
import { timeAgo } from "@/utils/date";
import { formatStakeNumber } from "@/utils/number";
import type { ColumnDef } from "@tanstack/react-table";
import type { LoanEvent } from "@/types/interfaces";
import { ExternalLink, Receipt } from "lucide-react";

const TYPE_META: Record<
  string,
  { variant: "default" | "success" | "secondary" | "destructive"; label: string }
> = {
  Borrow: { variant: "default", label: "Borrow" },
  Payback: { variant: "success", label: "Payback" },
  RollLoan: { variant: "secondary", label: "Roll" },
  DefaultLoans: { variant: "destructive", label: "Default" },
};

const WEI = 1e18;

function toBnb(raw?: string | number): number {
  if (raw == null) return 0;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n / WEI : 0;
}

function toDate(ts: number | string | undefined): Date | null {
  if (ts == null) return null;
  if (typeof ts === "string") {
    const asNum = Number(ts);
    if (Number.isFinite(asNum)) return toDate(asNum);
    const parsed = Date.parse(ts);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }
  if (!Number.isFinite(ts)) return null;
  return new Date(ts < 1e12 ? ts * 1000 : ts);
}

export default function LoansTable({ events }: { events: LoanEvent[] }) {
  const columns = useMemo<ColumnDef<LoanEvent>[]>(
    () => [
      {
        accessorKey: "eventName",
        header: "Type",
        cell: ({ row }) => {
          const meta = TYPE_META[row.original.eventName] ?? {
            variant: "outline" as const,
            label: row.original.eventName,
          };
          return <Badge variant={meta.variant}>{meta.label}</Badge>;
        },
      },
      {
        id: "amount",
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => {
          const bnb = toBnb(
            row.original.args?.borrowAmount ?? row.original.args?.amount,
          );
          return (
            <div className="text-right font-mono num text-sm">
              {bnb > 0 ? `${formatStakeNumber(bnb, 4, true)} BNB` : "—"}
            </div>
          );
        },
      },
      {
        id: "borrower",
        header: "Borrower",
        cell: ({ row }) => {
          const who = row.original.args?.who ?? row.original.userAddress;
          return (
            <span className="font-mono text-2xs text-muted-foreground">
              {who ? truncateAddress(who) : "—"}
            </span>
          );
        },
      },
      {
        id: "vault",
        header: "Vault",
        cell: ({ row }) => (
          <span className="font-mono text-2xs text-muted-foreground">
            {row.original.vaultSymbol ??
              (row.original.vaultAddress
                ? truncateAddress(row.original.vaultAddress)
                : "—")}
          </span>
        ),
      },
      {
        id: "time",
        header: () => <span className="block text-right">When</span>,
        cell: ({ row }) => {
          const d = toDate(row.original.timestamp);
          return (
            <div className="text-right text-2xs text-muted-foreground">
              {d ? timeAgo(d) : "—"}
            </div>
          );
        },
      },
      {
        id: "tx",
        header: () => <span className="block text-right">Tx</span>,
        cell: ({ row }) =>
          row.original.transactionHash ? (
            <div className="text-right">
              <Link
                href={`https://bscscan.com/tx/${row.original.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-2xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {truncateAddress(row.original.transactionHash)}
                <ExternalLink className="size-3" />
              </Link>
            </div>
          ) : (
            <div className="text-right text-2xs text-muted-foreground">—</div>
          ),
      },
    ],
    [],
  );

  return (
    <Card
      title={
        <SectionTitle badge={events.length ? `${events.length}` : undefined}>
          Recent Loan Activity
        </SectionTitle>
      }
      description="Latest borrow / payback / roll events across all vaults"
    >
      {events.length === 0 ? (
        <Empty
          className="py-10"
          title="No loan events"
          description="No recent loan activity has been indexed."
          icon={<Receipt className="size-6 text-muted-foreground" />}
        />
      ) : (
        <Table columns={columns} data={events} pageSize={10} />
      )}
    </Card>
  );
}
