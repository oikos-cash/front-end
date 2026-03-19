"use client";

import { useState } from "react";

// Icons
import { ShieldCheck } from "lucide-react";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { PresaleAdminControlsProps } from "@/types/interfaces";

export default function PresaleAdminControls({
  status,
  isDeployer,
  softCapReached,
}: PresaleAdminControlsProps) {
  const t = useTranslations("presale");
  const [isFinalizing, setIsFinalizing] = useState(false);

  if (!isDeployer || status === "finalized") return null;

  const hasExpired = status === "ended";
  const canFinalize = softCapReached || hasExpired;

  async function handleFinalize() {
    setIsFinalizing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsFinalizing(false);
    console.log("Presale finalized");
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          {t("adminTitle")}
        </div>
      }
      description={t("adminDescription")}
    >
      <div className="flex flex-col gap-3">
        {softCapReached && (
          <Badge variant="default" className="w-fit">
            {t("adminSoftCapReached")}
          </Badge>
        )}
        {!softCapReached && hasExpired && (
          <Badge variant="destructive" className="w-fit">
            {t("adminSoftCapNotReached")}
          </Badge>
        )}
        {!canFinalize && (
          <p className="text-sm text-muted-foreground">
            {t("adminWaitingDesc")}
          </p>
        )}

        <Button
          onClick={handleFinalize}
          disabled={!canFinalize || isFinalizing}
          isLoading={isFinalizing}
          variant={softCapReached ? "default" : "secondary"}
        >
          {t("adminFinalizeButton")}
        </Button>
      </div>
    </Card>
  );
}
