"use client";

// Components
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
import ProgressBar from "@/components/atoms/progress-bar";
import AvatarInfo from "@/components/molecules/avatar-info";
import PageHeader from "@/components/molecules/page-header";
import DividendClaimHistory from "@/components/organism/dividend/claim-history";

// Hooks
import { useDividendTokenDetail } from "@/hooks/use-dividend-token-detail";

// Icons
import {
  Lock,
  Coins,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
} from "lucide-react";

export default function DividendTokenDetailTemplate() {
  const {
    t,
    isConnected,
    handleConnect,
    tokenDetail,
    entries,
    currentEntry,
    trancheIndex,
    setTrancheIndex,
    withdrawing,
    handleWithdraw,
    tokenInfoRows,
    kpiCards,
    vestingGridRows,
  } = useDividendTokenDetail();

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

  if (!tokenDetail) {
    return (
      <div className="flex flex-col gap-6 py-4">
        <Empty
          title={t("noDividends")}
          description={t("noDividendsDesc")}
          icon={<Coins className="size-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <PageHeader
        title={t("detailTitle")}
        description={t("detailDescription", { token: tokenDetail.tokenName })}
        breadcrumbs={[
          { label: t("title"), href: "/dividends" },
          { label: tokenDetail.tokenName },
        ]}
      />

      <Card title={t("tokenInfo")} description={t("tokenInfoDesc")}>
        <div className="flex flex-col gap-4">
          <AvatarInfo
            title={tokenDetail.tokenName}
            subtitle={tokenDetail.tokenSymbol}
            size="lg"
          />
          <div className="flex flex-col gap-2 text-sm">
            {tokenInfoRows.map((row) => (
              <div key={row.key} className="flex justify-between">
                <span className="text-muted-foreground">{t(row.key)}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpiCards.map((kpi) => (
          <KpiCard key={kpi.key} title={t(kpi.key)} value={kpi.value} />
        ))}
      </div>

      <Card title={t("vestingTitle")} description={t("vestingDescription")}>
        {entries.length === 0 ? (
          <Empty
            className="py-8"
            title={t("noVestingEntries")}
            description={t("noVestingEntriesDesc")}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("tranche", { index: trancheIndex + 1 })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={trancheIndex === 0}
                  onClick={() => setTrancheIndex((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {trancheIndex + 1} / {entries.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={trancheIndex === entries.length - 1}
                  onClick={() => setTrancheIndex((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <Badge
              variant={currentEntry.isFullyUnlocked ? "default" : "secondary"}
              className="w-fit"
            >
              {currentEntry.isFullyUnlocked
                ? t("fullyUnlocked")
                : t("vesting")}
            </Badge>

            {vestingGridRows.map((pair, i) => (
              <div key={i} className="grid grid-cols-2 gap-4">
                {pair.map((cell) => (
                  <div key={cell.key} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {t(cell.key)}
                    </span>
                    <span
                      className={`text-sm ${cell.fontWeight ?? "font-medium"} ${cell.className ?? ""}`}
                    >
                      {cell.value}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("vestingProgress")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentEntry.vestedPercent}%
                </span>
              </div>
              <ProgressBar value={currentEntry.vestedPercent} max={100} />
            </div>

            {currentEntry.withdrawable > 0 && (
              <Button
                onClick={handleWithdraw}
                isLoading={withdrawing}
                disabled={currentEntry.withdrawable <= 0}
              >
                <ArrowDownToLine className="size-3.5" />
                {t("withdrawTranche")}
              </Button>
            )}
          </div>
        )}
      </Card>

      <DividendClaimHistory token={tokenDetail.tokenSymbol} />
    </div>
  );
}
