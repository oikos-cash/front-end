import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import { KpiCardProps } from "@/types/interfaces";

// Icons
import { TrendingDown, TrendingUp } from "lucide-react";

export default function KpiCard({
  title,
  description,
  subtitle,
  value,
  change,
  secondary,
  actions,
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
          <span className="text-lg font-semibold">{value}</span>
          {change && (
            <Badge
              variant="outline"
              className={isNegative ? "text-destructive" : "text-success"}
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
