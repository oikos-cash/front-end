"use client";

// Components
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisLeft } from "@visx/axis";
import { ChartCard, LegendDot, tickLabelProps } from "./shared";

// Utils / types
import { LOAN_TYPE_COLOR, type LoanActivityDay } from "@/utils/admin";

const MARGIN = { top: 10, right: 12, bottom: 24, left: 30 };

const SERIES = [
  { key: "borrow", label: "Borrow", color: LOAN_TYPE_COLOR.borrow },
  { key: "payback", label: "Payback", color: LOAN_TYPE_COLOR.payback },
  { key: "roll", label: "Roll", color: LOAN_TYPE_COLOR.roll },
] as const;

export default function LoanActivityChart({
  data,
}: {
  data: LoanActivityDay[];
}) {
  return (
    <ChartCard
      title="Loan Activity"
      description="Borrow / payback / roll events per day (recent window)"
      badge={data.length > 0 ? `${data.length}d` : undefined}
      isEmpty={data.length === 0}
      emptyTitle="No loan activity"
      emptyDescription="No recent loan events have been indexed."
      legend={
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {SERIES.map((s) => (
            <LegendDot key={s.key} color={s.color} label={s.label} />
          ))}
        </div>
      }
    >
      {({ width, height }) => {
        const innerW = Math.max(width - MARGIN.left - MARGIN.right, 0);
        const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 0);

        const xScale = scaleBand<number>({
          domain: data.map((_, i) => i),
          range: [0, innerW],
          padding: 0.25,
        });
        const maxTotal = Math.max(
          ...data.map((d) => d.borrow + d.payback + d.roll),
          1,
        );
        const yScale = scaleLinear({
          domain: [0, maxTotal],
          range: [innerH, 0],
          nice: true,
        });

        // Show ~6 date labels evenly across the window.
        const labelStep = Math.max(Math.ceil(data.length / 6), 1);

        return (
          <svg width={width} height={height}>
            <Group left={MARGIN.left} top={MARGIN.top}>
              <AxisLeft
                scale={yScale}
                numTicks={4}
                stroke="transparent"
                tickStroke="transparent"
                tickLabelProps={tickLabelProps}
              />
              {data.map((d, i) => {
                const x = xScale(i) ?? 0;
                const bw = xScale.bandwidth();
                let yCursor = innerH;
                return (
                  <Group key={i}>
                    {SERIES.map((s) => {
                      const v = d[s.key];
                      if (v <= 0) return null;
                      const barH = innerH - yScale(v);
                      yCursor -= barH;
                      return (
                        <Bar
                          key={s.key}
                          x={x}
                          y={yCursor}
                          width={bw}
                          height={barH}
                          fill={s.color}
                        />
                      );
                    })}
                    {i % labelStep === 0 && (
                      <text
                        x={x + bw / 2}
                        y={innerH + 16}
                        textAnchor="middle"
                        className="font-mono"
                        fontSize={10}
                        fill="var(--muted-foreground)"
                      >
                        {d.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </text>
                    )}
                  </Group>
                );
              })}
            </Group>
          </svg>
        );
      }}
    </ChartCard>
  );
}
