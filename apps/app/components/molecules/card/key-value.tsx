// Types
import type { TradeInfoProps } from "@/types/interfaces";

// Utils
import { cn } from "@/utils/object";

export default function KeyValueCard({ rows, className }: TradeInfoProps) {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-border/40 overflow-hidden rounded-md border border-border/60 bg-card/40 text-sm",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_55%)]",
        className,
      )}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 px-3 py-1.5 transition-colors hover:bg-accent/30"
        >
          <span className="eyebrow-strong">{row.label}</span>
          <span
            className={cn(
              "font-mono tabular-nums tracking-tight",
              row.variant === "destructive"
                ? "text-destructive"
                : row.variant === "success"
                  ? "text-success"
                  : "font-medium text-foreground",
            )}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
