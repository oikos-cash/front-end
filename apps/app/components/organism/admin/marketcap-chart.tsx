"use client";

// Components
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { ChartCard } from "./shared";

// Utils / types
import { formatUsd, type MarketCapBar } from "@/utils/admin";

const MARGIN = { top: 6, right: 64, bottom: 6, left: 56 };
const ROW_H = 26;

export default function MarketCapChart({ data }: { data: MarketCapBar[] }) {
  // Height grows with the number of bars so each row keeps a comfortable band.
  const height = Math.max(data.length * ROW_H + MARGIN.top + MARGIN.bottom, 120);

  return (
    <ChartCard
      title="Market Cap by Token"
      description="Top tokens by fully-diluted market cap (USD)"
      badge={data.length > 0 ? `top ${data.length}` : undefined}
      height={height}
      isEmpty={data.length === 0}
      emptyTitle="No market caps"
      emptyDescription="Price/supply data isn't available for these tokens yet."
    >
      {({ width, height: h }) => {
        const innerW = Math.max(width - MARGIN.left - MARGIN.right, 0);
        const innerH = Math.max(h - MARGIN.top - MARGIN.bottom, 0);

        const yScale = scaleBand<string>({
          domain: data.map((d) => d.symbol),
          range: [0, innerH],
          padding: 0.28,
        });
        const maxV = Math.max(...data.map((d) => d.valueUsd), 1);
        const xScale = scaleLinear({ domain: [0, maxV], range: [0, innerW] });

        return (
          <svg width={width} height={h}>
            <Group left={MARGIN.left} top={MARGIN.top}>
              {data.map((d) => {
                const y = yScale(d.symbol) ?? 0;
                const barH = yScale.bandwidth();
                const barW = xScale(d.valueUsd);
                return (
                  <Group key={d.symbol}>
                    {/* symbol label in the left gutter */}
                    <text
                      x={-8}
                      y={y + barH / 2}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="font-mono"
                      fontSize={11}
                      fill="var(--foreground)"
                    >
                      {d.symbol}
                    </text>
                    {/* track */}
                    <Bar
                      x={0}
                      y={y}
                      width={innerW}
                      height={barH}
                      rx={4}
                      fill="var(--secondary)"
                    />
                    {/* value bar */}
                    <Bar
                      x={0}
                      y={y}
                      width={Math.max(barW, 2)}
                      height={barH}
                      rx={4}
                      fill="var(--chart-1)"
                    />
                    {/* value label at the end of the bar */}
                    <text
                      x={Math.min(barW + 8, innerW + MARGIN.right - 4)}
                      y={y + barH / 2}
                      dominantBaseline="middle"
                      className="font-mono"
                      fontSize={10}
                      fill="var(--muted-foreground)"
                    >
                      {formatUsd(d.valueUsd)}
                    </text>
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
