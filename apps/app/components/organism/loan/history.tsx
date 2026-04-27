"use client";

// Components
import Card from "@/components/atoms/card";
import Table from "@/components/atoms/table";
import Select from "@/components/atoms/select";
import Empty from "@/components/atoms/empty";
import Skeleton from "@/components/atoms/skeleton";

// Hooks
import { useLoanHistory } from "@/hooks/use-loan-history";

// Types
import type { LoanHistoryProps } from "@/types/interfaces";

// Icons
import { Loader2 } from "lucide-react";

export default function LoanHistory({ vaultAddress }: LoanHistoryProps) {
  const {
    t,
    isLoading,
    filter,
    setFilter,
    sentinelRef,
    columns,
    filteredItems,
    filterOptions,
  } = useLoanHistory(vaultAddress);

  return (
    <Card
      title={t("historyTitle")}
      description={t("historyDescription")}
      action={
        <Select
          className="w-32"
          value={filter}
          defaultValue="all"
          onValueChange={setFilter}
          items={filterOptions}
        />
      }
    >
      {filteredItems.length > 0 ? (
        <div>
          <Table columns={columns} data={filteredItems} />
          <div ref={sentinelRef} className="h-1" />
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      ) : (
        <Empty
          className="py-12"
          title={t("historyEmpty")}
          description={t("historyEmptyDesc")}
        />
      )}
    </Card>
  );
}
