"use client";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
import PageHeader from "@/components/molecules/page-header";
import LoanHistory from "@/components/organism/loan/history";
import BorrowFormPanel from "@/components/organism/form/borrow";
import LoanActivePosition from "@/components/organism/loan/active-position";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Types
import type { VaultInfo } from "@/types/interfaces";

// Icons
import { Lock, Wallet, ServerOff } from "lucide-react";

export default function BorrowTemplate({
  initialVault,
}: {
  initialVault: VaultInfo | null;
}) {
  const t = useTranslations("borrow");
  const te = useTranslations("error");
  const { isConnected, handleConnect } = useWallet();

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
      <div className="flex flex-col gap-6 py-4">
        <PageHeader
          title={t("title")}
          description={t("description")}
          breadcrumbs={[{ label: "Home", href: "/" }, { label: t("title") }]}
        />
        <Empty
          className="py-16"
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

  const liquidityRatio = parseFloat(initialVault.liquidityRatio || "0");
  const isActive = liquidityRatio > 0;

  const kpis = [
    {
      key: "tokenPair",
      value: `${initialVault.tokenSymbol}/WBNB`,
    },
    {
      key: "imv",
      value: `${(liquidityRatio * 100).toFixed(2)}%`,
    },
    {
      key: "dailyInterest",
      value: `${(parseFloat(initialVault.totalInterest || "0") * 100).toFixed(2)}%`,
    },
    {
      key: "protocolStatus",
      value: isActive ? "Active" : "Paused",
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: t("title") }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={t(kpi.key)}
            value={kpi.value}
            description={t(`${kpi.key}Desc`)}
          />
        ))}
      </div>
      <BorrowFormPanel vault={initialVault} />
      <LoanActivePosition vault={initialVault} />
      <LoanHistory vaultAddress={initialVault.address} />
    </div>
  );
}
