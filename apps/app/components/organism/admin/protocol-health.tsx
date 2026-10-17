"use client";

// Components
import KpiCard from "@/components/molecules/card/kpi";
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { ChartCard, LegendDot, SectionTitle } from "./shared";

// Utils / types
import { formatBnb, formatUsd, formatCount } from "@/utils/admin";
import {
  formatPct,
  type LoanStatus,
  type ProtocolHealth,
  type VaultSolvency,
} from "@/utils/protocol-health";

// Icons
import { Scale, ShieldCheck, TriangleAlert, Landmark, HeartPulse } from "lucide-react";

const ICON = "size-4 text-primary";

export const STATUS_META: Record<LoanStatus, { label: string; color: string }> = {
  expired: { label: "Expired", color: "var(--chart-4)" },
  underwater: { label: "Under IMV", color: "#ff7a45" },
  expiring: { label: "Expiring < 7d", color: "#f59e0b" },
  watch: { label: "Watch (< 110%)", color: "var(--chart-1)" },
  healthy: { label: "Healthy", color: "var(--chart-2)" },
  "self-repaying": { label: "Self-repaying", color: "var(--chart-3)" },
};

const STATUS_ORDER: LoanStatus[] = [
  "expired",
  "underwater",
  "expiring",
  "watch",
  "healthy",
  "self-repaying",
];

const MARGIN = { top: 6, right: 96, bottom: 6, left: 128 };
const ROW_H = 30;

/** Horizontal BNB bars sharing one scale, so magnitudes compare directly. */
function BnbBars({
  rows,
  width,
  height,
  bnbPrice,
}: {
  rows: { label: string; value: number; color: string }[];
  width: number;
  height: number;
  bnbPrice: number;
}) {
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 0);
  const yScale = scaleBand<string>({
    domain: rows.map((r) => r.label),
    range: [0, innerH],
    padding: 0.3,
  });
  const xScale = scaleLinear({
    domain: [0, Math.max(...rows.map((r) => r.value), 1e-9)],
    range: [0, innerW],
  });

  return (
    <svg width={width} height={height}>
      <Group left={MARGIN.left} top={MARGIN.top}>
        {rows.map((r) => {
          const y = yScale(r.label) ?? 0;
          const h = yScale.bandwidth();
          const w = xScale(r.value);
          return (
            <Group key={r.label}>
              <text
                x={-8}
                y={y + h / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--foreground)"
              >
                {r.label}
              </text>
              <Bar x={0} y={y} width={innerW} height={h} rx={4} fill="var(--secondary)" />
              <Bar x={0} y={y} width={Math.max(w, 2)} height={h} rx={4} fill={r.color} />
              <text
                x={Math.min(w + 8, innerW + MARGIN.right - 4)}
                y={y + h / 2 - 5}
                dominantBaseline="middle"
                className="font-mono"
                fontSize={10}
                fill="var(--foreground)"
              >
                {formatBnb(r.value)}
              </text>
              <text
                x={Math.min(w + 8, innerW + MARGIN.right - 4)}
                y={y + h / 2 + 7}
                dominantBaseline="middle"
                className="font-mono"
                fontSize={9}
                fill="var(--muted-foreground)"
              >
                {bnbPrice > 0 ? formatUsd(r.value * bnbPrice) : ""}
              </text>
            </Group>
          );
        })}
      </Group>
    </svg>
  );
}

