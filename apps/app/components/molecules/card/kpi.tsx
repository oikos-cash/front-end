// Icons
import { TrendingDown, TrendingUp } from "lucide-react";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";

// Utils
import { cn } from "@/utils/object";

// Types
import { KpiCardProps } from "@/types/interfaces";

export default function KpiCard({
  title,
  value,
  change,
  actions,
  subtitle,
  secondary,
  description,
}: KpiCardProps) {
  const isNegative = change?.startsWith("-");

  // KPI titles are short uppercase data-section labels (SPOT, MARKET CAP, IMV).
  // Render them as a brand-accented micro-label rather than a regular card
  // title so they pop as "what this number is" instead of body copy.
  const styledTitle = (
    <span className="flex items-center gap-2">
      <span className="h-3 w-[2px] rounded-full bg-primary/70" aria-hidden />
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
          {subtitle}
        </span>
      )}
    </span>
  );

  return (
    <Card action={actions} description={description} title={styledTitle}>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </span>
          {change && (
            <Badge
              variant="outline"
              className={cn(
                "font-mono",
                isNegative ? "text-destructive" : "text-success",
              )}
            >
              {change}
            </Badge>
          )}
        </div>

        {(secondary || change) && (
          <div className="flex items-center gap-1.5">
            {secondary && (
              <span className="text-xs text-muted-foreground">{secondary}</span>
            )}
            {change &&
              (isNegative ? (
                <TrendingDown className="size-3.5 text-destructive" />
              ) : (
                <TrendingUp className="size-3.5 text-success" />
              ))}
          </div>
        )}
      </div>
    </Card>
  );
}
