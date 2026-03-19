import Link from "next/link";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import AvatarInfo from "@/components/molecules/avatar-info";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { StudioTokenListProps, StudioToken } from "@/types/interfaces";

// Utils
import { getStudioTokenStatValue } from "@/utils/number";

// Icons
import { ArrowUpRight, Coins } from "lucide-react";

// Constants
import {
  STUDIO_TOKEN_STATS,
  STUDIO_TOKEN_STATUS_VARIANT,
} from "@/types/constants";

export default function StudioTokenList({ tokens }: StudioTokenListProps) {
  const t = useTranslations("studio");

  if (tokens.length === 0) {
    return (
      <Card>
        <Empty
          className="py-12"
          title={t("noTokens")}
          description={t("noTokensDesc")}
          icon={<Coins className="size-6 text-muted-foreground" />}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("yourTokens")}</h2>
        <p className="text-sm text-muted-foreground">{t("yourTokensDesc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tokens.map((token) => (
          <Link key={token.id} href={`/studio/${token.symbol.toLowerCase()}`}>
            <Card
              className="h-full transition-colors hover:border-primary/50"
              header={<AvatarInfo title={token.name} subtitle={token.symbol} />}
              action={
                <Badge variant={STUDIO_TOKEN_STATUS_VARIANT[token.status]}>
                  {t(token.status)}
                </Badge>
              }
            >
              <div className="flex flex-col gap-3">
                {STUDIO_TOKEN_STATS.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t(key)}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-medium">
                        {getStudioTokenStatValue(token, key)}
                      </span>
                      {key === "price" && (
                        <span
                          className={`text-xs font-medium ${token.change24h >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {token.change24h >= 0 ? "+" : ""}
                          {token.change24h}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="xs"
                    className="w-full"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/?token=${token.symbol.toLowerCase()}`;
                    }}
                  >
                    <ArrowUpRight className="size-3" />
                    {t("viewExchange")}
                  </Button>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
