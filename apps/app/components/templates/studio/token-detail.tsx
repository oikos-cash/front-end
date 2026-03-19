"use client";

import Link from "next/link";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
import PageHeader from "@/components/molecules/page-header";
import AvatarInfo from "@/components/molecules/avatar-info";

// Hooks
import { useStudioTokenDetail } from "@/hooks/use-studio-token-detail";

// Utils
import { timeAgo } from "@/utils/date";
import { formatCompactNumber } from "@/utils/number";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function StudioTokenDetailTemplate() {
  const {
    t,
    token,
    kpiCards,
    activity,
    isConnected,
    handleConnect,
    tokenInfoRows,
    ACTIVITY_VARIANT,
    STATUS_VARIANT,
  } = useStudioTokenDetail();

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
            {tokenInfoRows.map((row) => (
              <div key={row.key} className="flex justify-between">
                <span className="text-muted-foreground">{t(row.key)}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("status")}</span>
              <Badge variant={STATUS_VARIANT[token.status]} className="w-fit">
                {t(token.status)}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("performance")}</h2>
        <p className="text-sm text-muted-foreground">{t("performanceDesc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={t(kpi.key)}
            value={kpi.value}
            change={kpi.change}
          />
        ))}
      </div>

      <Card title={t("activityTitle")} description={t("activityDescription")}>
        {activity.length > 0 ? (
          <div className="flex flex-col gap-0">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={ACTIVITY_VARIANT[item.type]}
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {t(`activity_${item.type}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {item.wallet}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium">
                    {formatCompactNumber(item.amount)} {item.token}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
        )}
      </Card>

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
