import Link from "next/link";
import { useTranslations } from "next-intl";

// Components
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import TokenIcon from "@/components/atoms/token-icon";
import ProgressBar from "@/components/atoms/progress-bar";

// Types
import { TokenCardProps } from "@/types/interfaces";

// Utils
import { formatShortDate } from "@/utils/date";

const STATUS_VARIANT = {
  graduated: "default",
  inProgress: "secondary",
  finalized: "outline",
  preparing: "ghost",
} as const;

const HEALTH_VARIANT = {
  healthy: "default",
  warning: "destructive",
  critical: "destructive",
} as const;

export default function TokenCard({ token }: TokenCardProps) {
  const t = useTranslations("markets");

  const statusLabel = t(token.status);
  const healthLabel = t(token.health);

  const href = `/liquidity/${token.symbol.toLowerCase()}`;

  return (
    <Link
      href={href}
      className="flex h-full flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <TokenIcon token={token.symbol} iconUrl={token.iconUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{token.name}</p>
          <Badge variant="outline" className="text-[10px]">
            {token.symbol}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-xs text-muted-foreground">
        {token.description}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={STATUS_VARIANT[token.status]} className="text-[10px]">
          {statusLabel}
        </Badge>
        <Badge variant={HEALTH_VARIANT[token.health]} className="text-[10px]">
          {healthLabel}
        </Badge>
      </div>

      {/* Stats */}
      {token.isPresale ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("raised")}</span>
            <span className="font-medium">
              ${(token.raised ?? 0).toLocaleString()} / ${(token.hardCap ?? 0).toLocaleString()}
            </span>
          </div>
          <ProgressBar value={token.raised ?? 0} max={token.hardCap ?? 1} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-muted-foreground">{t("marketCap")}</span>
            <span className="font-medium">${(token.marketCap ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-muted-foreground">{t("created")}</span>
            <span className="font-medium">
              {token.createdAt ? formatShortDate(token.createdAt) : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-muted-foreground">{t("totalSupply")}</span>
            <span className="font-medium">{(token.totalSupply ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-muted-foreground">{t("circSupply")}</span>
            <span className="font-medium">{(token.circulatingSupply ?? 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <Button variant="default" size="sm" className="mt-auto w-full" asChild>
        <Link
          href={token.isPresale ? "/launchpad" : `/trade/${token.symbol.toLowerCase()}`}
          onClick={(e) => e.stopPropagation()}
        >
          {token.isPresale ? t("buy") : t("trade")}
        </Link>
      </Button>
    </Link>
  );
}
