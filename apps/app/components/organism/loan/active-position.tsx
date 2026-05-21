"use client";

import { Controller } from "react-hook-form";

// Components
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useLoanPosition } from "@/hooks/use-loan-position";

// Utils
import { cn } from "@/utils/object";
import { formatStakeNumber } from "@/utils/number";

// Types
import type { LoanActivePositionProps } from "@/types/interfaces";

// Icons
import { FileX, ArrowDownToLine, RefreshCw, PlusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Mapping from tab key to its icon + short prompt. Kept beside the component
// because both depend on the i18n namespace ("borrow") and the tab keys
// produced by useLoanPosition.
const TAB_ICONS: Record<string, LucideIcon> = {
  repay: ArrowDownToLine,
  roll: RefreshCw,
  addCollateral: PlusCircle,
};
const TAB_PROMPTS: Record<string, string> = {
  repay: "Pay back part or all of your loan to free up collateral.",
  roll: "Extend the loan's duration by paying the rollover fee.",
  addCollateral: "Add more collateral to lower the LTV and reduce risk.",
};

/**
 * Compact one-row amount input — replaces the stacked
 * label / full-height input / use-max link that FieldRenderer produces.
 * The whole thing reads as a single tight control: micro-label + use-max
 * link on the top row, the numeric input + token suffix on the bottom row.
 */
function CompactAmountField({
  control,
  name,
  label,
  token,
  description,
  placeholder = "0.00",
}: {
  // RHF's Control is invariant in TFieldValues; `any` matches the rest of
  // the codebase's Controller usage in @/components/atoms/field.
  control: unknown;
  name: string;
  label: string;
  token: string;
  description?: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <Controller
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      control={control as any}
      name={name}
      render={({ field }) => (
        <div className="flex flex-col gap-1.5 rounded-md border border-border/60 bg-card/40 px-3 py-2.5 transition-colors focus-within:border-primary/50 focus-within:bg-card/60">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
              {label}
            </span>
            {description}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <input
              {...field}
              type="number"
              step="any"
              min="0"
              placeholder={placeholder}
              className="w-full bg-transparent font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {token}
            </span>
          </div>
        </div>
      )}
    />
  );
}

/**
 * Small horizontal LTV gauge. Visually anchors the collateralization ratio
 * against two thresholds:
 *   1.0  = liquidation                  (left edge, destructive)
 *   1.5  = self-repaying / healthy band (gold tick)
 * Anything below 1.1 is shown in red; the safe zone (≥1.5) is gold.
 */
function LtvGauge({ ltv }: { ltv: number }) {
  // Map ltv 1.0 → 0%, 3.0 → 100% so most positions live in the middle.
  const min = 1;
  const max = 3;
  const clamped = Math.max(min, Math.min(max, ltv));
  const pct = ((clamped - min) / (max - min)) * 100;
  const tone =
    ltv <= 1.1
      ? "bg-destructive"
      : ltv < 1.5
        ? "bg-warning"
        : "bg-success";

  return (
    <div className="flex w-full max-w-[180px] flex-col gap-1">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
        {/* 1.5 marker — the self-repaying threshold. */}
        <span
          aria-hidden
          className="absolute top-0 h-full w-px bg-foreground/30"
          style={{ left: `${((1.5 - min) / (max - min)) * 100}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground/60">
        <span>liq</span>
        <span>safe</span>
      </div>
    </div>
  );
}

export default function LoanActivePosition({
  vault,
}: LoanActivePositionProps) {
  const {
    t,
    loanData,
    tabForms,
    activeTab,
    setActiveTab,
    isConnected,
  } = useLoanPosition(vault);

  if (!isConnected) return null;

  if (!loanData.hasActiveLoan) {
    return (
      <Card title={t("positionTitle")} description={t("positionDescription")}>
        <Empty
          title={t("noActiveLoan")}
          description={t("noActiveLoanDesc")}
          icon={<FileX className="size-6 text-muted-foreground" />}
        />
      </Card>
    );
  }

  const isHealthy = loanData.ltv >= 1.5;
  const isAtRisk = loanData.ltv > 0 && loanData.ltv <= 1.1;
  const isCaution =
    !loanData.isExpired && !isAtRisk && !isHealthy && loanData.ltv > 0;
  const statusLabel = loanData.isExpired
    ? t("positionExpired")
    : isAtRisk
      ? "At risk"
      : loanData.isSelfRepaying
        ? t("positionSelfRepaying")
        : isCaution
          ? "Caution"
          : "Healthy";

  // Explicit colour coding: red for expired / at risk, gold for caution
  // (LTV between liquidation and self-repaying), green for healthy.
  const statusTone:
    | { dot: string; bg: string; text: string; ring: string }
    = loanData.isExpired || isAtRisk
      ? {
          dot: "bg-destructive shadow-[0_0_6px_rgba(227,79,79,0.7)]",
          bg: "bg-destructive/15",
          text: "text-destructive",
          ring: "border-destructive/40",
        }
      : isCaution
        ? {
            dot: "bg-warning shadow-[0_0_6px_rgba(245,200,67,0.7)]",
            bg: "bg-warning/15",
            text: "text-warning",
            ring: "border-warning/40",
          }
        : {
            dot: "bg-success shadow-[0_0_6px_rgba(0,200,151,0.7)]",
            bg: "bg-success/15",
            text: "text-success",
            ring: "border-success/40",
          };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.6)]"
          />
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            {t("positionTitle")}
          </span>
        </span>
      }
      description={t("positionDescription")}
      action={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
            statusTone.bg,
            statusTone.text,
            statusTone.ring,
          )}
        >
          <span aria-hidden className={cn("block size-1.5 rounded-full", statusTone.dot)} />
          {statusLabel}
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Hero: borrowed amount + collateral + time */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
            {t("positionBorrowed")}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatStakeNumber(loanData.borrowedAmount)}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {loanData.quoteToken}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
              {t("positionCollateral")}
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatStakeNumber(loanData.collateralAmount)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {loanData.token}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
              {t("positionLtv")}
            </span>
            <span
              className={cn(
                "font-mono text-sm font-semibold tabular-nums",
                isAtRisk ? "text-destructive" : "text-foreground",
              )}
            >
              {loanData.ltv > 0 ? loanData.ltv.toFixed(2) : "--"}
            </span>
            <LtvGauge ltv={loanData.ltv} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
              {t("positionDaysLeft")}
            </span>
            <span
              className={cn(
                "font-mono text-sm font-semibold tabular-nums",
                loanData.isExpired ? "text-destructive" : "text-foreground",
              )}
            >
              {loanData.isExpired ? t("positionExpired") : `${loanData.daysLeft}d`}
            </span>
          </div>
        </div>

        {/* Manage section */}
        <div className="flex flex-col gap-4 border-t border-border/40 pt-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            {t("positionActions")}
          </span>

          {/* Action selector — three full-width cards (icon + label),
            * mirroring the Pay-with pattern. Selected gets primary-tinted
            * background, border + soft brand glow. */}
          <div className="grid grid-cols-3 gap-1.5">
            {tabForms.map((tab) => {
              const Icon = TAB_ICONS[tab.key] ?? ArrowDownToLine;
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={selected}
                  className={cn(
                    "group flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-center transition-all",
                    selected
                      ? "border-primary/50 bg-primary/10 text-foreground shadow-[0_0_0_1px_rgba(245,200,67,0.18),0_2px_10px_-4px_rgba(245,200,67,0.4)]"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:border-border-strong hover:bg-card/60 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 transition-colors",
                      selected ? "text-primary" : "text-muted-foreground/80",
                    )}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {tabForms.map(
            (tab) =>
              activeTab === tab.key && (
                <form
                  key={tab.key}
                  onSubmit={tab.form.handleSubmit(tab.onSubmit)}
                  className="flex flex-col gap-3"
                >
                  {/* Contextual prompt so the active surface explains what
                    * the user is about to do. */}
                  {TAB_PROMPTS[tab.key] && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                      {TAB_PROMPTS[tab.key]}
                    </p>
                  )}

                  {tab.key === "repay" ? (
                    <CompactAmountField
                      control={tab.form.control}
                      name={tab.fields[0].name}
                      label={tab.fields[0].label}
                      token={loanData.quoteToken}
                      description={tab.fields[0].description}
                    />
                  ) : tab.key === "addCollateral" ? (
                    <CompactAmountField
                      control={tab.form.control}
                      name={tab.fields[0].name}
                      label={tab.fields[0].label}
                      token={loanData.token}
                      description={tab.fields[0].description}
                    />
                  ) : (
                    <FieldRenderer
                      t={t}
                      control={tab.form.control}
                      fields={tab.fields}
                    />
                  )}

                  {tab.showSummary && tab.summaryRows.length > 0 && (
                    <div className="flex flex-col gap-1.5 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-xs">
                      {tab.summaryRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
                            {row.label}
                          </span>
                          <span
                            className={cn(
                              "font-mono tabular-nums",
                              row.variant === "success"
                                ? "text-success"
                                : "text-foreground",
                            )}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!tab.form.formState.isValid || loanData.isExpired}
                    isLoading={tab.form.formState.isSubmitting}
                  >
                    {tab.actionLabel}
                  </Button>
                </form>
              ),
          )}
        </div>
      </div>
    </Card>
  );
}
