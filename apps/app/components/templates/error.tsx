"use client";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";

// Hooks
import { useEffect } from "react";
import { useTranslations } from "next-intl";

// Icons
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorTemplate({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center py-20 **:data-[slot=empty-title]:text-7xl **:data-[slot=empty-description]:text-lg **:data-[slot=empty-icon]:scale-150">
      <Empty
        title={t("title")}
        description={t("description")}
        icon={<AlertTriangle className="size-6 text-destructive" />}
      >
        <Button variant="default" size="sm" onClick={unstable_retry}>
          <RefreshCw className="size-3.5" />
          {t("retry")}
        </Button>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("errorId", { id: error.digest })}
          </p>
        )}
      </Empty>
    </div>
  );
}
