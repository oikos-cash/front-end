"use client";

// Components
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import KpiCard from "@/components/molecules/card/kpi";
import PageHeader from "@/components/molecules/page-header";
import AvatarInfo from "@/components/molecules/avatar-info";
import PresaleProgress from "@/components/organism/presale/progress";
import PresaleAdminControls from "@/components/organism/presale/admin-controls";
import PresaleContributionForm from "@/components/organism/form/presale-contribution";

// Hooks
import { usePresale } from "@/hooks/use-presale";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function PresaleTemplate({
  initialVault,
}: {
  initialVault: import("@/types/interfaces").VaultInfo | null;
}) {
  const {
    t,
    kpiCards,
    isConnected,
    presaleData,
    userBalance,
    handleConnect,
    contributionRows,
  } = usePresale(initialVault);

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
        {kpiCards.map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={t(kpi.key)}
            description={t(`${kpi.key}Desc`)}
            value={kpi.value}
          />
        ))}
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

      <PresaleAdminControls
        status={presaleData.status}
        softCapReached={presaleData.softCapReached}
        isDeployer={presaleData.isDeployer}
      />

      <Card title={t("myContribTitle")} description={t("myContribDesc")}>
        {contributionRows.length > 0 ? (
          <div className="flex flex-col gap-3">
            {contributionRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{t(row.key)}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
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
