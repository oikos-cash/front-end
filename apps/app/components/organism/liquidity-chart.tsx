"use client";

import { useEffect, useState } from "react";
import { AxisBottom } from "@visx/axis";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";

// Components
import Skeleton from "@/components/atoms/skeleton";

// Types
import type { LiquidityBar } from "@/types/interfaces";

// Utils
import { LIQUIDITY_CHART_MARGIN as MARGIN } from "@/utils/number";

interface LiquidityChartProps {
  bars: LiquidityBar[];
  spotPrice: number;
}

function Chart({
  width,
  height,
  bars,
  spotPrice,
  onReady,
}: {
  width: number;
  height: number;
  bars: LiquidityBar[];
  spotPrice: number;
  onReady: () => void;
}) {
  useEffect(() => {
    if (width > 0) onReady();
  }, [width, onReady]);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const xScale = scaleLinear({
    domain: [0.0001, 0.0013],
    range: [0, innerWidth],
  });

  const yScale = scaleLinear({
    domain: [0, 1],
    range: [innerHeight, 0],
  });

  return (
    <svg width={width} height={height}>
      <Group left={MARGIN.left} top={MARGIN.top}>
        {bars.map((bar, i) => {
          const x = xScale(bar.from);
          const barWidth = xScale(bar.to) - xScale(bar.from);
          const barHeight = innerHeight - yScale(bar.height);
          const y = innerHeight - barHeight;

          return (
            <Bar
              key={i}
              x={x}
              y={y}
              width={Math.max(barWidth, 2)}
              height={barHeight}
              fill={bar.fill}
            />
          );
        })}

        <line
          x1={xScale(spotPrice)}
          y1={0}
          x2={xScale(spotPrice)}
          y2={innerHeight}
          stroke="#9333ea"
          strokeWidth={2}
          strokeDasharray="5,5"
          pointerEvents="none"
        />
        <text
          x={xScale(spotPrice) + 5}
          y={16}
          fill="#9333ea"
          fontSize={12}
          fontWeight="bold"
          pointerEvents="none"
        >
          Spot
        </text>

        <AxisBottom
          top={innerHeight}
          scale={xScale}
          numTicks={6}
          tickFormat={(v) => (v as number).toFixed(4)}
          stroke="hsl(var(--muted-foreground))"
          tickStroke="hsl(var(--muted-foreground))"
          tickLabelProps={{
            fill: "hsl(var(--muted-foreground))",
            fontSize: 11,
            textAnchor: "middle",
            fontFamily: "var(--font-mono, monospace)",
          }}
        />
      </Group>
    </svg>
  );
}

export default function LiquidityChart({ bars, spotPrice }: LiquidityChartProps) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative h-75 rounded-md border border-border">
      {!ready && <Skeleton className="absolute inset-0 z-10 rounded-md" />}
      <div className={!ready ? "invisible" : ""}>
        <ParentSize debounceTime={100}>
          {({ width }) => (
            <Chart
              width={width}
              height={300}
              bars={bars}
              spotPrice={spotPrice}
              onReady={() => setReady(true)}
            />
          )}
        </ParentSize>
      </div>
    </div>
  );
}
