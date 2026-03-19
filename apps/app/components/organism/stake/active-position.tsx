"use client";

import { useMemo } from "react";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Types
import type { StakeActivePositionProps } from "@/types/interfaces";

// Utils
import { isCooldownActive, formatCooldown } from "@/utils/date";
import { generateMockStakeData, formatStakeNumber } from "@/utils/number";

export default function StakeActivePosition({
  token = "OKS",
}: StakeActivePositionProps) {
  const t = useTranslations("stake");
  const { isConnected } = useWallet();

  const stakeData = useMemo(() => generateMockStakeData(token), [token]);
  const cooldownActive = useMemo(
    () => isCooldownActive(stakeData.cooldownEndsAt),
    [stakeData.cooldownEndsAt],
  );

  const cooldownLabel = useMemo(
    () =>
      cooldownActive
        ? formatCooldown(stakeData.cooldownEndsAt)
        : t("positionCooldownReady"),
    [stakeData.cooldownEndsAt, cooldownActive, t],
  );

  if (!isConnected || stakeData.userStaked <= 0) return null;

  const rows = [
    {
      label: t("positionStaked"),
      value: `${formatStakeNumber(stakeData.userStaked)} ${stakeData.tokenSymbol}`,
    },
    {
      label: t("positionSToken"),
      value: `${formatStakeNumber(stakeData.userSTokenBalance)} ${stakeData.sTokenSymbol}`,
    },
    {
      label: t("positionRewards"),
      value: `${formatStakeNumber(stakeData.userRewards)} ${stakeData.tokenSymbol}`,
      highlight: true,
    },
  ];

  return (
    <Card title={t("positionTitle")} description={t("positionDescription")}>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span
              className={`text-sm font-medium ${row.highlight ? "text-primary" : ""}`}
            >
              {row.value}
            </span>
          </div>
        ))}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">
            {t("positionCooldown")}
          </span>
          <Badge variant={cooldownActive ? "destructive" : "default"}>
            {cooldownLabel}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
