"use client";

// Components
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import { ParentSize } from "@visx/responsive";

// Icons
import { ChartNoAxesColumn } from "lucide-react";

/**
 * Section label used across the admin dashboard — a glowing primary LED dot
 * followed by the title in confident uppercase tracked semibold. Mirrors the
 * treatment in `molecules/card/kpi` so KPI tiles, charts and tables share one
 * visual language.
 */
export function SectionTitle({
  children,
  badge,
}: {
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.6)]"
        aria-hidden
      />
      <span className="bg-[linear-gradient(180deg,#ffffff,rgba(255,255,255,0.7))] bg-clip-text text-xs font-semibold uppercase tracking-[0.08em] text-transparent">
        {children}
      </span>
      {badge && (
        <span className="eyebrow rounded-sm bg-primary/10 px-1.5 py-0.5 font-semibold text-primary/90">
          {badge}
        </span>
      )}
    </span>
  );
}

/**
 * A titled card whose body is a fixed-height, width-responsive SVG canvas.
 * The `children` render-prop receives the measured `{ width, height }` so
 * charts can lay out against real pixels. Falls back to an `Empty` state
 * when there's nothing to plot (e.g. the backend is offline).
 */
export function ChartCard({
  title,
  description,
  action,
  badge,
  height = 260,
  isEmpty,
  emptyTitle = "No data yet",
  emptyDescription = "Nothing to plot for this metric.",
  legend,
  children,
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  height?: number;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  legend?: React.ReactNode;
  children: (dims: { width: number; height: number }) => React.ReactNode;
}) {
  return (
    <Card
      title={<SectionTitle badge={badge}>{title}</SectionTitle>}
      description={description}
      action={action}
    >
      {isEmpty ? (
        <Empty
          className="py-10"
          title={emptyTitle}
          description={emptyDescription}
          icon={<ChartNoAxesColumn className="size-6 text-muted-foreground" />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div style={{ height }} className="w-full">
            <ParentSize>
              {({ width, height: h }) =>
                width > 0 && h > 0 ? children({ width, height: h }) : null
              }
            </ParentSize>
          </div>
          {legend}
        </div>
      )}
    </Card>
  );
}

/** A small colour-swatch + label used in chart legends. */
export function LegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
      <span
        className="block size-2 rounded-[3px]"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** Shared axis styling for visx charts (muted, mono tick labels). */
export const AXIS_COLOR = "var(--muted-foreground)";

export const tickLabelProps = () =>
  ({
    fill: AXIS_COLOR,
    fontSize: 10,
    fontFamily: "var(--font-mono, monospace)",
  }) as const;
