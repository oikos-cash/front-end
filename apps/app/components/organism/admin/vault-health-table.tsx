"use client";

import { useMemo } from "react";

// Components
import Table from "@/components/atoms/table";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import Link from "next/link";
import { SectionTitle } from "./shared";

// Utils / types
import { truncateAddress } from "@/utils/string";
import { formatStakeNumber } from "@/utils/number";
import { formatBnb, formatCount } from "@/utils/admin";
import { formatPct, type VaultHealthRow } from "@/utils/protocol-health";
import type { ColumnDef } from "@tanstack/react-table";
import { Vault } from "lucide-react";

const tokens = (v: number) => formatStakeNumber(v, 2, true);

function solvencyClass(v: number | null): string {
  if (v == null) return "text-muted-foreground";
  if (v <= 1) return "text-destructive";
  if (v < 1.2) return "text-primary";
  return "text-foreground";
}

export default function VaultHealthTable({ rows }: { rows: VaultHealthRow[] }) {
  const columns = useMemo<ColumnDef<VaultHealthRow>[]>(
    () => [
      {
        id: "vault",
        header: "Vault",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{row.original.symbol}</span>
            <Link
              href={`https://bscscan.com/address/${row.original.vaultAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-2xs text-muted-foreground hover:text-primary"
            >
              {truncateAddress(row.original.vaultAddress)}
            </Link>
          </div>
        ),
      },
      {
        id: "solvency",
        header: () => <span className="block text-right">Solvency</span>,
        cell: ({ row }) => (
          <div className={`text-right font-mono num text-sm ${solvencyClass(row.original.solvency)}`}>
            {formatPct(row.original.solvency)}
          </div>
        ),
      },
      {
        id: "capacity",
        header: () => <span className="block text-right">Anchor + Floor cap.</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num">
            <div className="text-sm">
              {tokens(row.original.anchorCapacity + row.original.floorCapacity)}
            </div>
            <div className="text-2xs text-muted-foreground">
              {tokens(row.original.anchorCapacity)} + {tokens(row.original.floorCapacity)}
            </div>
          </div>
        ),
      },
      {
        id: "circulating",
        header: () => <span className="block text-right">Circulating</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num text-sm">
            {tokens(row.original.circulatingSupply)}
          </div>
        ),
      },
      {
        id: "mcap",
        header: () => <span className="block text-right">Market cap</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num text-sm">
            {formatBnb(row.original.marketCapBnb)}
          </div>
        ),
      },
      {
        id: "debt",
        header: () => <span className="block text-right">Debt</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num">
            <div className="text-sm">{formatBnb(row.original.debtBnb)}</div>
            <div className="text-2xs text-muted-foreground">
              {formatPct(row.original.debtToMarketCap)} of mcap
            </div>
          </div>
        ),
      },
      {
        id: "coverage",
        header: () => <span className="block text-right">Coverage</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num">
            <div className="text-sm">{formatPct(row.original.imvCoverage)}</div>
            <div className="text-2xs text-muted-foreground">
              {formatPct(row.original.spotCoverage)} spot
            </div>
          </div>
        ),
      },
      {
        id: "loans",
        header: () => <span className="block text-right">Loans</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono num">
            <div className="text-sm">{formatCount(row.original.activeLoans)}</div>
            <div className="text-2xs text-muted-foreground">
              {formatCount(row.original.expiringLoans)} expiring ·{" "}
              {formatCount(row.original.expiredLoans)} expired
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <Card
      title={
        <SectionTitle badge={rows.length ? `${rows.length}` : undefined}>
          Solvency by Vault
        </SectionTitle>
      }
      description="Solvency = (anchor + floor capacity) ÷ circulating supply, the invariant ModelHelper enforces (> 100%). Coverage = loan collateral at IMV ÷ debt"
    >
      {rows.length === 0 ? (
        <Empty
          className="py-10"
          title="No vaults"
          description="The vault registry is unavailable."
          icon={<Vault className="size-6 text-muted-foreground" />}
        />
      ) : (
        <Table columns={columns} data={rows} pageSize={10} />
      )}
    </Card>
  );
}
