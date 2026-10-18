"use client";

import { useMemo } from "react";

// Components
import Table from "@/components/atoms/table";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import Link from "next/link";
import { SectionTitle } from "./shared";
import { STATUS_META } from "./protocol-health";

// Utils / types
import { truncateAddress } from "@/utils/string";
import { formatStakeNumber } from "@/utils/number";
import { formatPct, ROLLABLE_COVERAGE, type LoanPosition } from "@/utils/protocol-health";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Landmark } from "lucide-react";

const num = (v: number, d = 4) => formatStakeNumber(v, d, true);

function coverageClass(v: number | null): string {
  if (v == null) return "text-muted-foreground";
  return v > ROLLABLE_COVERAGE ? "text-primary" : "text-foreground";
}

export default function LoanPositionsTable({
  positions,
  isLoading,
}: {
  positions: LoanPosition[];
  isLoading: boolean;
}) {
  const columns = useMemo<ColumnDef<LoanPosition>[]>(
    () => [
      {
        id: "status",
        header: "State",
        cell: ({ row }) => {
          const meta = STATUS_META[row.original.status];
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-2xs">
              <span
                className="block size-2 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              />
              {meta.label}
            </span>
          );
        },
      },
      {
        id: "borrower",
        header: "Borrower",
        cell: ({ row }) => (
          <Link
            href={`https://bscscan.com/address/${row.original.borrower}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-2xs text-primary hover:underline"
          >
            {truncateAddress(row.original.borrower)}
            <ExternalLink className="size-3" />
          </Link>
        ),
      },
      {
        id: "vault",
        header: "Vault",
        cell: ({ row }) => (
          <span className="font-mono text-2xs text-muted-foreground">
            {row.original.vaultSymbol || truncateAddress(row.original.vaultAddress)}
          </span>
        ),
      },
      {
        id: "debt",
        header: () => <span className="block text-right">Debt</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num text-sm">{num(row.original.debtBnb)} BNB</div>
        ),
      },
      {
        id: "collateral",
        header: () => <span className="block text-right">Collateral</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num">
            <div className="text-sm">
              {num(row.original.collateralTokens, 2)} {row.original.vaultSymbol}
            </div>
            <div className="text-2xs text-muted-foreground">
              ≈ {num(row.original.collateralSpotBnb)} BNB spot
            </div>
          </div>
        ),
      },
      {
        id: "imv",
        header: () => <span className="block text-right">IMV cov.</span>,
        cell: ({ row }) => (
          <div className={`text-right font-mono num text-sm ${coverageClass(row.original.imvCoverage)}`}>
            {formatPct(row.original.imvCoverage)}
          </div>
        ),
      },
      {
        id: "spot",
        header: () => <span className="block text-right">Spot cov.</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num text-sm text-muted-foreground">
            {formatPct(row.original.spotCoverage)}
          </div>
        ),
      },
      {
        id: "fees",
        header: () => <span className="block text-right">Fees</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num text-2xs text-muted-foreground">
            {num(row.original.feesBnb, 5)} BNB
          </div>
        ),
      },
      {
        id: "expiry",
        header: () => <span className="block text-right">Expires</span>,
        cell: ({ row }) => {
          const { expiresAt, daysLeft, durationDays } = row.original;
          const left =
            daysLeft <= 0
              ? `${Math.ceil(-daysLeft)}d overdue`
              : daysLeft < 1
                ? `${Math.round(daysLeft * 24)}h left`
                : `${Math.floor(daysLeft)}d left`;
          return (
            <div className="whitespace-nowrap text-right">
              <div className="text-2xs">{expiresAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</div>
              <div className={`text-2xs ${daysLeft < 7 ? "text-destructive" : "text-muted-foreground"}`}>
                {left} · {Math.round(durationDays)}d term
              </div>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <Card
      title={
        <SectionTitle badge={positions.length ? `${positions.length}` : undefined}>
          Loan Positions
        </SectionTitle>
      }
      description="Every active loan, read live from the vaults — sorted by debt"
    >
      {positions.length === 0 ? (
        <Empty
          className="py-10"
          title={isLoading ? "Reading loans from chain…" : "No active loans"}
          description={isLoading ? "Enumerating borrowers on every vault." : "No vault currently has an open loan."}
          icon={<Landmark className="size-6 text-muted-foreground" />}
        />
      ) : (
        <Table columns={columns} data={positions} pageSize={15} />
      )}
    </Card>
  );
}
