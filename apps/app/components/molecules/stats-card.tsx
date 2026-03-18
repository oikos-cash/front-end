import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import { StatsCardProps } from "@/types/interfaces";

// Icons
import { TrendingDown, TrendingUp } from "lucide-react";

export default function StatsCard({
  variant,
  title,
  description,
  subtitle,
  value,
  change,
  secondary,
  actions,
}: StatsCardProps) {
  const isNegative = change?.startsWith("-");

  return (
    <Card
      action={actions}
      description={description}
      title={subtitle ? `${title} ${subtitle}` : title}
    >
      <div>
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
    </Card>
  );
}
