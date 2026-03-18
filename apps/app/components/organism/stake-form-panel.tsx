"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import Card from "@/components/atoms/card";
import Button from "@/components/atoms/button";
import Avatar from "@/components/atoms/avatar";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Types
import { stakeSchema } from "@/types/schemes";
import type { StakeFormValues, StakeFormPanelProps } from "@/types/interfaces";

// Utils
import { generateMockStakeData, formatStakeNumber } from "@/utils/number";

export default function StakeFormPanel({ token = "OKS" }: StakeFormPanelProps) {
  const t = useTranslations("stake");
  const { isConnected } = useWallet();

  const stakeData = useMemo(() => generateMockStakeData(token), [token]);

  const form = useForm<StakeFormValues>({
    resolver: zodResolver(stakeSchema),
    defaultValues: { amount: "" },
    mode: "onChange",
  });

  const amountValue = form.watch("amount");
  const numericAmount = parseFloat(amountValue) || 0;

  const cooldownActive = useMemo(() => {
    if (!stakeData.cooldownEndsAt) return false;
    return stakeData.cooldownEndsAt > Date.now();
  }, [stakeData.cooldownEndsAt]);

  const cooldownLabel = useMemo(() => {
    if (!stakeData.cooldownEndsAt || !cooldownActive) return "";
    const diff = stakeData.cooldownEndsAt - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  }, [stakeData.cooldownEndsAt, cooldownActive]);

  function handleUseMax() {
    form.setValue("amount", stakeData.userBalance.toString(), {
      shouldValidate: true,
    });
  }

  async function onSubmit(data: StakeFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    form.reset();
    console.log("Staked:", data.amount, token);
  }

  function handleUnstake() {
    if (cooldownActive || stakeData.userStaked <= 0) return;
    console.log("Unstaking all for:", token);
  }

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
        <FieldRenderer
          t={t}
          control={form.control}
          fields={[
            {
              min: 0,
              step: "any",
              type: "number",
              name: "amount",
              placeholder: "0.00",
              label: t("amountToStake"),
              ariaLabel: t("amountToStake"),
              endContent: <Avatar name={stakeData.tokenSymbol} size="default" />,
              description: (
                <button
                  type="button"
                  onClick={handleUseMax}
                  className="text-xs text-primary hover:underline"
                >
                  {t("useMax", {
                    amount: formatStakeNumber(stakeData.userBalance),
                    token: stakeData.tokenSymbol,
                  })}
                </button>
              ),
            },
          ]}
        />
      </form>
    </Card>
  );
}
