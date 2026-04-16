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
import { formatCooldown } from "@/utils/date";
import { formatStakeNumber } from "@/utils/number";

export default function StakeActivePosition({
  vault,
  stakedBalance,
  sTokenBalance,
  cooldownEnd,
  isCooldownActive: cooldownActive,
}: StakeActivePositionProps) {
  const t = useTranslations("stake");
  const { isConnected } = useWallet();

  const token = vault?.tokenSymbol ?? "TOKEN";
  const userStaked = stakedBalance ? Number(stakedBalance) / 1e18 : 0;
  const userSTokenBalance = sTokenBalance ? Number(sTokenBalance) / 1e18 : 0;

  const cooldownLabel = useMemo(
    () =>
      cooldownActive
        ? formatCooldown(cooldownEnd)
        : t("positionCooldownReady"),
    [cooldownEnd, cooldownActive, t],
  );

  if (!isConnected || userStaked <= 0) return null;

  const rows = [
    {
      label: t("positionStaked"),
      value: `${formatStakeNumber(userStaked)} ${token}`,
    },
    {
      label: t("positionSToken"),
      value: `${formatStakeNumber(userSTokenBalance)} s${token}`,
    },
  ];

  return (
    <Card title={t("positionTitle")} description={t("positionDescription")}>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm font-medium">{row.value}</span>
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