export default function ProtocolHealthSection({
  health,
  solvency,
  lifetimeBorrowedBnb,
  lifetimeBorrows,
  bnbPrice,
  isLoading,
}: {
  health: ProtocolHealth;
  solvency: { vaults: VaultSolvency[]; weakest: VaultSolvency | null };
  lifetimeBorrowedBnb: number;
  lifetimeBorrows: number;
  bnbPrice: number;
  isLoading: boolean;
}) {
  const atRisk =
    health.statusCounts.expired +
    health.statusCounts.underwater +
    health.statusCounts.expiring +
    health.statusCounts.watch;
  const empty = !isLoading && health.activeLoans === 0;

  const solvencyRows = [
    { label: "Total market cap", value: health.marketCapBnb, color: "var(--chart-1)" },
    { label: "Collateral @ spot", value: health.collateralSpotBnb, color: "var(--chart-2)" },
    { label: "Collateral @ IMV", value: health.collateralImvBnb, color: "var(--chart-3)" },
    { label: "Outstanding debt", value: health.outstandingDebtBnb, color: "var(--chart-4)" },
    { label: "Lifetime borrowed", value: lifetimeBorrowedBnb, color: "var(--chart-5)" },
  ];
  const maturityRows = health.maturity.map((b) => ({
    label: `${b.label} · ${b.loans}`,
    value: b.debtBnb,
    color: b.label === "Expired" ? "var(--chart-4)" : b.label === "< 7d" ? "#f59e0b" : "var(--chart-2)",
  }));
  const statusRows = STATUS_ORDER.map((s) => ({
    label: `${STATUS_META[s].label} · ${health.statusCounts[s]}`,
    value: health.positions.filter((p) => p.status === s).reduce((sum, p) => sum + p.debtBnb, 0),
    color: STATUS_META[s].color,
  }));

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle badge={isLoading ? "reading chain…" : "live on-chain"}>
        Protocol Health
      </SectionTitle>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          title="Solvency"
          value={formatPct(solvency.weakest?.ratio ?? null)}
          secondary={
            solvency.weakest
              ? `weakest vault: ${solvency.weakest.symbol} · floor 100%`
              : "capacity ÷ circulating"
          }
          description={solvency.vaults
            .map((v) => `${v.symbol} ${formatPct(v.ratio)}`)
            .join(" · ")}
          icon={<HeartPulse className={ICON} />}
        />
        <KpiCard
          title="Debt / Market Cap"
          value={formatPct(health.debtToMarketCap)}
          secondary={`${formatBnb(health.outstandingDebtBnb)} of ${formatBnb(health.marketCapBnb)}`}
          icon={<Scale className={ICON} />}
        />
        <KpiCard
          title="Outstanding Debt"
          value={formatBnb(health.outstandingDebtBnb)}
          secondary={`${formatCount(health.activeLoans)} active · lifetime ${formatBnb(lifetimeBorrowedBnb)} / ${formatCount(lifetimeBorrows)} borrows`}
          icon={<Landmark className={ICON} />}
        />
        <KpiCard
          title="Collateral Coverage"
          value={formatPct(health.imvCoverage)}
          secondary={`collateral ÷ debt at IMV · ${formatPct(health.spotCoverage)} at spot`}
          icon={<ShieldCheck className={ICON} />}
        />
        <KpiCard
          title="Loans at Risk"
          value={formatCount(atRisk)}
          secondary={`${formatBnb(health.atRiskDebtBnb)} debt · ${health.statusCounts.expired} expired`}
          icon={<TriangleAlert className={ICON} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Solvency"
          description="Market cap vs collateral and outstanding debt, BNB on one scale"
          height={solvencyRows.length * ROW_H + 24}
          isEmpty={empty}
          emptyTitle="No active loans"
        >
          {({ width, height }) => (
            <BnbBars rows={solvencyRows} width={width} height={height} bnbPrice={bnbPrice} />
          )}
        </ChartCard>
        <ChartCard
          title="Debt by Maturity"
          description="Outstanding debt grouped by time to expiry (loans default at expiry)"
          height={maturityRows.length * ROW_H + 24}
          isEmpty={empty}
          emptyTitle="No active loans"
        >
          {({ width, height }) => (
            <BnbBars rows={maturityRows} width={width} height={height} bnbPrice={bnbPrice} />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Debt by Loan Health"
        description="IMV coverage = collateral × IMV ÷ debt. Below 100% the floor no longer covers the loan; ≥ 150% self-repays"
        height={statusRows.length * ROW_H + 24}
        isEmpty={empty}
        emptyTitle="No active loans"
        legend={
          <div className="flex flex-wrap gap-3">
            {STATUS_ORDER.map((s) => (
              <LegendDot key={s} color={STATUS_META[s].color} label={STATUS_META[s].label} />
            ))}
          </div>
        }
      >
        {({ width, height }) => (
          <BnbBars rows={statusRows} width={width} height={height} bnbPrice={bnbPrice} />
        )}
      </ChartCard>
    </section>
  );
}
