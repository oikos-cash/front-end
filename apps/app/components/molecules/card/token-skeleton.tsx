// Components
import Card from "@/components/atoms/card";
import Skeleton from "@/components/atoms/skeleton";

// Types
import { TokenCardSkeletonProps } from "@/types/interfaces";

export default function TokenCardSkeleton({
  count = 8,
}: TokenCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card
          key={i}
          header={
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          }
          footer={
            <div className="flex w-full justify-end gap-2">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          }
        >
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}
    </>
  );
}
