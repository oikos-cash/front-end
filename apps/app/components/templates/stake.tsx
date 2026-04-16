"use client";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
import PageHeader from "@/components/molecules/page-header";
import StakeFormPanel from "@/components/organism/form/stake";
import StakeHistory from "@/components/organism/stake/history";
import StakeActivePosition from "@/components/organism/stake/active-position";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useStaking } from "@/hooks/use-staking";

// Types
import type { VaultInfo } from "@/types/interfaces";

// Utils
import { formatStakeNumber } from "@/utils/number";

// Icons
import { Lock, Wallet, ServerOff } from "lucide-react";

export default function StakeTemplate({
  initialVault,
}: {
  initialVault: VaultInfo | null;
}) {
  const t = useTranslations("stake");
  const te = useTranslations("error");
  const { isConnected, handleConnect } = useWallet();

  const {
    totalStaked,
    totalRewards,
    stakedBalance,
    sTokenBalance,
    tokenBalance,
    needsApproval,
    isCooldownActive,
    cooldownEnd,
    approve,
    stake,
    unstake,
    isApproving,
    isStaking,
    isUnstaking,
  } = useStaking(
    initialVault?.stakingContract,
    initialVault?.token0,
    initialVault?.sTokenAddress ?? initialVault?.sToken,
  );

  if (!initialVault) {
    return (
      <div className="flex flex-col gap-6 py-4">
        <PageHeader
          title={t("title")}
          description={t("description")}
          breadcrumbs={[{ label: "Home", href: "/" }, { label: t("title") }]}
        />
        <Empty
          className="py-16"
          title={te("noBackend")}
          description={te("noBackendDesc")}
          icon={<ServerOff className="size-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Empty
          title={t("connectTitle")}
          description={t("connectDescription")}
          icon={<Lock className="size-6 text-muted-foreground" />}
        >
          <Button variant="default" size="sm" onClick={handleConnect}>
            <Wallet className="size-3.5" />
            {t("connectButton")}
          </Button>
        </Empty>
      </div>
    );
  }

  const tokenSymbol = initialVault.tokenSymbol;
  const totalStakedNum = totalStaked ? Number(totalStaked) / 1e18 : 0;
  const totalRewardsNum = totalRewards ? Number(totalRewards) / 1e18 : 0;

  return (
    <div className="flex flex-col gap-6 py-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: t("title") }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "token", value: tokenSymbol },
          { key: "totalStaked", value: formatStakeNumber(totalStakedNum, 2) },
          { key: "apr30d", value: "--" },
          {
            key: "totalRewards",
            value: `${formatStakeNumber(totalRewardsNum)} ${tokenSymbol}`,
          },
        ].map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={t(kpi.key)}
            description={t(`${kpi.key}Desc`)}
            value={kpi.value}
          />
        ))}
      </div>

      <StakeActivePosition
        vault={initialVault}
        stakedBalance={stakedBalance}
        sTokenBalance={sTokenBalance}
        cooldownEnd={cooldownEnd}
        isCooldownActive={isCooldownActive}
      />
      <StakeFormPanel vault={initialVault} />
      <StakeHistory />
    </div>
  );
}
