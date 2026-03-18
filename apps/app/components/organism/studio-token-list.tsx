import Link from "next/link";

// Components
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import AvatarInfo from "@/components/molecules/avatar-info";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { StudioToken } from "@/types/interfaces";

// Utils
import { formatCompactNumber } from "@/utils/number";

// Icons
import { Coins } from "lucide-react";

const STATUS_VARIANT: Record<StudioToken["status"], "default" | "secondary" | "destructive"> = {
  active: "default",
  presale: "secondary",
  paused: "destructive",
};

export default function StudioTokenList({ tokens }: { tokens: StudioToken[] }) {
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
              header={
                <AvatarInfo title={token.name} subtitle={token.symbol} />
              }
              action={
                <Badge variant={STATUS_VARIANT[token.status]}>
                  {t(token.status)}
                </Badge>
              }
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("volume24h")}</span>
                  <span className="text-sm font-medium">${formatCompactNumber(token.volume24h)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("holders")}</span>
                  <span className="text-sm font-medium">{token.holders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("liquidity")}</span>
                  <span className="text-sm font-medium">${formatCompactNumber(token.liquidity)}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
