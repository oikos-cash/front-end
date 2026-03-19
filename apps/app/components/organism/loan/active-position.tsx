"use client";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import FieldRenderer from "@/components/molecules/field-renderer";
import KeyValueCard from "@/components/molecules/card/key-value";

// Hooks
import { useLoanPosition } from "@/hooks/use-loan-position";

// Types
import type { LoanActivePositionProps } from "@/types/interfaces";

// Icons
import { FileX } from "lucide-react";

export default function LoanActivePosition({
  token = "OKS",
}: LoanActivePositionProps) {
  const {
    t,
    loanData,
    infoRows,
    tabForms,
    activeTab,
    setActiveTab,
    isConnected,
  } = useLoanPosition(token);

  if (!isConnected) return null;

  if (!loanData.hasActiveLoan) {
    return (
      <Card title={t("positionTitle")} description={t("positionDescription")}>
        <Empty
          title={t("noActiveLoan")}
          description={t("noActiveLoanDesc")}
          icon={<FileX className="size-6 text-muted-foreground" />}
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          {t("positionTitle")}
          {loanData.isSelfRepaying && (
            <Badge variant="default">{t("positionSelfRepaying")}</Badge>
          )}
        </div>
      }
      description={t("positionDescription")}
    >
      <div className="flex flex-col gap-5">
        <KeyValueCard rows={infoRows} />
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("positionActions")}
          </span>

          <ButtonGroup>
            {tabForms.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                variant={activeTab === tab.key ? "default" : "outline"}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </ButtonGroup>

          {tabForms.map(
            (tab) =>
              activeTab === tab.key && (
                <form
                  key={tab.key}
                  onSubmit={tab.form.handleSubmit(tab.onSubmit)}
                  className="flex flex-col gap-4"
                >
                  <FieldRenderer
                    t={t}
                    control={tab.form.control}
                    fields={tab.fields}
                  />

                  {tab.showSummary && <KeyValueCard rows={tab.summaryRows} />}

                  <Button
                    type="submit"
                    disabled={!tab.form.formState.isValid || loanData.isExpired}
                    isLoading={tab.form.formState.isSubmitting}
                  >
                    {tab.actionLabel}
                  </Button>
                </form>
              ),
          )}
        </div>
      </div>
    </Card>
  );
}
