import type { TradeInfoProps } from "@/types/interfaces";
import { cn } from "@/utils/object";

export default function TradeInfo({ rows, className }: TradeInfoProps) {
  return (
    <div className={cn("flex flex-col divide-y divide-border rounded-lg border bg-muted/50 text-sm", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-3 py-2">
          <span className="text-muted-foreground">{row.label}</span>
          <span
            className={
              row.variant === "destructive"
                ? "text-destructive"
                : row.variant === "success"
                  ? "text-success"
                  : "font-medium"
            }
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
