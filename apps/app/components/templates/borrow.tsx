"use client";

import { useMemo } from "react";

// Components
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/kpi-card";
import PageHeader from "@/components/molecules/page-header";
import LoanHistory from "@/components/organism/loan-history";
import BorrowFormPanel from "@/components/organism/borrow-form-panel";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Utils
import { generateMockBorrowData } from "@/utils/number";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function BorrowTemplate() {
  const t = useTranslations("borrow");
  const { isConnected, handleConnect } = useWallet();
  const borrowData = useMemo(() => generateMockBorrowData("OKS"), []);

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

  return (
    <div className="flex flex-col gap-6 py-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: t("title") },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t("tokenPair")}
          value={borrowData.tokenPair}
          description={t("tokenPairDesc")}
        />
        <KpiCard
          title={t("imv")}
          description={t("imvDesc")}
          value={`${(borrowData.imv * 100).toFixed(2)}%`}
        />
        <KpiCard
          title={t("dailyInterest")}
          description={t("dailyInterestDesc")}
          value={`${(borrowData.dailyInterest * 100).toFixed(2)}%`}
        />
        <KpiCard
          title={t("protocolStatus")}
          description={t("protocolStatusDesc")}
          value={borrowData.protocolStatus === "active" ? "Active" : "Paused"}
        />
      </div>

      <BorrowFormPanel />
      <LoanHistory />
    </div>
  );
}
