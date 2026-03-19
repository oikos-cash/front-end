"use client";

// Components
import Card from "@/components/atoms/card";
import Button from "@/components/atoms/button";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Types
import { presaleContributionSchema } from "@/types/schemes";
import type {
  PresaleContributionFormValues,
  PresaleContributionFormProps,
} from "@/types/interfaces";

// Utils
import { formatCompactNumber } from "@/utils/number";

// Constants
import { PRESALE_CONTRIBUTION_FIELDS } from "@/types/constants";

export default function PresaleContributionForm({
  price,
  status,
  userBalance,
  minContribution,
  maxContribution,
}: PresaleContributionFormProps) {
  const t = useTranslations("presale");
  const isDisabled = status !== "active";

  const form = useForm<PresaleContributionFormValues>({
    resolver: zodResolver(presaleContributionSchema),
    defaultValues: { amount: "" },
    mode: "onChange",
  });

  const amountValue = form.watch("amount");
  const numericAmount = parseFloat(amountValue) || 0;
  const tokensToReceive =
    numericAmount > 0 && price > 0 ? numericAmount / price : 0;

  function handleUseMax() {
    const max = Math.min(userBalance, maxContribution);
    form.setValue("amount", max.toString(), { shouldValidate: true });
  }

  async function onSubmit(data: PresaleContributionFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    form.reset();
    console.log("Contributed:", data.amount, "BNB");
  }

  return (
    <Card
      title={t("contributeTitle")}
      description={t("contributeDesc")}
      footer={
        <div className="flex w-full justify-end">
          <Button
            type="submit"
            disabled={!form.formState.isValid || isDisabled}
            isLoading={form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            {t("contributeAction")}
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
          fields={PRESALE_CONTRIBUTION_FIELDS.map((field) => ({
            ...field,
            placeholder: t("amountPlaceholder"),
            label: t("amount"),
            ariaLabel: t("amount"),
            disabled: isDisabled,
            description: (
              <button
                type="button"
                onClick={handleUseMax}
                className="text-xs text-primary hover:underline"
              >
                {t("useMax", { amount: userBalance.toFixed(4) })}
              </button>
            ),
          }))}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("youllReceive")}</span>
            <span className="font-medium">
              {formatCompactNumber(tokensToReceive)} tokens
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("minContrib")}</span>
            <span className="font-medium">{minContribution} BNB</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("maxContrib")}</span>
            <span className="font-medium">{maxContribution} BNB</span>
          </div>
        </div>
      </form>
    </Card>
  );
}
