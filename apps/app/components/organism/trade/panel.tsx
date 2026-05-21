"use client";

// Components
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import Skeleton from "@/components/atoms/skeleton";
import KeyValueCard from "@/components/molecules/card/key-value";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import { Checkbox } from "@/components/atoms/ui/checkbox";
import FieldRenderer from "@/components/molecules/field-renderer";
import TxFlowStatus from "@/components/molecules/tx-flow-status";

// Hooks
import { useTranslations } from "next-intl";
import { useTradePanel } from "@/hooks/use-trade-panel";

// Icons
import { Lock, Wallet, Settings, ServerOff } from "lucide-react";

// Constants
import { SLIPPAGE_OPTIONS } from "@/types/constants";

export default function TradePanel() {
  const te = useTranslations("error");
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
    amountFields,
    slippageField,
    useWbnb,
    setUseWbnb,
    numericAmount,
    handleConnect,
    handlePercentage,
    hasVault,
    isLoadingVaults,
    needsApproval,
    isSwapPending,
    flowState,
    resetSwap,
    tokenSymbol,
  } = useTradePanel();

  const flowLabels = {
    title: t("flowStatusTitle"),
    awaitingApproveSignature: t("awaitingApproveSignature", { token: tokenSymbol }),
    approvingOnChain: t("approvingOnChain", { token: tokenSymbol }),
    approveDone: t("approveStepDone", { token: tokenSymbol }),
    approveStepFallback: t("approveStepDone", { token: tokenSymbol }),
    awaitingActionSignature: t("awaitingTradeSignature", {
      action: side === "buy" ? t("buyAction") : t("sellAction"),
    }),
    actionPending: t("tradePending"),
    actionSubmitting: t("submittingTrade"),
    actionDone: t("tradeStepDone"),
    actionStepFallback: side === "buy" ? t("buyAction") : t("sellAction"),
    dismiss: t("dismiss"),
  };

  return (
    <Card
      title={t("title")}
      description={t("description")}
      action={
        hasVault && isConnected ? (
          <Badge
            variant={side === "buy" ? "success" : "destructive"}
            className="text-xs"
          >
            {side === "buy" ? t("buying") : t("selling")}
          </Badge>
        ) : undefined
      }
    >
      {isLoadingVaults ? (
        <div className="flex flex-col gap-3 p-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : !isConnected ? (
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
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-3">
            {/* Group 1 — sizing the trade (tightly grouped) */}
            <ButtonGroup className="w-full">
              <Button
                type="button"
                size="sm"
                variant={side === "buy" ? "success" : "outline"}
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

            {/* Pay-with toggle — replaces the orphan "Use WBNB" checkbox.
              * Sits inline as a labelled segmented control so the user can
              * see at a glance which token funds the swap. */}
            {side === "buy" && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("payWith")}
                </span>
                <ButtonGroup>
                  <Button
                    type="button"
                    size="xs"
                    variant={!useWbnb ? "default" : "outline"}
                    onClick={() => setUseWbnb(false)}
                  >
                    BNB
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant={useWbnb ? "default" : "outline"}
                    onClick={() => setUseWbnb(true)}
                  >
                    WBNB
                  </Button>
                </ButtonGroup>
              </div>
            )}

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

            {/* Group 2 — settings (slippage / fee / approval). Sit in a
              * dedicated section with explicit row gaps and a top divider
              * so they read as a separate concern from the "amount" block. */}
            <div className="mt-2 flex flex-col gap-4 border-t border-border/40 pt-4">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
                  {t("maxSlippage")}
                </span>
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

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
                  {t("networkFee")}
                </span>
                <div className="flex flex-col items-end gap-0.5 font-mono tabular-nums">
                  <span className="flex items-center gap-1 text-xs text-foreground">
                    {networkFee.gwei.toFixed(2)} Gwei
                    <Settings className="size-3 text-muted-foreground/60" />
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {networkFee.bnb.toFixed(6)} BNB ·{" "}
                    {networkFee.usd > 0 && networkFee.usd < 0.01
                      ? "<$0.01"
                      : `$${networkFee.usd.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <label
                htmlFor="trade-approve-max"
                className="flex cursor-pointer items-center justify-between gap-2 select-none"
              >
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
                  {t("approveMax")}
                </span>
                <Checkbox
                  id="trade-approve-max"
                  checked={form.watch("approveMax")}
                  onCheckedChange={(v) =>
                    form.setValue("approveMax", !!v, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </label>
            </div>

            <Button
              type="submit"
              variant={side === "buy" ? "success" : "destructive"}
              disabled={!form.formState.isValid || isSwapPending}
              isLoading={isSwapPending}
              className="w-full"
            >
              {(() => {
                switch (flowState.step) {
                  case "approve-wallet":
                    return t("awaitingApproveSignature", { token: tokenSymbol });
                  case "approve-pending":
                    return t("approvingOnChain", { token: tokenSymbol });
                  case "approve-confirmed":
                    return t("submittingTrade");
                  case "action-wallet":
                    return t("awaitingTradeSignature", {
                      action: side === "buy" ? t("buyAction") : t("sellAction"),
                    });
                  case "action-pending":
                    return t("tradePending");
                  default:
                    return needsApproval
                      ? t("approveAndTrade", {
                          token: tokenSymbol,
                          action: side === "buy" ? t("buyAction") : t("sellAction"),
                        })
                      : side === "buy"
                        ? t("buyOks")
                        : t("sellOks");
                }
              })()}
            </Button>

            <TxFlowStatus state={flowState} labels={flowLabels} onDismiss={resetSwap} />
          </div>
        </form>
      )}
    </Card>
  );
}
