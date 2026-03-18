"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import Card from "@/components/atoms/card";
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";
import Input from "@/components/atoms/input";
import Field from "@/components/atoms/field";
import TradeInfo from "@/components/molecules/trade-info";

// Hooks
import { useTranslations } from "next-intl";

// Types
import { swapSchema } from "@/types/schemes";
import type { SwapFormValues } from "@/types/interfaces";

// Constants
import { SWAP_TOKENS } from "@/types/constants";

// Utils
import {
  generateMockSwapTokens,
  calculateSwapOutput,
  formatCompactNumber,
} from "@/utils/number";


export default function SwapForm() {
  const t = useTranslations("swap");

  const tokens = useMemo(() => generateMockSwapTokens(), []);

  const form = useForm<SwapFormValues>({
    resolver: zodResolver(swapSchema),
    defaultValues: { fromToken: "", toToken: "", fromAmount: "" },
    mode: "onChange",
  });

  const fromToken = form.watch("fromToken");
  const toToken = form.watch("toToken");
  const fromAmount = parseFloat(form.watch("fromAmount")) || 0;

  const fromTokenData = useMemo(
    () => tokens.find((tk) => tk.symbol === fromToken),
    [tokens, fromToken],
  );

  const toTokenData = useMemo(
    () => tokens.find((tk) => tk.symbol === toToken),
    [tokens, toToken],
  );

  const estimatedOutput = useMemo(() => {
    if (!fromTokenData || !toTokenData || fromAmount <= 0) return 0;
    return calculateSwapOutput(fromAmount, fromTokenData.price, toTokenData.price);
  }, [fromAmount, fromTokenData, toTokenData]);

  const exchangeRate = useMemo(() => {
    if (!fromTokenData || !toTokenData) return "";
    const rate = fromTokenData.price / toTokenData.price;
    return `1 ${fromToken} = ${formatCompactNumber(rate)} ${toToken}`;
  }, [fromToken, toToken, fromTokenData, toTokenData]);

  const priceImpact = useMemo(() => {
    if (fromAmount <= 0 || !fromTokenData) return 0;
    return Math.min(fromAmount * 0.001, 5);
  }, [fromAmount, fromTokenData]);

  const minReceived = useMemo(() => {
    return estimatedOutput * (1 - 0.005);
  }, [estimatedOutput]);

  function handleUseMax() {
    if (!fromTokenData) return;
    form.setValue("fromAmount", fromTokenData.balance.toString(), {
      shouldValidate: true,
    });
  }

  async function onSubmit() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    form.reset();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col items-stretch gap-3 lg:flex-row">
        {/* From */}
        <Card title={t("from")} className="w-full flex-1">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Field name="fromToken" control={form.control} label={t("selectToken")} t={t}>
                {(field) => (
                  <Select
                    value={field.value}
                    placeholder={t("selectToken")}
                    items={SWAP_TOKENS.filter((tk) => tk.value !== toToken)}
                    onValueChange={field.onChange}
                  />
                )}
              </Field>
            </div>
            <div className="flex-1">
              <Field
                name="fromAmount"
                control={form.control}
                label={t("amount")}
                t={t}
                description={
                  fromTokenData ? (
                    <button
                      type="button"
                      onClick={handleUseMax}
                      className="text-xs text-primary hover:underline"
                    >
                      {t("useMax", { amount: formatCompactNumber(fromTokenData.balance) })}
                    </button>
                  ) : undefined
                }
              >
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                  />
                )}
              </Field>
            </div>
          </div>
        </Card>

        {/* To */}
        <Card title={t("to")} className="w-full flex-1">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Field name="toToken" control={form.control} label={t("selectToken")} t={t}>
                {(field) => (
                  <Select
                    value={field.value}
                    placeholder={t("selectToken")}
                    items={SWAP_TOKENS.filter((tk) => tk.value !== fromToken)}
                    onValueChange={field.onChange}
                  />
                )}
              </Field>
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t("estimatedOutput")}</span>
                <span className="text-lg font-semibold">
                  {estimatedOutput > 0
                    ? `${formatCompactNumber(estimatedOutput)} ${toToken}`
                    : "0.00"}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Info */}
      {fromToken && toToken && (
        <TradeInfo
          rows={[
            { label: t("exchangeRate"), value: exchangeRate },
            {
              label: t("priceImpact"),
              value: `${priceImpact.toFixed(2)}%`,
              variant: priceImpact > 1 ? "destructive" : "success",
            },
            {
              label: t("minReceived"),
              value: minReceived > 0 ? `${formatCompactNumber(minReceived)} ${toToken}` : "—",
            },
          ]}
        />
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!form.formState.isValid}
        isLoading={form.formState.isSubmitting}
      >
        {t("swapAction")}
      </Button>
    </form>
  );
}
