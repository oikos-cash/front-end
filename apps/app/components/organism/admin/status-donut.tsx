"use client";

// Components
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { ChartCard, LegendDot } from "./shared";

// Utils / types
import { formatCount, type StatusSlice } from "@/utils/admin";

export default function StatusDonut({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ChartCard
      title="Token Status"
      description="Lifecycle distribution across all tokens"
      isEmpty={data.length === 0}
      emptyTitle="No tokens"
      emptyDescription="No tokens have been indexed yet."
      legend={
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {data.map((d) => (
            <LegendDot
              key={d.status}
              color={d.color}
              label={`${d.label} (${d.count})`}
            />
          ))}
        </div>
      }
    >
      {({ width, height }) => {
        const radius = Math.min(width, height) / 2;
        const thickness = Math.max(radius * 0.34, 14);
        const centerY = height / 2;
        const centerX = width / 2;

        return (
          <svg width={width} height={height}>
            <Group top={centerY} left={centerX}>
              <Pie
                data={data}
                pieValue={(d) => d.count}
                outerRadius={radius - 2}
                innerRadius={radius - thickness}
                cornerRadius={3}
                padAngle={0.02}
              >
                {(pie) =>
                  pie.arcs.map((arc) => {
                    const path = pie.path(arc) ?? undefined;
                    return (
                      <path
                        key={arc.data.status}
                        d={path}
                        fill={arc.data.color}
                        stroke="var(--card)"
                        strokeWidth={1}
                      />
                    );
                  })
                }
              </Pie>
              <text
                textAnchor="middle"
                dy={-2}
                className="font-mono num"
                fontSize={22}
                fontWeight={600}
                fill="var(--foreground)"
              >
                {formatCount(total)}
              </text>
              <text
                textAnchor="middle"
                dy={16}
                fontSize={10}
                letterSpacing="0.08em"
                fill="var(--muted-foreground)"
              >
                TOKENS
              </text>
            </Group>
          </svg>
        );
      }}
    </ChartCard>
  );
}
