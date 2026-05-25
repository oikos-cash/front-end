// Components
import Link from "next/link";
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import Avatar from "@/components/atoms/avatar";
import ProgressBar from "@/components/atoms/progress-bar";

// Hooks
import { useTranslations } from "next-intl";

// Utils
import { formatCompactNumber } from "@/utils/number";

// Types
import { TokenCardProps } from "@/types/interfaces";

// Constants
import { STATUS_VARIANT, HEALTH_VARIANT } from "@/types/constants";

// Utils
import { timeAgo } from "@/utils/date";

export default function TokenCard({ token }: TokenCardProps) {
  const t = useTranslations("markets");
  const statusLabel = t(token.status);
  const healthLabel = t(token.health);

  return (
    <Card
      className="h-full transition-colors hover:border-primary/50"
      header={
        <div className="flex items-center gap-3">
          <Avatar name={token.symbol} src={token.iconUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{token.name}</p>
            <Badge variant="outline" className="text-2xs">
              {token.symbol}
            </Badge>
          </div>
        </div>
      }
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/liquidity/${token.symbol.toLowerCase()}`}>
              {t("viewDividends")}
            </Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link
              href={
                token.isPresale
                  ? `/presale/${token.symbol.toLowerCase()}`
                  : `/trade/${token.symbol.toLowerCase()}`
              }
            >
              {token.isPresale ? t("buy") : t("trade")}
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {token.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant={STATUS_VARIANT[token.status]} className="text-2xs">
            {statusLabel}
          </Badge>
          <Badge variant={HEALTH_VARIANT[token.health]} className="text-2xs">
            {healthLabel}
          </Badge>
        </div>

        {token.isPresale ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("raised")}</span>
              <span className="font-medium">
                ${(token.raised ?? 0).toLocaleString()} / $
                {(token.hardCap ?? 0).toLocaleString()}
              </span>
            </div>
            <ProgressBar value={token.raised ?? 0} max={token.hardCap ?? 1} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              {
                label: "marketCap",
                value: token.marketCap
                  ? `$${formatCompactNumber(token.marketCap)}`
                  : "—",
              },
              {
                label: "created",
                value: token.createdAt ? timeAgo(token.createdAt) : "—",
              },
              {
                label: "totalSupply",
                value: token.totalSupply
                  ? formatCompactNumber(token.totalSupply)
                  : "—",
              },
              {
                label: "circSupply",
                value: token.circulatingSupply
                  ? formatCompactNumber(token.circulatingSupply)
                  : "—",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2"
              >
                <span className="text-muted-foreground">{t(stat.label)}</span>
                <span className="font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
