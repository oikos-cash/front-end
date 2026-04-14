"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import Card from "@/components/atoms/card";
import Input from "@/components/atoms/input";
import Field from "@/components/atoms/field";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import Avatar from "@/components/atoms/avatar";
import Badge from "@/components/atoms/badge";
import Checkbox from "@/components/atoms/checkbox";
import Sheet from "@/components/atoms/sheet";
import KeyValueCard from "@/components/molecules/card/key-value";

// Hooks
import { useTranslations } from "next-intl";

// Types
import { swapSchema } from "@/types/schemes";
import type { SwapFormValues, SwapToken } from "@/types/interfaces";

// Constants
import { SWAP_SLIPPAGE_OPTIONS, SWAP_ROUTES } from "@/types/constants";

// Utils
import {
  calculateSwapOutput,
  formatCompactNumber,
} from "@/utils/number";

// Icons
import { Settings, Search, ChevronDown } from "lucide-react";

function TokenSearchList({
  tokens,
  search,
  setSearch,
  onSelect,
  t,
}: {
  tokens: SwapToken[];
  search: string;
  setSearch: (v: string) => void;
  onSelect: (tk: SwapToken) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder={t("searchToken")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        startIcon={<Search className="size-3.5 text-muted-foreground" />}
        autoFocus
      />
      <div className="flex flex-col gap-0">
        {tokens.map((tk) => (
          <button
            key={tk.symbol}
            type="button"
            onClick={() => onSelect(tk)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <Avatar name={tk.symbol} src={tk.iconUrl} size="default" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{tk.symbol}</span>
                <span className="text-xs text-muted-foreground">{tk.name}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">
                {formatCompactNumber(tk.balance)}
              </span>
              <span className="text-xs text-muted-foreground">
                ${formatCompactNumber(tk.balance * tk.price)}
              </span>
            </div>
          </button>
        ))}
        {tokens.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("noResults")}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SwapForm({
  initialTokens,
}: {
  initialTokens: SwapToken[];
}) {
  const t = useTranslations("swap");
  const tokens = initialTokens;
  const form = useForm<SwapFormValues>({
    resolver: zodResolver(swapSchema),
    defaultValues: { fromToken: "", toToken: "", fromAmount: "" },
    mode: "onChange",
  });

  const fromToken = form.watch("fromToken");
  const toToken = form.watch("toToken");
  const fromAmount = parseFloat(form.watch("fromAmount")) || 0;

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [customSlippage, setCustomSlippage] = useState("");
  const [mevProtection, setMevProtection] = useState(true);

  // Sheet state
  const [fromSheetOpen, setFromSheetOpen] = useState(false);
  const [toSheetOpen, setToSheetOpen] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");

  const activeSlippage =
    slippage === "custom"
      ? parseFloat(customSlippage) || 0.5
      : parseFloat(slippage);

  const fromTokenData = useMemo(
    () => tokens.find((tk) => tk.symbol === fromToken),
    [tokens, fromToken],
  );

  const toTokenData = useMemo(
    () => tokens.find((tk) => tk.symbol === toToken),
    [tokens, toToken],
  );

  const filteredFromTokens = useMemo(() => {
    const available = tokens.filter((tk) => tk.symbol !== toToken);
    if (!fromSearch) return available;
    const q = fromSearch.toLowerCase();
    return available.filter(
      (tk) =>
        tk.symbol.toLowerCase().includes(q) ||
        tk.name.toLowerCase().includes(q),
    );
  }, [tokens, toToken, fromSearch]);

  const filteredToTokens = useMemo(() => {
    const available = tokens.filter((tk) => tk.symbol !== fromToken);
    if (!toSearch) return available;
    const q = toSearch.toLowerCase();
    return available.filter(
      (tk) =>
        tk.symbol.toLowerCase().includes(q) ||
        tk.name.toLowerCase().includes(q),
    );
  }, [tokens, fromToken, toSearch]);

  const estimatedOutput = useMemo(() => {
    if (!fromTokenData || !toTokenData || fromAmount <= 0) return 0;
    return calculateSwapOutput(
      fromAmount,
      fromTokenData.price,
      toTokenData.price,
    );
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
    return estimatedOutput * (1 - activeSlippage / 100);
  }, [estimatedOutput, activeSlippage]);

  function handleSelectFromToken(tk: SwapToken) {
    form.setValue("fromToken", tk.symbol, { shouldValidate: true });
    setFromSheetOpen(false);
    setFromSearch("");
  }

  function handleSelectToToken(tk: SwapToken) {
    form.setValue("toToken", tk.symbol, { shouldValidate: true });
    setToSheetOpen(false);
    setToSearch("");
  }

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
      {/* Settings sheet */}
      <div className="flex justify-end">
        <Sheet
          title={t("settingsTitle")}
          description={t("settingsDescription")}
          side="right"
          open={showSettings}
          onOpenChange={setShowSettings}
          submitLabel={t("saveSettings")}
          cancelLabel={t("cancel")}
          content={
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  {t("slippageTolerance")}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <ButtonGroup>
                    {SWAP_SLIPPAGE_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        size="sm"
                        variant={slippage === opt ? "default" : "outline"}
                        onClick={() => {
                          setSlippage(opt);
                          setCustomSlippage("");
                        }}
                      >
                        {opt}%
                      </Button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant={slippage === "custom" ? "default" : "outline"}
                      onClick={() => setSlippage("custom")}
                    >
                      {t("custom")}
                    </Button>
                  </ButtonGroup>
                  {slippage === "custom" && (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      placeholder="0.5"
                      value={customSlippage}
                      onChange={(e) => setCustomSlippage(e.target.value)}
                      className="h-8 w-20 text-xs"
                    />
                  )}
                </div>
              </div>

              <Checkbox
                checked={mevProtection}
                onCheckedChange={(v) => setMevProtection(v as boolean)}
                label={t("mevProtection")}
                description={t("mevProtectionDesc")}
              />
            </div>
          }
        >
          <Button type="button" variant="ghost" size="icon-xs">
            <Settings className="size-4" />
          </Button>
        </Sheet>
      </div>

      <div className="flex flex-col items-stretch gap-3 lg:flex-row">
        {/* From */}
        <Card title={t("from")} className="w-full flex-1">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <span className="mb-1 block text-sm font-medium">
                {t("selectToken")}
              </span>
              <Sheet
                title={t("selectToken")}
                description={t("searchToken")}
                side="right"
                open={fromSheetOpen}
                onOpenChange={setFromSheetOpen}
                cancelLabel={t("cancel")}
                content={
                  <TokenSearchList
                    tokens={filteredFromTokens}
                    search={fromSearch}
                    setSearch={setFromSearch}
                    onSelect={handleSelectFromToken}
                    t={t}
                  />
                }
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
                >
                  {fromTokenData ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={fromTokenData.symbol}
                        src={fromTokenData.iconUrl}
                        size="sm"
                      />
                      <span className="font-medium">
                        {fromTokenData.symbol}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("selectToken")}
                    </span>
                  )}
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </Sheet>
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
                      {t("useMax", {
                        amount: formatCompactNumber(fromTokenData.balance),
                      })}
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
              <span className="mb-1 block text-sm font-medium">
                {t("selectToken")}
              </span>
              <Sheet
                title={t("selectToken")}
                description={t("searchToken")}
                side="right"
                open={toSheetOpen}
                onOpenChange={setToSheetOpen}
                cancelLabel={t("cancel")}
                content={
                  <TokenSearchList
                    tokens={filteredToTokens}
                    search={toSearch}
                    setSearch={setToSearch}
                    onSelect={handleSelectToToken}
                    t={t}
                  />
                }
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
                >
                  {toTokenData ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={toTokenData.symbol}
                        src={toTokenData.iconUrl}
                        size="sm"
                      />
                      <span className="font-medium">{toTokenData.symbol}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("selectToken")}
                    </span>
                  )}
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </Sheet>
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {t("estimatedOutput")}
                </span>
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

      {fromToken && toToken && (
        <>
          <KeyValueCard
            rows={[
              { label: t("exchangeRate"), value: exchangeRate },
              {
                label: t("priceImpact"),
                value: `${priceImpact.toFixed(2)}%`,
                variant: priceImpact > 1 ? "destructive" : "success",
              },
              {
                label: t("minReceived"),
                value:
                  minReceived > 0
                    ? `${formatCompactNumber(minReceived)} ${toToken}`
                    : "--",
              },
              {
                label: t("slippageTolerance"),
                value: `${activeSlippage}%`,
              },
            ]}
          />

          {/* Routing info */}
          <Card
            title={t("routingTitle")}
            description={t("routingDescription")}
          >
            <div className="flex flex-col gap-2">
              {SWAP_ROUTES.map((route) => (
                <div
                  key={route.dex}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{route.dex}</span>
                  <Badge variant="outline">{route.share}%</Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
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
