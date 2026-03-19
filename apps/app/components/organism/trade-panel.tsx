"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import TradeInfo from "@/components/molecules/trade-info";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Types
import type { TradeSide, SlippageOption, TradeFormValues, FieldItem } from "@/types/interfaces";
import { tradeSchema } from "@/types/schemes";

// Utils
import {
  getMockNetworkFee,
  formatCompactNumber,
  calculatePriceImpact,
  calculateMinReceived,
  calculateReceivingAmount,
} from "@/utils/number";

// Icons
import { Lock, Wallet, Settings } from "lucide-react";

// Constants
import { SLIPPAGE_OPTIONS } from "@/types/constants";

export default function TradePanel() {
  const t = useTranslations("trade");
  const { isConnected, balances, handleConnect } = useWallet();

  const [side, setSide] = useState<TradeSide>("buy");
  const [slippage, setSlippage] = useState<SlippageOption>("0.5");

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      amount: "",
      customSlippage: "",
      useWbnb: false,
      approveMax: false,
    },
    mode: "onChange",
  });

  const amount = form.watch("amount");
  const customSlippage = form.watch("customSlippage");
  const numericAmount = parseFloat(amount) || 0;
  const slippagePct =
    slippage === "custom"
      ? parseFloat(customSlippage) || 0
      : parseFloat(slippage);

  const receiving = useMemo(
    () => calculateReceivingAmount(numericAmount, side),
    [numericAmount, side],
  );
  const priceImpact = useMemo(
    () => calculatePriceImpact(numericAmount, side),
    [numericAmount, side],
  );
  const minReceived = useMemo(
    () => calculateMinReceived(receiving, slippagePct),
    [receiving, slippagePct],
  );
  const networkFee = useMemo(() => getMockNetworkFee(), []);

  const bnbBalance = balances.find((b) => b.token === "BNB");
  const balanceLabel = bnbBalance ? `${bnbBalance.amount} BNB` : "0.0000 BNB";

  function handleUseMax() {
    if (bnbBalance) {
      form.setValue("amount", bnbBalance.amount, { shouldValidate: true });
    }
  }

  function handlePercentage(pct: number) {
    if (bnbBalance) {
      const value = (parseFloat(bnbBalance.amount) * pct / 100).toFixed(4);
      form.setValue("amount", value, { shouldValidate: true });
    }
  }

  function onSubmit(data: TradeFormValues) {
    console.log("Trade:", side, data);
  }

  const amountFields: FieldItem[] = [
    {
      type: "checkbox",
      name: "useWbnb",
      label: t("useWbnb"),
      description: t("useWbnbDescription"),
    },
    {
      type: "number",
      name: "amount",
      label: t("amount"),
      placeholder: "0.00",
      step: "any",
      min: 0,
      ariaLabel: t("amount"),
      description: `${t("balance")}: ${balanceLabel}`,
      endContent: (
        <Button size="default" variant="outline" onClick={handleUseMax} type="button">
          {t("useMax")}
        </Button>
      ),
    },
  ];

  const slippageField: FieldItem[] = slippage === "custom"
    ? [
        {
          type: "number",
          name: "customSlippage",
          placeholder: "0.00%",
          step: "any",
          min: 0,
          max: 50,
          ariaLabel: t("maxSlippage"),
        },
      ]
    : [];

  const approveField: FieldItem[] = [
    {
      type: "checkbox",
      name: "approveMax",
      label: t("approveMax"),
      description: t("approveMaxDescription"),
    },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card
        title={t("title")}
        description={t("description")}
        action={
          <Badge
            variant={side === "buy" ? "default" : "destructive"}
            className="text-xs"
          >
            {side === "buy" ? t("buying") : t("selling")}
          </Badge>
        }
        footer={
          isConnected && (
            <div className="flex w-full justify-end">
              <Button
                type="submit"
                variant={side === "buy" ? "default" : "destructive"}
                disabled={!form.formState.isValid}
              >
                {side === "buy" ? t("buyOks") : t("sellOks")}
              </Button>
            </div>
          )
        }
      >
        {isConnected ? (
          <div className="flex flex-col gap-3">
          {/* Buy/Sell Toggle */}
          <ButtonGroup className="self-center">
            <Button
              type="button"
              size="sm"
              variant={side === "buy" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSide("buy")}
            >
              {t("buy")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={side === "sell" ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => setSide("sell")}
            >
              {t("sell")}
            </Button>
          </ButtonGroup>

          {/* Use WBNB + Amount */}
          <FieldRenderer fields={amountFields} control={form.control} t={t} />

          {/* Percentage buttons */}
          <ButtonGroup className="self-start">
            {[25, 50, 75, 100].map((pct) => (
              <Button
                key={pct}
                type="button"
                size="xs"
                variant="outline"
                onClick={() => handlePercentage(pct)}
              >
                {pct}%
              </Button>
            ))}
          </ButtonGroup>

          {/* Details */}
          {numericAmount > 0 && (
            <TradeInfo
              rows={[
                {
                  label: t("receiving"),
                  value: `≈ ${formatCompactNumber(receiving)} ${side === "buy" ? "OKS" : "BNB"}`,
                },
                {
                  label: t("priceImpact"),
                  value: `${priceImpact.toFixed(3)}%`,
                  variant: priceImpact > 1 ? "destructive" : "success",
                },
                {
                  label: t("minReceived"),
                  value: `${formatCompactNumber(minReceived)} ${side === "buy" ? "OKS" : "BNB"}`,
                },
              ]}
            />
          )}

          {/* Slippage */}
          <div className="flex flex-col items-start gap-2">
            <span className="text-xs font-medium">{t("maxSlippage")}</span>
            <ButtonGroup>
              {SLIPPAGE_OPTIONS.map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  size="xs"
                  variant={slippage === opt ? "default" : "outline"}
                  onClick={() => setSlippage(opt)}
                >
                  {opt}%
                </Button>
              ))}
              <Button
                type="button"
                size="xs"
                variant={slippage === "custom" ? "default" : "outline"}
                onClick={() => setSlippage("custom")}
              >
                {t("custom")}
              </Button>
            </ButtonGroup>
            <FieldRenderer fields={slippageField} control={form.control} t={t} />
          </div>

          {/* Network Fee */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{t("networkFee")}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {networkFee.gwei.toFixed(2)} Gwei
                </span>
                <Settings className="size-3 text-muted-foreground" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {networkFee.bnb.toFixed(6)} BNB (~${networkFee.usd.toFixed(2)})
            </span>
          </div>

          {/* Approve Max */}
          <FieldRenderer fields={approveField} control={form.control} t={t} />
        </div>
      ) : (
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
      )}
      </Card>
    </form>
  );
}
