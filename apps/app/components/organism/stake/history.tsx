"use client";

// Components
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { StakeHistoryProps } from "@/types/interfaces";

export default function StakeHistory({ token = "OKS" }: StakeHistoryProps) {
  const t = useTranslations("stake");

  return (
    <Card title={t("historyTitle")} description={t("historyDescription")}>
      <Empty
        className="py-12"
        title={t("historyPending")}
        description={t("historyPendingDesc")}
      />
    </Card>
  );
}
