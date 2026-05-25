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
  icon,
}: KpiCardProps) {
  const isNegative = change?.startsWith("-");

  // KPI titles read as data-section labels. Treat them as a small glowing
  // status chip: a primary-yellow LED dot followed by the title in confident
  // uppercase tracked semibold, sitting on the card's tinted header strip.
  const styledTitle = (
    <span className="inline-flex items-center gap-2">
      <span
        className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.6)]"
        aria-hidden
      />
      <span className="bg-[linear-gradient(180deg,#ffffff,rgba(255,255,255,0.7))] bg-clip-text text-xs font-semibold uppercase tracking-[0.08em] text-transparent">
        {title}
      </span>
      {subtitle && (
        <span className="eyebrow rounded-sm bg-primary/10 px-1.5 py-0.5 font-semibold text-primary/90">
          {subtitle}
        </span>
      )}
    </span>
  );

  return (
    <Card action={actions} description={description} title={styledTitle}>
      <div>
        <div className="flex items-center gap-2.5">
          {icon}
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
