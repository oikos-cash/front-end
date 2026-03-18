"use client";

import { useMemo } from "react";

// Components
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import AvatarInfo from "@/components/molecules/avatar-info";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/kpi-card";
import PageHeader from "@/components/molecules/page-header";
import PresaleProgress from "@/components/organism/presale-progress";
import PresaleContributionForm from "@/components/organism/presale-contribution-form";

// Hooks
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useWallet } from "@/stores/wallet";

// Utils
import { generateMockPresaleData, formatCompactNumber } from "@/utils/number";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function PresaleTemplate() {
  const t = useTranslations("presale");
  const { isConnected, handleConnect, balances } = useWallet();
  const params = useParams();
  const token = (params.token as string) ?? "OKS";

  const presaleData = useMemo(
    () => generateMockPresaleData(token.toUpperCase()),
    [token],
  );

  const userBalance = useMemo(() => {
    const bnb = balances.find((b) => b.token === "BNB");
    return bnb ? parseFloat(bnb.amount) : 0;
  }, [balances]);

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
          { label: "Markets", href: "/markets" },
          { label: presaleData.tokenSymbol },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t("token")}
          description={t("tokenDesc")}
          value={presaleData.tokenSymbol}
        />
        <KpiCard
          title={t("price")}
          description={t("priceDesc")}
          value={`${presaleData.price.toFixed(6)} BNB`}
        />
        <KpiCard
          title={t("hardCap")}
          description={t("hardCapDesc")}
          value={`${presaleData.hardCap.toFixed(2)} BNB`}
        />
        <KpiCard
          title={t("softCap")}
          description={t("softCapDesc")}
          value={`${presaleData.softCap.toFixed(2)} BNB`}
        />
      </div>

      <Card title={t("tokenInfo")} description={t("tokenInfoDesc")}>
        <AvatarInfo
          title={presaleData.tokenName}
          subtitle={presaleData.tokenSymbol}
          src={presaleData.tokenLogoUrl || undefined}
          size="lg"
        />
        <p className="text-sm text-muted-foreground">
          {presaleData.tokenDescription}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PresaleProgress
          endsAt={presaleData.endsAt}
          raised={presaleData.raised}
          status={presaleData.status}
          hardCap={presaleData.hardCap}
          softCap={presaleData.softCap}
          contributors={presaleData.contributors}
          softCapReached={presaleData.softCapReached}
        />

        <PresaleContributionForm
          price={presaleData.price}
          userBalance={userBalance}
          status={presaleData.status}
          minContribution={presaleData.minContribution}
          maxContribution={presaleData.maxContribution}
        />
      </div>

      <Card title={t("myContribTitle")} description={t("myContribDesc")}>
        {presaleData.userContribution > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("contributed")}</span>
              <span className="font-medium">
                {presaleData.userContribution.toFixed(4)} BNB
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("tokensToReceive")}
              </span>
              <span className="font-medium">
                {formatCompactNumber(presaleData.userTokens)}{" "}
                {presaleData.tokenSymbol}
              </span>
            </div>
            {presaleData.status === "ended" && !presaleData.softCapReached && (
              <div className="flex justify-end pt-2">
                <Button variant="destructive" size="sm">
                  {t("claimRefund")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noContribution")}</p>
        )}
      </Card>
    </div>
  );
}
