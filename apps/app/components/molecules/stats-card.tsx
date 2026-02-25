import Badge from "@/components/atoms/badge";
import { StatsCardProps } from "@/types/interfaces";

// Icons
import { TrendingDown, TrendingUp } from "lucide-react";

export default function StatsCard({
  variant,
  title,
  subtitle,
  value,
  change,
  secondary,
}: StatsCardProps) {
  const isNegative = change?.startsWith("-");

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
      <span className="text-xs font-medium text-muted-foreground">
        {title}
        {subtitle && (
          <span className="ml-1 text-muted-foreground">{subtitle}</span>
        )}
      </span>

      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold">{value}</span>
          {variant === "spot" && change && (
            <Badge
              variant="outline"
              className={isNegative ? "text-destructive" : "text-success"}
            >
              {change}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{secondary}</span>
        {variant === "spot" &&
          (isNegative ? (
            <TrendingDown className="size-3.5 text-destructive" />
          ) : (
            <TrendingUp className="size-3.5 text-success" />
          ))}
      </div>
    </div>
  );
}
