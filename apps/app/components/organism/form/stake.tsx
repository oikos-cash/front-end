"use client";

// Components
import Card from "@/components/atoms/card";
import Button from "@/components/atoms/button";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useStakeForm } from "@/hooks/use-stake-form";

// Types
import type { StakeFormPanelProps } from "@/types/interfaces";

// Utils
import { formatStakeNumber } from "@/utils/number";

export default function StakeFormPanel({ vault }: StakeFormPanelProps) {
  const {
    t,
    form,
    isConnected,
    stakeData,
    numericAmount,
    cooldownActive,
    cooldownLabel,
    fields,
    onSubmit,
    handleUnstake,
  } = useStakeForm(vault);

  if (!isConnected) return null;

  return (
    <Card
      header={
        <div className="flex w-full justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              {t("youllReceive")}
            </span>
            <span className="text-lg font-medium">
              {numericAmount > 0 ? formatStakeNumber(numericAmount) : "0.00"}{" "}
              {stakeData.sTokenSymbol}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              {t("currentApr")}
            </span>
            <span className="text-lg font-medium text-primary">
              {stakeData.apr30d.toFixed(2)}%
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex w-full justify-end gap-3">
          {stakeData.userStaked > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleUnstake}
              disabled={cooldownActive || stakeData.userStaked <= 0}
            >
              {cooldownActive
                ? `${t("unstakeAll")} (${cooldownLabel})`
                : t("unstakeAll")}
            </Button>
          )}

          <Button
            type="submit"
            disabled={!form.formState.isValid}
            isLoading={form.formState.isSubmitting}
          >
            {t("stakeAction")}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FieldRenderer t={t} control={form.control} fields={fields} />
      </form>
    </Card>
  );
}
