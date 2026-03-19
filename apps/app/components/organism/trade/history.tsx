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
import { useTradesHistory } from "@/hooks/use-trades-history";

// Types
import { TradesHistoryProps } from "@/types/interfaces";

// Icons
import { Loader2 } from "lucide-react";

export default function TradesHistory({ token = "OKS" }: TradesHistoryProps) {
  const {
    t,
    view,
    trades,
    columns,
    isLoading,
    tokenFilter,
    sentinelRef,
    tokenOptions,
    filteredTrades,
    setTokenFilter,
    handleViewChange,
    handleClearHistory,
  } = useTradesHistory(token);

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
            disabled={isLoading && trades.length === 0}
            onClick={handleClearHistory}
          >
            {t("clearHistory")}
          </Button>
        </div>
      }
    >
      {filteredTrades.length > 0 ? (
        <div>
          <Table columns={columns} data={filteredTrades} />
          <div ref={sentinelRef} className="h-1" />
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="overflow-hidden rounded-md border">
          <div className="relative w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b">
                  <th className="h-10 px-2 text-left align-middle">
                    <Skeleton className="h-3 w-10" />
                  </th>
                  <th className="h-10 px-2 text-left align-middle">
                    <Skeleton className="h-3 w-14" />
                  </th>
                  <th className="h-10 px-2 text-left align-middle">
                    <Skeleton className="h-3 w-12" />
                  </th>
                  <th className="h-10 px-2 text-left align-middle">
                    <Skeleton className="h-3 w-14" />
                  </th>
                  <th className="h-10 px-2 text-left align-middle">
                    <Skeleton className="h-3 w-10" />
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 align-middle">
                      <Skeleton className="h-5 w-10 rounded-full" />
                    </td>
                    <td className="p-2 align-middle">
                      <Skeleton className="h-3 w-44" />
                    </td>
                    <td className="p-2 align-middle">
                      <Skeleton className="h-3 w-40" />
                    </td>
                    <td className="p-2 align-middle">
                      <Skeleton className="h-3 w-24" />
                    </td>
                    <td className="p-2 align-middle">
                      <Skeleton className="h-3 w-14" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
