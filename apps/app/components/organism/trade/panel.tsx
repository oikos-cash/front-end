"use client";

// Components
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import KeyValueCard from "@/components/molecules/card/key-value";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useTradePanel } from "@/hooks/use-trade-panel";

// Icons
import { Lock, Wallet, Settings } from "lucide-react";

// Constants
import { SLIPPAGE_OPTIONS } from "@/types/constants";

export default function TradePanel() {
  const {
    t,
    form,
    side,
    setSide,
    slippage,
    onSubmit,
    networkFee,
    detailRows,
    isConnected,
    setSlippage,
    approveField,
    amountFields,
    slippageField,
    numericAmount,
    handleConnect,
    handlePercentage,
  } = useTradePanel();

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

            <FieldRenderer fields={amountFields} control={form.control} t={t} />

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

            {numericAmount > 0 && <KeyValueCard rows={detailRows} />}

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
              <FieldRenderer
                fields={slippageField}
                control={form.control}
                t={t}
              />
            </div>
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
