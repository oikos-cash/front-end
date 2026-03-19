"use client";

// Components
import Card from "@/components/atoms/card";
import Table from "@/components/atoms/table";
import Empty from "@/components/atoms/empty";
import Skeleton from "@/components/atoms/skeleton";

// Hooks
import { useStakeHistory } from "@/hooks/use-stake-history";

// Types
import type { StakeHistoryProps } from "@/types/interfaces";

// Icons
import { Loader2 } from "lucide-react";

export default function StakeHistory({ token = "OKS" }: StakeHistoryProps) {
  const { t, items, isLoading, sentinelRef, columns } = useStakeHistory(token);

  return (
    <Card title={t("historyTitle")} description={t("historyDescription")}>
      {items.length > 0 ? (
        <div>
          <Table columns={columns} data={items} />
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
