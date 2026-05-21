"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseEther, formatEther, maxUint256 } from "viem";
import { toast } from "sonner";

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
import TxFlowStatus from "@/components/molecules/tx-flow-status";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useSwap, type SwapMode } from "@/hooks/use-swap";
import type { Address } from "viem";
import type { TxFlowStep } from "@/hooks/types/tx-flow";

// Types
import { swapSchema } from "@/types/schemes";
import type { SwapFormValues, SwapToken } from "@/types/interfaces";

// Utils
import { formatCompactNumber } from "@/utils/number";

// Services
import {
  simulateTrade,
  calculateMinReceived,
  type TradeQuote,
} from "@/services/trade-simulation";

// Constants (contract addresses)
import {
  SWAP_SLIPPAGE_OPTIONS,
  SWAP_ROUTES,
  WBNB_ADDRESS,
  QUOTER_V2_ADDRESS,
  EXCHANGE_HELPER_ADDRESS,
  DEFAULT_POOL_FEE,
} from "@/types/constants";

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
  const { address, tokenBalances, balances } = useWallet();

  // Merge live wallet balances into the SSR-built token list. SSR has no idea
  // who the user is so it hardcodes balance: 0 — without this, "Use max" would
  // always fill 0. Native BNB has no token0 contract; pull its balance from
  // the wallet store's native row.
  const tokens = useMemo<SwapToken[]>(() => {
    const nativeBnb = balances.find((b) => b.token === "BNB");
    return initialTokens.map((tk) => {
      if (tk.symbol === "BNB") {
        return { ...tk, balance: parseFloat(nativeBnb?.amount ?? "0") || 0 };
      }
      const addr =
        tk.token0 && tk.token0.length > 0
          ? tk.token0
          : tk.symbol === "WBNB"
            ? WBNB_ADDRESS
            : "";
      if (!addr) return tk;
      const formatted = tokenBalances[addr.toLowerCase()];
      if (formatted == null) return tk;
      return { ...tk, balance: parseFloat(formatted) || 0 };
    });
  }, [initialTokens, tokenBalances, balances]);
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
  const [approveMax, setApproveMax] = useState(false);

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

  // Resolve token addresses. Native BNB has no contract — the quoter
  // simulation still uses WBNB_ADDRESS (the pool is WBNB/<vault>), but the
  // useSwap allowance check skips when tokenIn is undefined.
  const fromIsNative = fromTokenData?.symbol === "BNB";
  const toIsNative = toTokenData?.symbol === "BNB";
  const fromAddr =
    fromTokenData?.token0 ||
    (fromTokenData?.symbol === "WBNB" || fromIsNative
      ? WBNB_ADDRESS
      : undefined);
  const toAddr =
    toTokenData?.token0 ||
    (toTokenData?.symbol === "WBNB" || toIsNative ? WBNB_ADDRESS : undefined);

  const amountInWei = fromAmount > 0
    ? parseEther(fromAmount.toString())
    : undefined;

  const {
    submit: submitSwap,
    reset: resetSwap,
    needsApproval,
    isPending: isSwapPending,
    flowState,
  } = useSwap(
    address as Address | undefined,
    // tokenIn = undefined for native BNB so no ERC20 approval is attempted.
    (fromIsNative ? undefined : (fromAddr as Address | undefined)),
    EXCHANGE_HELPER_ADDRESS,
    amountInWei,
  );

  // Toasts on terminal events.
  const toastedStepRef = useRef<TxFlowStep | null>(null);
  useEffect(() => {
    if (toastedStepRef.current === flowState.step) return;
    toastedStepRef.current = flowState.step;
    if (flowState.step === "success" && flowState.actionTxHash) {
      const hash = flowState.actionTxHash;
      toast.success(t("toastSwapSuccess"), {
        action: {
          label: t("viewTx"),
          onClick: () => window.open(`https://bscscan.com/tx/${hash}`, "_blank"),
        },
      });
      form.reset({ fromToken: "", toToken: "", fromAmount: "" });
    } else if (flowState.step === "error" && flowState.errorMessage) {
      toast.error(flowState.errorMessage);
    }
  }, [flowState, t, form]);

  // Quoter V2 simulation for real output & price impact
  const [quote, setQuote] = useState<TradeQuote | null>(null);

  useEffect(() => {
    if (!fromTokenData || !toTokenData || fromAmount <= 0) {
      setQuote(null);
      return;
    }

    const tokenIn =
      fromTokenData.token0 || (fromTokenData.symbol === "WBNB" ? WBNB_ADDRESS : "");
    const tokenOut =
      toTokenData.token0 || (toTokenData.symbol === "WBNB" ? WBNB_ADDRESS : "");

    if (!tokenIn || !tokenOut) {
      setQuote(null);
      return;
    }

    let cancelled = false;

    simulateTrade({
      quoterAddress: QUOTER_V2_ADDRESS,
      tokenIn: tokenIn as `0x${string}`,
      tokenOut: tokenOut as `0x${string}`,
      amountIn: parseEther(fromAmount.toString()),
      fee: DEFAULT_POOL_FEE,
    })
      .then((result) => {
        if (!cancelled) setQuote(result);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });

    return () => {
      cancelled = true;
    };
  }, [fromTokenData, toTokenData, fromAmount]);

  const estimatedOutput = quote
    ? Number(formatEther(quote.amountOut))
    : 0;

  const exchangeRate = useMemo(() => {
    if (!fromTokenData || !toTokenData) return "";
    if (estimatedOutput > 0 && fromAmount > 0) {
      const rate = estimatedOutput / fromAmount;
      return `1 ${fromToken} ≈ ${formatCompactNumber(rate)} ${toToken}`;
    }
    const rate = fromTokenData.price / toTokenData.price;
    return `1 ${fromToken} ≈ ${formatCompactNumber(rate)} ${toToken}`;
  }, [fromToken, toToken, fromTokenData, toTokenData, estimatedOutput, fromAmount]);

  const priceImpact = quote?.priceImpact ?? 0;

  const minReceived = quote
    ? Number(
        formatEther(
          calculateMinReceived(
            quote.amountOut,
            Math.round(activeSlippage * 100),
          ),
        ),
      )
    : 0;

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

  // ExchangeHelper routes against a single vault. One leg has to be the
  // base pair (BNB or WBNB), the other is the vault token. The mode
  // changes whether the base leg is native BNB or wrapped:
  //   BNB  → vault   = buyTokens       (msg.value)
  //   WBNB → vault   = buyTokensWETH   (ERC20 approve + transferFrom)
  //   vault → BNB    = sellTokensETH   (returns native BNB)
  //   vault → WBNB   = sellTokens      (returns WBNB)
  // BNB↔WBNB and vault↔vault aren't supported here — wrap/unwrap lives in
  // the header modal and multi-hop routing isn't implemented yet.
  const fromIsWbnb = fromTokenData?.symbol === "WBNB";
  const toIsWbnb = toTokenData?.symbol === "WBNB";
  const fromIsBase = fromIsNative || fromIsWbnb;
  const toIsBase = toIsNative || toIsWbnb;
  const vaultSide = fromIsBase && !toIsBase
    ? toTokenData
    : !fromIsBase && toIsBase
      ? fromTokenData
      : null;
  const swapMode: SwapMode | null =
    fromIsBase && !toIsBase
      ? (fromIsNative ? "buyTokens" : "buyTokensWETH")
      : !fromIsBase && toIsBase
        ? (toIsNative ? "sellTokensETH" : "sellTokens")
        : null;
  const isUnsupportedPair =
    !!fromTokenData && !!toTokenData && swapMode === null;

  async function onSubmit() {
    if (!fromAddr || !toAddr || !address || !quote) return;
    if (!swapMode || !vaultSide?.vaultAddress || !vaultSide?.poolAddress) return;

    // Reset prior terminal state so the new attempt starts clean.
    if (flowState.step === "success" || flowState.step === "error") resetSwap();

    const amountIn = parseEther(fromAmount.toString());
    const slippageBps = Math.round(activeSlippage * 100);

    submitSwap(
      {
        mode: swapMode,
        routerAddress: EXCHANGE_HELPER_ADDRESS,
        vaultAddress: vaultSide.vaultAddress as Address,
        pool: vaultSide.poolAddress as Address,
        price: BigInt(vaultSide.spotPriceX96 ?? "0"),
        amount: amountIn,
        minAmount: calculateMinReceived(quote.amountOut, slippageBps),
        receiver: address as Address,
        slippageBps,
      },
      approveMax ? maxUint256 : amountIn,
    );
  }

  const flowLabels = {
    title: t("flowStatusTitle"),
    awaitingApproveSignature: t("awaitingApproveSignature", {
      token: fromToken || "Token",
    }),
    approvingOnChain: t("approvingOnChain", { token: fromToken || "Token" }),
    approveDone: t("approveStepDone", { token: fromToken || "Token" }),
    approveStepFallback: t("approveStepDone", { token: fromToken || "Token" }),
    awaitingActionSignature: t("awaitingSwapSignature"),
    actionPending: t("swapPending"),
    actionSubmitting: t("submittingSwap"),
    actionDone: t("swapStepDone"),
    actionStepFallback: t("swapAction"),
    dismiss: t("dismiss"),
  };

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

              <Checkbox
                checked={approveMax}
                onCheckedChange={(v) => setApproveMax(v as boolean)}
                label={t("approveMax")}
                description={t("approveMaxDesc")}
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
        disabled={
          !form.formState.isValid || isSwapPending || isUnsupportedPair
        }
        isLoading={isSwapPending}
      >
        {(() => {
          if (isUnsupportedPair) return t("unsupportedPair");
          switch (flowState.step) {
            case "approve-wallet":
              return t("awaitingApproveSignature", { token: fromToken || "Token" });
            case "approve-pending":
              return t("approvingOnChain", { token: fromToken || "Token" });
            case "approve-confirmed":
              return t("submittingSwap");
            case "action-wallet":
              return t("awaitingSwapSignature");
            case "action-pending":
              return t("swapPending");
            default:
              return needsApproval
                ? t("approveAndSwap", { token: fromToken || "Token" })
                : t("swapAction");
          }
        })()}
      </Button>

      <TxFlowStatus state={flowState} labels={flowLabels} onDismiss={resetSwap} />
    </form>
  );
}
