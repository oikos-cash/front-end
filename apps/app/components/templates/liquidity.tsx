"use client";

// Components
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";
import Tooltip from "@/components/atoms/tooltip";
import KpiCard from "@/components/molecules/card/kpi";
import ButtonGroup from "@/components/atoms/button-group";
import PageHeader from "@/components/molecules/page-header";
import LiquidityChart from "@/components/organism/liquidity/chart-panel";
import LiquidityDetails from "@/components/organism/liquidity/details";
import Empty from "@/components/atoms/empty";

// Hooks
import { useTranslations } from "next-intl";
import { useLiquidity } from "@/hooks/use-liquidity";

// Types
import type { VaultInfo } from "@/types/interfaces";

// Icons
import { RefreshCw, ServerOff } from "lucide-react";

// Constants
import { LIQUIDITY_POOLS } from "@/types/constants";

export default function LiquidityTemplate({
  initialVault,
}: {
  initialVault: VaultInfo | null;
}) {
  const { t, data, selectedPool, handlePoolChange, handleRefresh, kpiCards } =
    useLiquidity(initialVault);
  const te = useTranslations("error");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pt-4">
        <PageHeader
          title={t("title")}
          breadcrumbs={[{ label: "Home", href: "/" }, { label: t("title") }]}
        />
        <div className="flex items-center gap-2">
          <Select
            className="w-40"
            value={selectedPool}
            defaultValue="oks"
            onValueChange={handlePoolChange}
            items={LIQUIDITY_POOLS}
            placeholder={t("selectPool")}
          />
          <Tooltip content={t("refresh")}>
            <Button variant="ghost" size="icon-xs" onClick={handleRefresh}>
              <RefreshCw className="size-3.5" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {!data ? (
        <Empty
          className="py-16"
          title={te("noBackend")}
          description={te("noBackendDesc")}
          icon={<ServerOff className="size-6 text-muted-foreground" />}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((kpi) => (
              <KpiCard
                key={kpi.key}
                title={t(kpi.key)}
                value={kpi.value}
                secondary={kpi.secondary}
                actions={
                  kpi.hasActions ? (
                    <ButtonGroup>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={handleRefresh}
                      >
                        {t("shift")}
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={handleRefresh}
                      >
                        {t("slide")}
                      </Button>
                    </ButtonGroup>
                  ) : undefined
                }
              />
            ))}
          </div>
          <LiquidityChart bars={data.bars} spotPrice={data.spotBnb} />
          <LiquidityDetails details={data.details} />
        </>
      )}
    </div>
  );
}
