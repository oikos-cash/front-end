"use client";

// Components
import Card from "@/components/atoms/card";
import Table from "@/components/atoms/table";
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";
import Skeleton from "@/components/atoms/skeleton";
import ButtonGroup from "@/components/atoms/button-group";

// Hooks
import { useTranslations } from "next-intl";
import { useTradesHistory } from "@/hooks/use-trades-history";

// Types
import { TradesHistoryProps } from "@/types/interfaces";

// Icons
import { ServerOff } from "lucide-react";

export default function TradesHistory({ token = "OKS", poolAddress }: TradesHistoryProps) {
  const te = useTranslations("error");
  const {
    t,
    view,
    columns,
    isLoading,
    tokenFilter,
    tokenOptions,
    filteredTrades,
    setTokenFilter,
    handleViewChange,
    handleClearHistory,
  } = useTradesHistory(token, poolAddress);

  return (
    <Card
      header={
        <div className="flex w-full items-center gap-2">
          <ButtonGroup>
            <Button
              type="button"
              variant={view === "global" ? "default" : "outline"}
              onClick={() => handleViewChange("global")}
            >
              {t("global")}
            </Button>
            <Button
              type="button"
              variant={view === "myTrades" ? "default" : "outline"}
              onClick={() => handleViewChange("myTrades")}
            >
              {t("myTrades")}
            </Button>
          </ButtonGroup>
          <Select
            className="w-28"
            value={tokenFilter}
            defaultValue="all"
            onValueChange={setTokenFilter}
            items={tokenOptions}
          />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            disabled={filteredTrades.length === 0}
            onClick={handleClearHistory}
          >
            {t("clearHistory")}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filteredTrades.length > 0 ? (
        <Table columns={columns} data={filteredTrades} />
      ) : (
        <Empty
          className="py-12"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}
    </Card>
  );
}
