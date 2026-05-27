"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseEther, formatEther, maxUint256 } from "viem";
import { toast } from "sonner";

// Components
import Input from "@/components/atoms/input";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import Avatar from "@/components/atoms/avatar";
import Checkbox from "@/components/atoms/checkbox";
import Sheet from "@/components/atoms/sheet";
import TxFlowStatus from "@/components/molecules/tx-flow-status";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useSwap, type SwapMode } from "@/hooks/use-swap";
import { useSwapFormUiBridge } from "@/hooks/use-swap-form-ui-bridge";
import type { Address } from "viem";
import type { TxFlowStep } from "@/hooks/types/tx-flow";

// Types
import { swapSchema } from "@/types/schemes";
import type { SwapFormValues, SwapToken } from "@/types/interfaces";

// Utils
import { formatCompactNumber } from "@/utils/number";
import { cn } from "@/utils/object";

// Services
import {
  simulateTrade,
  calculateMinReceived,
  type TradeQuote,
} from "@/services/trade-simulation";

// Constants (contract addresses)
import {
  SWAP_SLIPPAGE_OPTIONS,
  WBNB_ADDRESS,
  QUOTER_V2_ADDRESS,
  EXCHANGE_HELPER_ADDRESS,
} from "@/types/constants";

// Icons
import {
  Settings,
  Search,
  ChevronDown,
  ArrowDown,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────
//                            Token picker
// ─────────────────────────────────────────────────────────────────────

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
      <div className="-mx-1 flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto px-1">
        {tokens.map((tk) => (
          <button
            key={tk.symbol}
            type="button"
            onClick={() => onSelect(tk)}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border/60 hover:bg-accent/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={tk.symbol} src={tk.iconUrl} size="default" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {tk.symbol}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {tk.name}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatCompactNumber(tk.balance)}
              </span>
              <span className="font-mono text-mini tabular-nums text-muted-foreground/70">
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

// ─────────────────────────────────────────────────────────────────────
//                            Token pill
// ─────────────────────────────────────────────────────────────────────

/**
 * The dominant control inside each swap leg — opens the picker sheet.
 * When empty, reads as a brand-tinted call-to-action; once selected it
 * collapses to a compact pill displaying the avatar + ticker.
 */
const TokenPill = React.forwardRef<
  HTMLButtonElement,
  {
    token: SwapToken | undefined;
    placeholder: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function TokenPill({ token, placeholder, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        token
          ? "border-border/70 bg-card text-foreground hover:border-border-strong hover:bg-card/80"
          : "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20",
        className,
      )}
    >
      {token ? (
        <>
          <Avatar name={token.symbol} src={token.iconUrl} size="sm" />
          <span className="tracking-tight">{token.symbol}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </>
      ) : (
        <>
          <span>{placeholder}</span>
          <ChevronDown className="size-3.5" />
        </>
      )}
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────
//                       Per-leg swap panel
// ─────────────────────────────────────────────────────────────────────

/**
 * One leg of the swap (From or To). Visually a single inset plate with
 * the eyebrow label top-left, balance/max top-right, a large numeric
 * value lined up against the token pill picker, and a dollar estimate
 * underneath. Both legs share the exact same layout so they read as a
 * matched pair flanking the flip arrow.
 */
function SwapLeg({
  side,
  token,
  picker,
  value,
  onValueChange,
  readOnly,
  balance,
  showMax,
  onMax,
  usd,
  emphasis,
  t,
}: {
  side: "from" | "to";
  token: SwapToken | undefined;
  picker: React.ReactNode;
  value: string;
  onValueChange?: (v: string) => void;
  readOnly?: boolean;
  balance?: number;
  showMax?: boolean;
  onMax?: () => void;
  usd?: number;
  emphasis?: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-4",
        "transition-[border-color,box-shadow] focus-within:border-primary/45",
        "focus-within:shadow-[0_0_0_1px_rgba(245,200,67,0.18)_inset,0_8px_24px_-14px_rgba(245,200,67,0.22)]",
        emphasis && "bg-card/60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{side === "from" ? t("from") : t("to")}</span>
        {balance != null && token && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-mini tabular-nums text-muted-foreground/85">
              {t("balance", { amount: formatCompactNumber(balance) })}
            </span>
            {showMax && onMax && balance > 0 && (
              <button
                type="button"
                onClick={onMax}
                className="rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/15"
              >
                {t("max")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="0.00"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onValueChange?.(e.target.value)}
          className={cn(
            "min-w-0 flex-1 bg-transparent font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground outline-none placeholder:text-muted-foreground/35",
            readOnly && "pointer-events-none",
            "sm:text-3xl",
          )}
        />
        {picker}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
          {usd && usd > 0 ? `≈ $${formatCompactNumber(usd)}` : "≈ $0.00"}
        </span>
        {token ? (
          <span className="eyebrow text-muted-foreground/55">{token.name}</span>
        ) : (
          <span className="eyebrow text-muted-foreground/45">
            {t("selectToken")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//                            Swap form
// ─────────────────────────────────────────────────────────────────────

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
  const fromAmountRaw = form.watch("fromAmount");
  const fromAmount = parseFloat(fromAmountRaw) || 0;

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

  const amountInWei =
    fromAmount > 0 ? parseEther(fromAmount.toString()) : undefined;

  const {
    submit: submitSwap,
    reset: resetSwap,
    needsApproval,
    isPending: isSwapPending,
    flowState,
  } = useSwap(
    address as Address | undefined,
    // tokenIn = undefined for native BNB so no ERC20 approval is attempted.
    fromIsNative ? undefined : (fromAddr as Address | undefined),
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
          onClick: () =>
            window.open(`https://bscscan.com/tx/${hash}`, "_blank"),
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

    // Resolve the WBNB-address fallback for BOTH native BNB and WBNB.
    // The previous code only fell through for the literal "WBNB" symbol,
    // so a native-BNB leg ended up with `tokenIn === ""` and the effect
    // short-circuited — no quote ever fired for BNB→token swaps.
    const wrappedFallback = (symbol: string): string =>
      symbol === "WBNB" || symbol === "BNB" ? WBNB_ADDRESS : "";
    const tokenIn =
      fromTokenData.token0 || wrappedFallback(fromTokenData.symbol);
    const tokenOut =
      toTokenData.token0 || wrappedFallback(toTokenData.symbol);

    if (!tokenIn || !tokenOut) {
      setQuote(null);
      return;
    }

    // Fee-tier resolution: prefer whichever the vault side carries (the
    // pool-API enrichment in utils/swap.ts populates this when the
    // backend exposes /api/pools). Fall back to a 3000-then-2500 race so
    // Pancake pools (fee=2500) don't silently revert against the
    // hardcoded Uniswap 3000 we used to send.
    const knownFeeTier =
      fromTokenData.feeTier ?? toTokenData.feeTier ?? undefined;
    const feeTiersToTry: number[] = knownFeeTier
      ? [knownFeeTier]
      : [3000, 2500];

    let cancelled = false;

    (async () => {
      let lastErr: unknown = null;
      for (const fee of feeTiersToTry) {
        try {
          const result = await simulateTrade({
            quoterAddress: QUOTER_V2_ADDRESS,
            tokenIn: tokenIn as `0x${string}`,
            tokenOut: tokenOut as `0x${string}`,
            amountIn: parseEther(fromAmount.toString()),
            fee,
          });
          if (cancelled) return;
          setQuote(result);
          return;
        } catch (err) {
          lastErr = err;
        }
      }
      if (cancelled) return;
      if (lastErr) {
        // Surface the failure so devtools shows *why* the To-leg is
        // stuck at 0.00. Common cause: no pool exists at any of the
        // tiers we tried (typically a freshly deployed vault whose
        // initial liquidity hasn't been seeded yet).
        console.warn("[SwapForm] Quoter reverted for all tiers:", lastErr);
      }
      setQuote(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [fromTokenData, toTokenData, fromAmount]);

  const estimatedOutput = quote ? Number(formatEther(quote.amountOut)) : 0;

  const exchangeRate = useMemo(() => {
    if (!fromTokenData || !toTokenData) return "";
    if (estimatedOutput > 0 && fromAmount > 0) {
      const rate = estimatedOutput / fromAmount;
      return `1 ${fromToken} ≈ ${formatCompactNumber(rate)} ${toToken}`;
    }
    const rate = fromTokenData.price / toTokenData.price;
    return `1 ${fromToken} ≈ ${formatCompactNumber(rate)} ${toToken}`;
  }, [fromToken, toToken, fromTokenData, toTokenData, estimatedOutput, fromAmount]);

  // Price impact from executed rate vs spot rate.
  const priceImpact = (() => {
    if (!quote || fromAmount <= 0 || estimatedOutput <= 0) return 0;
    const vaultSource =
      fromTokenData?.spotPriceX96 || toTokenData?.spotPriceX96;
    if (!vaultSource) return 0;
    const priceBnb = Number(BigInt(vaultSource)) / 1e18;
    if (priceBnb <= 0) return 0;
    const fromIsBaseLeg =
      fromTokenData?.symbol === "WBNB" || fromTokenData?.symbol === "BNB";
    const expected = fromIsBaseLeg
      ? fromAmount / priceBnb
      : fromAmount * priceBnb;
    if (expected <= 0) return 0;
    return Math.abs(1 - estimatedOutput / expected) * 100;
  })();

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

  function handleFlipTokens() {
    if (!fromTokenData && !toTokenData) return;
    const prevFrom = fromToken;
    const prevTo = toToken;
    form.setValue("fromToken", prevTo, { shouldValidate: true });
    form.setValue("toToken", prevFrom, { shouldValidate: true });
    // Carry the estimated output into the new fromAmount when it exists,
    // otherwise blank it so the form gates the submit until the user types.
    if (estimatedOutput > 0) {
      form.setValue("fromAmount", estimatedOutput.toString(), {
        shouldValidate: true,
      });
    } else {
      form.setValue("fromAmount", "", { shouldValidate: true });
    }
  }

  // ExchangeHelper routes against a single vault. One leg has to be the
  // base pair (BNB or WBNB), the other is the vault token.
  const fromIsWbnb = fromTokenData?.symbol === "WBNB";
  const toIsWbnb = toTokenData?.symbol === "WBNB";
  const fromIsBase = fromIsNative || fromIsWbnb;
  const toIsBase = toIsNative || toIsWbnb;
  const vaultSide =
    fromIsBase && !toIsBase
      ? toTokenData
      : !fromIsBase && toIsBase
        ? fromTokenData
        : null;
  const swapMode: SwapMode | null =
    fromIsBase && !toIsBase
      ? fromIsNative
        ? "buyTokens"
        : "buyTokensWETH"
      : !fromIsBase && toIsBase
        ? toIsNative
          ? "sellTokensETH"
          : "sellTokens"
        : null;
  const isUnsupportedPair =
    !!fromTokenData && !!toTokenData && swapMode === null;

  async function onSubmit() {
    if (!fromAddr || !toAddr || !address || !quote) return;
    if (!swapMode || !vaultSide?.vaultAddress || !vaultSide?.poolAddress)
      return;

    if (flowState.step === "success" || flowState.step === "error")
      resetSwap();

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

  // Mirror form + slippage state into the ui-bridge store so the
  // in-process MCP server's `ui__get_swap_state` returns live values,
  // and route `ui__set_swap_form` / `ui__submit_swap` requests back
  // through onSubmit / setSlippage here. Idle when the form isn't
  // mounted (i.e., when the user isn't on /swap).
  useSwapFormUiBridge({
    form,
    slippage,
    customSlippage,
    setSlippage,
    setCustomSlippage,
    flowState,
    onSubmit,
  });

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

  const fromUsd =
    fromTokenData && fromAmount > 0 ? fromAmount * fromTokenData.price : 0;
  const toUsd =
    toTokenData && estimatedOutput > 0
      ? estimatedOutput * toTokenData.price
      : 0;

  const submitLabel = (() => {
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
  })();

  // Compact pre-trade detail row — only renders once a quote exists.
  const showDetails = !!(fromToken && toToken && fromAmount > 0);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-xl flex-col gap-4"
    >
      {/* Card chrome: a single tall plate. Header has the section eyebrow,
       * current slippage chip, and the settings entrypoint. */}
      <section
        className={cn(
          "relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card p-4",
          "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_18px_50px_-24px_rgba(0,0,0,0.75)]",
          // Subtle warm top sheen so the card has presence on the page.
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-32",
          "before:bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(245,200,67,0.08),transparent_70%)]",
        )}
      >
        <header className="flex items-center justify-between gap-2 px-1">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.7)]"
            />
            <span className="eyebrow-strong">Swap</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/40 px-2 py-0.5 font-mono text-mini tabular-nums tracking-tight text-muted-foreground sm:inline-flex">
              <span className="eyebrow text-muted-foreground/60">Slip</span>
              <span className="text-foreground">{activeSlippage}%</span>
            </span>
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
                    <span className="eyebrow-strong">
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
                          variant={
                            slippage === "custom" ? "default" : "outline"
                          }
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
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t("settingsTitle")}
              >
                <Settings className="size-4" />
              </Button>
            </Sheet>
          </div>
        </header>

        {/* From / flip / To stack. The arrow button overlays the gap so the
          * two panels read as a single swap action. */}
        <div className="relative flex flex-col gap-1.5">
          <SwapLeg
            side="from"
            token={fromTokenData}
            picker={
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
                <TokenPill
                  token={fromTokenData}
                  placeholder={t("selectToken")}
                />
              </Sheet>
            }
            value={fromAmountRaw}
            onValueChange={(v) =>
              form.setValue("fromAmount", v, { shouldValidate: true })
            }
            balance={fromTokenData?.balance}
            showMax
            onMax={handleUseMax}
            usd={fromUsd}
            emphasis
            t={t}
          />

          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
            <button
              type="button"
              onClick={handleFlipTokens}
              aria-label={t("flipTokens")}
              className={cn(
                "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-all",
                "shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_4px_12px_-4px_rgba(0,0,0,0.6)]",
                "hover:rotate-180 hover:border-primary/50 hover:text-primary",
              )}
            >
              <ArrowDown className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <SwapLeg
            side="to"
            token={toTokenData}
            picker={
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
                <TokenPill
                  token={toTokenData}
                  placeholder={t("selectToken")}
                />
              </Sheet>
            }
            value={
              estimatedOutput > 0 ? formatCompactNumber(estimatedOutput) : ""
            }
            readOnly
            usd={toUsd}
            t={t}
          />
        </div>

        {/* Pre-trade detail — compact label/value rows in a divided list.
          * Only mounts once both legs are picked and an amount is set. */}
        {showDetails && (
          <dl className="mt-1 flex flex-col divide-y divide-border/40 overflow-hidden rounded-md border border-border/40 bg-background/30 text-sm">
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="eyebrow">{t("exchangeRate")}</dt>
              <dd className="font-mono text-xs tabular-nums text-foreground">
                {exchangeRate}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="eyebrow">{t("priceImpact")}</dt>
              <dd
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-xs tabular-nums",
                  priceImpact > 1
                    ? "text-destructive"
                    : priceImpact > 0.3
                      ? "text-warning"
                      : "text-success",
                )}
              >
                {priceImpact > 1 && (
                  <AlertTriangle className="size-3" strokeWidth={2.5} />
                )}
                {priceImpact.toFixed(2)}%
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="eyebrow">{t("minReceived")}</dt>
              <dd className="font-mono text-xs tabular-nums text-foreground">
                {minReceived > 0
                  ? `${formatCompactNumber(minReceived)} ${toToken}`
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="eyebrow">{t("slippageTolerance")}</dt>
              <dd className="inline-flex items-center gap-2">
                <span className="font-mono text-xs tabular-nums text-foreground">
                  {activeSlippage}%
                </span>
                {mevProtection && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em] text-success">
                    <ShieldCheck className="size-3" />
                    MEV
                  </span>
                )}
              </dd>
            </div>
          </dl>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            !form.formState.isValid || isSwapPending || isUnsupportedPair
          }
          isLoading={isSwapPending}
        >
          {submitLabel}
        </Button>

        <TxFlowStatus
          state={flowState}
          labels={flowLabels}
          onDismiss={resetSwap}
        />
      </section>
    </form>
  );
}
