"use client";

import { useMemo } from "react";
import Link from "next/link";

// Components
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import KpiCard from "@/components/molecules/kpi-card";
import PageHeader from "@/components/molecules/page-header";
import AvatarInfo from "@/components/molecules/avatar-info";

// Hooks
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useWallet } from "@/stores/wallet";

// Utils
import { generateMockStudioData, formatCompactNumber } from "@/utils/number";
import { formatShortDate } from "@/utils/date";

// Icons
import { Lock, Wallet } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> =
  {
    active: "default",
    presale: "secondary",
    paused: "destructive",
  };

export default function StudioTokenDetailTemplate() {
  const t = useTranslations("studio");
  const { isConnected, handleConnect } = useWallet();
  const params = useParams();
  const tokenSymbol = (params.token as string)?.toUpperCase() ?? "OKS";

  const { tokens } = useMemo(() => generateMockStudioData(), []);
  const token = tokens.find((tk) => tk.symbol === tokenSymbol) ?? tokens[0];

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Empty
          title={t("connectTitle")}
          description={t("connectDescription")}
          icon={<Lock className="size-6 text-muted-foreground" />}
        >
          <Button variant="default" size="sm" onClick={handleConnect}>
            <Wallet className="size-3.5" />
            {t("connectButton")}
          </Button>
        </Empty>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-6 py-4">
        <Empty title={t("noTokens")} description={t("noTokensDesc")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <PageHeader
        title={t("tokenDetail")}
        description={t("tokenDetailDesc", { token: token.name })}
        breadcrumbs={[
          { label: t("title"), href: "/studio" },
          { label: token.name },
        ]}
      />

      {/* Token Info Card */}
      <Card
        title={t("tokenInfo")}
        description={t("tokenInfoDesc")}
        action={
          <Badge variant={STATUS_VARIANT[token.status]}>
            {t(token.status)}
          </Badge>
        }
      >
        <div className="flex flex-col gap-4">
          <AvatarInfo title={token.name} subtitle={token.symbol} size="lg" />

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("name")}</span>
              <span className="font-medium">{token.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("symbol")}</span>
              <span className="font-medium">{token.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("created")}</span>
              <span className="font-medium">
                {formatShortDate(token.createdAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("status")}</span>
              <Badge variant={STATUS_VARIANT[token.status]} className="w-fit">
                {t(token.status)}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance KPIs */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("performance")}</h2>
        <p className="text-sm text-muted-foreground">{t("performanceDesc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t("volume24h")}
          value={`$${formatCompactNumber(token.volume24h)}`}
        />
        <KpiCard
          title={t("totalVolumeLabel")}
          value={`$${formatCompactNumber(token.totalVolume)}`}
        />
        <KpiCard title={t("holders")} value={String(token.holders)} />
        <KpiCard
          title={t("liquidity")}
          value={`$${formatCompactNumber(token.liquidity)}`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {token.status === "presale" && (
          <Button variant="outline" asChild>
            <Link href={`/presale/${token.symbol.toLowerCase()}`}>
              {t("viewPresale")}
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/liquidity/${token.symbol.toLowerCase()}`}>
            {t("viewLiquidity")}
          </Link>
        </Button>
        <Button variant="default" asChild>
          <Link href={`/trade/${token.symbol.toLowerCase()}`}>
            {t("viewExchange")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
