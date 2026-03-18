import Link from "next/link";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import Avatar from "@/components/atoms/avatar";
import ProgressBar from "@/components/atoms/progress-bar";

// Hooks
import { useTranslations } from "next-intl";

// Types
import { TokenCardProps } from "@/types/interfaces";

// Constants
import { STATUS_VARIANT, HEALTH_VARIANT } from "@/types/constants";

// Utils
import { formatShortDate } from "@/utils/date";

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
            <Badge variant="outline" className="text-[10px]">
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
          <Badge variant={STATUS_VARIANT[token.status]} className="text-[10px]">
            {statusLabel}
          </Badge>
          <Badge variant={HEALTH_VARIANT[token.health]} className="text-[10px]">
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
            <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
              <span className="text-muted-foreground">{t("marketCap")}</span>
              <span className="font-medium">
                ${(token.marketCap ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
              <span className="text-muted-foreground">{t("created")}</span>
              <span className="font-medium">
                {token.createdAt ? formatShortDate(token.createdAt) : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
              <span className="text-muted-foreground">{t("totalSupply")}</span>
              <span className="font-medium">
                {(token.totalSupply ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
              <span className="text-muted-foreground">{t("circSupply")}</span>
              <span className="font-medium">
                {(token.circulatingSupply ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
