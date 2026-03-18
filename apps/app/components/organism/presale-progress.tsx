"use client";

import { useState, useEffect } from "react";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
import ProgressBar from "@/components/atoms/progress-bar";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { PresaleProgressProps } from "@/types/interfaces";

// Constants
import { PRESALE_STATUS_VARIANT } from "@/types/constants";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0d 0h 0m 0s";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function PresaleProgress({
  raised,
  hardCap,
  softCap,
  softCapReached,
  contributors,
  endsAt,
  status,
}: PresaleProgressProps) {
  const t = useTranslations("presale");
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    if (status !== "active") return;
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, endsAt - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt, status]);

  const statusLabel = t(status);
  const variant = PRESALE_STATUS_VARIANT[status] as "default" | "secondary" | "outline";

  return (
    <Card title={t("progressTitle")} description={t("progressDesc")}>
      <div className="flex flex-col gap-4">
        <ProgressBar value={raised} max={hardCap} />

        {softCapReached && (
          <span className="text-xs font-medium text-success">
            {t("softCapReached")}
          </span>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("raised")}</span>
            <span className="font-medium">{raised.toFixed(4)} / {hardCap.toFixed(2)} BNB</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("contributors")}</span>
            <span className="font-medium">{contributors}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("timeLeft")}</span>
            <span className="font-medium font-mono">{formatCountdown(timeLeft)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={variant} className="px-1.5 py-0 text-[10px]">
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
