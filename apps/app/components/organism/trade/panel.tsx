"use client";

import { useState } from "react";

// Components
import Avatar from "@/components/atoms/avatar";
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import Dialog from "@/components/atoms/dialog";
import Empty from "@/components/atoms/empty";
import Input from "@/components/atoms/input";
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

// --- Gas Fee picker ------------------------------------------------------
// Lightweight dialog that lets the user override the gas price for the next
// trade. "Auto" follows the network price; the presets are multiples of it
// (slow = 0.8×, normal = 1×, fast = 1.5×). Custom takes a raw Gwei value.

type GasPreset = "auto" | "slow" | "normal" | "fast" | "custom";

function GasFeeDialog({
  open,
  onOpenChange,
  networkGwei,
  overrideGwei,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  networkGwei: number;
  overrideGwei: number | null;
  onApply: (gwei: number | null) => void;
}) {
  const presets: Array<{ key: GasPreset; label: string; gwei: number | null }> = [
    { key: "auto", label: "Auto", gwei: null },
    { key: "slow", label: "Slow", gwei: networkGwei > 0 ? networkGwei * 0.8 : 0 },
    {
      key: "normal",
      label: "Normal",
      gwei: networkGwei > 0 ? networkGwei : 0,
    },
    { key: "fast", label: "Fast", gwei: networkGwei > 0 ? networkGwei * 1.5 : 0 },
  ];

  // Active preset key — derived from the current override + network value.
  const currentKey: GasPreset = (() => {
    if (overrideGwei == null) return "auto";
    const match = presets.find(
      (p) => p.gwei != null && Math.abs(p.gwei - overrideGwei) < 1e-6,
    );
    return match?.key ?? "custom";
  })();

  const [selected, setSelected] = useState<GasPreset>(currentKey);
  const [customGwei, setCustomGwei] = useState<string>(
    currentKey === "custom" && overrideGwei != null ? overrideGwei.toString() : "",
  );

  // Reset internal state whenever the dialog opens.
  function handleOpenChange(v: boolean) {
    if (v) {
      setSelected(currentKey);
      setCustomGwei(
        currentKey === "custom" && overrideGwei != null
          ? overrideGwei.toString()
          : "",
      );
    }
    onOpenChange(v);
  }

  function handleApply() {
    if (selected === "auto") return onApply(null);
    if (selected === "custom") {
      const v = parseFloat(customGwei);
      if (!isFinite(v) || v <= 0) return;
      return onApply(v);
    }
    const preset = presets.find((p) => p.key === selected);
    if (preset && preset.gwei && preset.gwei > 0) onApply(preset.gwei);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Gas settings"
      description="Override the gas price for the next trade. Higher values may confirm faster on busy blocks."
      content={
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((p) => (
              <Button
                key={p.key}
                type="button"
                size="sm"
                variant={selected === p.key ? "default" : "outline"}
                onClick={() => setSelected(p.key)}
                className="flex h-auto flex-col items-center gap-0.5 px-2 py-2"
              >
                <span className="eyebrow-strong">{p.label}</span>
                <span className="eyebrow eyebrow-mono opacity-80">
                  {p.gwei == null ? "—" : `${p.gwei.toFixed(2)} gwei`}
                </span>
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow-strong">Custom (Gwei)</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={networkGwei > 0 ? networkGwei.toFixed(2) : "0.05"}
              value={customGwei}
              onChange={(e) => {
                setCustomGwei(e.target.value);
                setSelected("custom");
              }}
            />
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      }
    />
  );
}

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
    networkGasGwei,
    gasOverrideGwei,
    setGasOverrideGwei,
  } = useTradePanel();

  const [gasModalOpen, setGasModalOpen] = useState(false);

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
      title={t("title", { token: tokenSymbol })}
      description={t("description", { token: tokenSymbol })}
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
          description={t("connectDescription", { token: tokenSymbol })}
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

            {/* Pay-with selector — full-width segmented control showing both
              * source token options with their icons. Selected option uses the
              * brand-tinted treatment; unselected uses the card chrome. */}
            {side === "buy" && (
              <div className="flex flex-col gap-1.5">
                <span className="eyebrow-strong">{t("payWith")}</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { id: "bnb", label: "BNB", selected: !useWbnb, onSelect: () => setUseWbnb(false) },
                    { id: "wbnb", label: "WBNB", selected: useWbnb, onSelect: () => setUseWbnb(true) },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={opt.onSelect}
                      aria-pressed={opt.selected}
                      className={
                        "group relative flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all " +
                        (opt.selected
                          ? "border-primary/50 bg-primary/10 text-foreground shadow-[0_0_0_1px_rgba(245,200,67,0.2),0_2px_10px_-4px_rgba(245,200,67,0.4)]"
                          : "border-border/60 bg-card/40 text-muted-foreground hover:border-border-strong hover:bg-card/60 hover:text-foreground")
                      }
                    >
                      <Avatar name={opt.label} size="sm" />
                      <span className="text-sm font-medium leading-none">
                        {opt.label}
                      </span>
                      {opt.selected && (
                        <span
                          aria-hidden
                          className="ml-auto block size-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(245,200,67,0.7)]"
                        />
                      )}
                    </button>
                  ))}
                </div>
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
                <span className="eyebrow-strong">{t("maxSlippage")}</span>
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

              {(() => {
                // Resolve a short speed label from the active override.
                // Matches the preset multipliers used in GasFeeDialog.
                const mode = (() => {
                  if (gasOverrideGwei == null) return "Auto";
                  if (networkGasGwei <= 0) return "Custom";
                  const ratio = gasOverrideGwei / networkGasGwei;
                  if (Math.abs(ratio - 0.8) < 0.05) return "Slow";
                  if (Math.abs(ratio - 1) < 0.05) return "Normal";
                  if (Math.abs(ratio - 1.5) < 0.05) return "Fast";
                  return "Custom";
                })();
                const isAuto = mode === "Auto";
                return (
                  <button
                    type="button"
                    onClick={() => setGasModalOpen(true)}
                    aria-label="Adjust network fee"
                    className="group flex w-full items-center justify-between gap-2 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-card/60"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="eyebrow-strong">{t("networkFee")}</span>
                      <span className="eyebrow eyebrow-mono normal-case tracking-normal text-muted-foreground/70">
                        {networkFee.bnb > 0 ? (
                          <>
                            {networkFee.bnb.toFixed(6)} BNB ·{" "}
                            {networkFee.usd > 0 && networkFee.usd < 0.01
                              ? "<$0.01"
                              : `$${networkFee.usd.toFixed(2)}`}
                          </>
                        ) : (
                          "Enter amount to estimate"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          "eyebrow inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-semibold " +
                          (isAuto
                            ? "border-border/60 bg-muted/40 text-muted-foreground"
                            : "border-primary/40 bg-primary/15 text-primary")
                        }
                      >
                        <span
                          aria-hidden
                          className={
                            "block size-1.5 rounded-full " +
                            (isAuto ? "bg-muted-foreground/60" : "bg-primary")
                          }
                        />
                        {mode}
                        <span className="font-mono tracking-tight text-foreground/90">
                          {networkFee.gwei > 0
                            ? `${networkFee.gwei.toFixed(2)}`
                            : "—"}
                        </span>
                      </span>
                      <Settings className="size-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                    </div>
                  </button>
                );
              })()}

              <label
                htmlFor="trade-approve-max"
                className="flex cursor-pointer items-center justify-between gap-2 select-none"
              >
                <span className="eyebrow-strong">{t("approveMax")}</span>
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
                        ? t("buyOks", { token: tokenSymbol })
                        : t("sellOks", { token: tokenSymbol });
                }
              })()}
            </Button>

            <TxFlowStatus state={flowState} labels={flowLabels} onDismiss={resetSwap} />
          </div>
        </form>
      )}

      <GasFeeDialog
        open={gasModalOpen}
        onOpenChange={setGasModalOpen}
        networkGwei={networkGasGwei}
        overrideGwei={gasOverrideGwei}
        onApply={(g) => {
          setGasOverrideGwei(g);
          setGasModalOpen(false);
        }}
      />
    </Card>
  );
}
