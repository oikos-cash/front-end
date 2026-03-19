"use client";

import { useMemo } from "react";

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
        breadcrumbs={[{ label: "Home", href: "/" }, { label: t("title") }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "tokenPair", value: borrowData.tokenPair },
          { key: "imv", value: `${(borrowData.imv * 100).toFixed(2)}%` },
          { key: "dailyInterest", value: `${(borrowData.dailyInterest * 100).toFixed(2)}%` },
          { key: "protocolStatus", value: borrowData.protocolStatus === "active" ? "Active" : "Paused" },
        ].map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={t(kpi.key)}
            value={kpi.value}
            description={t(`${kpi.key}Desc`)}
          />
        ))}
      </div>
      <BorrowFormPanel />
      <LoanActivePosition />
      <LoanHistory />
    </div>
  );
}
