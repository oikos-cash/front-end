import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Hooks
import { useTranslations } from "next-intl";

// Types
import { swapSchema } from "@/types/schemes";
import type { SwapFormValues, SwapToken } from "@/types/interfaces";

// Utils
import {
  calculateSwapOutput,
  formatCompactNumber,
  generateMockSwapTokens,
} from "@/utils/number";

/**
 * Manages the entire swap form state:
 * - Token selection with search/filter for both sides
 * - Real-time output estimation based on mock price feeds
 * - Slippage tolerance and MEV protection settings
 * - Derived trade info (exchange rate, price impact, min received)
 */
export function useSwapForm() {
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

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [customSlippage, setCustomSlippage] = useState("");
  const [mevProtection, setMevProtection] = useState(true);

  // Token search state
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [showFromList, setShowFromList] = useState(false);
  const [showToList, setShowToList] = useState(false);

  // Falls back to default 0.5% when custom input is empty or invalid
  const activeSlippage =
    slippage === "custom"
      ? (parseFloat(customSlippage) || 0.5)
      : parseFloat(slippage);

  const fromTokenData = useMemo(
    () => tokens.find((tk) => tk.symbol === fromToken),
    [tokens, fromToken],
  );

  const toTokenData = useMemo(
    () => tokens.find((tk) => tk.symbol === toToken),
    [tokens, toToken],
  );

  // Exclude the opposite selected token to prevent swapping a token for itself
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
    return calculateSwapOutput(fromAmount, fromTokenData.price, toTokenData.price);
  }, [fromAmount, fromTokenData, toTokenData]);

  const exchangeRate = useMemo(() => {
    if (!fromTokenData || !toTokenData) return "";
    const rate = fromTokenData.price / toTokenData.price;
    return `1 ${fromToken} = ${formatCompactNumber(rate)} ${toToken}`;
  }, [fromToken, toToken, fromTokenData, toTokenData]);

  // Simplified impact model — linear with a 5% cap, will be replaced with AMM curve math
  const priceImpact = useMemo(() => {
    if (fromAmount <= 0 || !fromTokenData) return 0;
    return Math.min(fromAmount * 0.001, 5);
  }, [fromAmount, fromTokenData]);

  const minReceived = useMemo(() => {
    return estimatedOutput * (1 - activeSlippage / 100);
  }, [estimatedOutput, activeSlippage]);

  function handleSelectFromToken(tk: SwapToken) {
    form.setValue("fromToken", tk.symbol, { shouldValidate: true });
    setShowFromList(false);
    setFromSearch("");
  }

  function handleSelectToToken(tk: SwapToken) {
    form.setValue("toToken", tk.symbol, { shouldValidate: true });
    setShowToList(false);
    setToSearch("");
  }

  function handleUseMax() {
    if (!fromTokenData) return;
    form.setValue("fromAmount", fromTokenData.balance.toString(), {
      shouldValidate: true,
    });
  }

  function handleSetSlippage(opt: string) {
    setSlippage(opt);
    setCustomSlippage("");
  }

  // Mock submit — will be replaced with actual swap contract call
  async function onSubmit() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    form.reset();
  }

  return {
    t,
    form,
    tokens,
    fromToken,
    toToken,
    fromAmount,

    // Settings
    showSettings,
    setShowSettings,
    slippage,
    handleSetSlippage,
    customSlippage,
    setCustomSlippage,
    mevProtection,
    setMevProtection,
    activeSlippage,

    // Token search
    fromSearch,
    setFromSearch,
    toSearch,
    setToSearch,
    showFromList,
    setShowFromList,
    showToList,
    setShowToList,

    // Resolved token data
    fromTokenData,
    toTokenData,
    filteredFromTokens,
    filteredToTokens,

    // Computed trade info
    estimatedOutput,
    exchangeRate,
    priceImpact,
    minReceived,

    // Handlers
    handleSelectFromToken,
    handleSelectToToken,
    handleUseMax,
    onSubmit,
  };
}
