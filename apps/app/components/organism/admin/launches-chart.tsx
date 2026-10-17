"use client";

// Components
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { AreaClosed, LinePath } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { ChartCard, tickLabelProps } from "./shared";

// Types
import type { LaunchPoint } from "@/utils/admin";

const MARGIN = { top: 12, right: 16, bottom: 26, left: 34 };

export default function LaunchesChart({ data }: { data: LaunchPoint[] }) {
  return (
    <ChartCard
      title="Cumulative Launches"
      description="Tokens launched on the protocol over time"
      badge={data.length > 0 ? `${data[data.length - 1]!.cumulative} total` : undefined}
      isEmpty={data.length === 0}
      emptyTitle="No launch history"
      emptyDescription="Launch dates aren't available for these tokens yet."
    >
      {({ width, height }) => {
        const innerW = Math.max(width - MARGIN.left - MARGIN.right, 0);
        const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 0);

        const first = data[0]!.date;
        const last = data[data.length - 1]!.date;
        // Guard the single-point / same-day case so the time scale has width.
        const domainMin = first.getTime();
        const domainMax =
          last.getTime() > domainMin ? last.getTime() : domainMin + 86_400_000;
        const maxY = Math.max(...data.map((d) => d.cumulative), 1);

        const xScale = scaleTime({
          domain: [new Date(domainMin), new Date(domainMax)],
          range: [0, innerW],
        });
        const yScale = scaleLinear({
          domain: [0, maxY * 1.1],
          range: [innerH, 0],
          nice: true,
        });

        const x = (d: LaunchPoint) => xScale(d.date) ?? 0;
        const y = (d: LaunchPoint) => yScale(d.cumulative) ?? 0;

        return (
          <svg width={width} height={height}>
            <defs>
              <linearGradient id="launchesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Group left={MARGIN.left} top={MARGIN.top}>
              <AxisLeft
                scale={yScale}
                numTicks={4}
                stroke={"transparent"}
                tickStroke={"transparent"}
                tickLabelProps={tickLabelProps}
              />
              <AxisBottom
                top={innerH}
                scale={xScale}
                numTicks={Math.min(6, data.length)}
                stroke="var(--border)"
                tickStroke="var(--border)"
                tickFormat={(v) =>
                  new Date(v as number).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                tickLabelProps={() => ({ ...tickLabelProps(), textAnchor: "middle" })}
              />
              <AreaClosed<LaunchPoint>
                data={data}
                x={x}
                y={y}
                yScale={yScale}
                fill="url(#launchesFill)"
                stroke="transparent"
              />
              <LinePath<LaunchPoint>
                data={data}
                x={x}
                y={y}
                stroke="var(--chart-1)"
                strokeWidth={2}
              />
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={x(d)}
                  cy={y(d)}
                  r={2.5}
                  fill="var(--chart-1)"
                />
              ))}
            </Group>
          </svg>
        );
      }}
    </ChartCard>
  );
}
