"use client";

import { useState } from "react";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
import TokenPair from "@/components/molecules/token-pair";
import PageHeader from "@/components/molecules/page-header";
import LoanHistory from "@/components/organism/loan/history";
import BorrowFormPanel from "@/components/organism/form/borrow";
import LoanActivePosition from "@/components/organism/loan/active-position";
import HedgeModal from "@/components/organism/hedge-modal";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useBnbPrice } from "@/hooks/use-bnb-price";

// Types
import type { VaultInfo } from "@/types/interfaces";

// Icons
import { Lock, Wallet, ServerOff, Shield } from "lucide-react";

export default function BorrowTemplate({
  initialVault,
}: {
  initialVault: VaultInfo | null;
}) {
  const t = useTranslations("borrow");
  const te = useTranslations("error");
  const { isConnected, address, handleConnect } = useWallet();
  const { bnbPrice } = useBnbPrice();
  const [hedgeOpen, setHedgeOpen] = useState(false);

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
  // IMV = spotPriceX96 (wei) converted to BNB price × liquidityRatio percentage
  const spotPriceBnb = parseFloat(initialVault.spotPriceX96 || "0") / 1e18;
  const imvValue = spotPriceBnb * (liquidityRatio > 0 ? liquidityRatio * 0.44 : 0);

  const kpis: Array<{
    key: string;
    value: string;
    icon?: React.ReactNode;
  }> = [
    {
      key: "tokenPair",
      value: `${initialVault.tokenSymbol}/WBNB`,
      icon: (
        <TokenPair
          base={initialVault.tokenSymbol}
          quote="WBNB"
          size="default"
        />
      ),
    },
    {
      key: "imv",
      value: imvValue > 0 ? imvValue.toFixed(6) : "0",
    },
    {
      key: "dailyInterest",
      value: "0.027%",
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
            icon={kpi.icon}
            description={t(`${kpi.key}Desc`)}
          />
        ))}
      </div>
      <BorrowFormPanel vault={initialVault} />
      <LoanActivePosition vault={initialVault} />

      <div className="flex justify-end">
        {/* Hedge flow is not yet ready for users — kept around for the next
          * iteration. Re-enable by removing `disabled` and the disabled tooltip. */}
        <Button
          variant="outline"
          size="sm"
          disabled
          title="Hedging is coming soon"
          onClick={() => setHedgeOpen(true)}
        >
          <Shield className="size-3.5" />
          {t("hedgeButton") ?? "Hedge Loan"}
        </Button>
      </div>

      <LoanHistory vaultAddress={initialVault.address} />

      <HedgeModal
        open={hedgeOpen}
        onOpenChange={setHedgeOpen}
        vaultAddress={initialVault.address}
        userAddress={address}
        loanAmountBNB={0}
        loanDurationDays={30}
        bnbPrice={bnbPrice}
      />
    </div>
  );
}
