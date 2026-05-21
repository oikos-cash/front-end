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

  return (
    <Card
      action={actions}
      description={description}
      title={subtitle ? `${title} ${subtitle}` : title}
    >
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
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
