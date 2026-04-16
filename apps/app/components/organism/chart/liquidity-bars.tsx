"use client";

import { useEffect } from "react";

// Components
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";

// Types
import type { LiquidityChartInnerProps } from "@/types/interfaces";

// Utils
import { scaleLinear } from "@visx/scale";
import { LIQUIDITY_CHART_MARGIN as MARGIN } from "@/utils/number";

export default function LiquidityBars({
  bars,
  width,
  height,
  spotPrice,
  onReady,
  onHover,
  onLeave,
}: LiquidityChartInnerProps) {
  useEffect(() => {
    if (width > 0) onReady();
  }, [width, onReady]);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  // Compute scales from actual data
  const allPrices = bars.flatMap((b) => [b.from, b.to]).concat(spotPrice);
  const minPrice = Math.min(...allPrices) * 0.9;
  const maxPrice = Math.max(...allPrices) * 1.1;
  const maxHeight = Math.max(...bars.map((b) => b.height), 0.001);

  const xScale = scaleLinear({
    domain: [minPrice, maxPrice],
    range: [0, innerWidth],
  });

  const yScale = scaleLinear({
    domain: [0, maxHeight],
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
              onMouseMove={(e) => {
                const svg = (e.target as SVGElement).closest("svg");
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                onHover({
                  bar,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onMouseLeave={onLeave}
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
