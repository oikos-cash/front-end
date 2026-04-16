"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { parseEther, formatEther } from "viem";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useSwap } from "@/hooks/use-swap";
import type { Address } from "viem";

// Types
import type {
  TradeSide,
  SlippageOption,
  TradeFormValues,
  TradeInfoRow,
  FieldItem,
  VaultInfo,
} from "@/types/interfaces";
import { tradeSchema } from "@/types/schemes";

// Components
import Button from "@/components/atoms/button";

// Utils
import { formatCompactNumber } from "@/utils/number";
import { swrFetcher } from "@/utils/fetcher";

// Services
import {
  simulateTrade,
  calculateMinReceived,
  type TradeQuote,
} from "@/services/trade-simulation";

// Constants
import {
  VAULT_API_URL,
  WBNB_ADDRESS,
  QUOTER_V2_ADDRESS,
  DEFAULT_POOL_FEE,
} from "@/types/constants";

/**
 * Manages the full trade panel state:
 * - Buy/sell side toggle with separate styling per mode
 * - Slippage config with preset options + custom input
 * - Real-time trade preview via Quoter V2 simulation
 * - Percentage-based amount shortcuts (25/50/75/100%)
 */
export function useTradePanel() {
  const t = useTranslations("trade");
  const { isConnected, address, balances, handleConnect } = useWallet();

  // Check if backend has vaults
  const { data: vaults, isLoading: isLoadingVaults } = useSWR<VaultInfo[]>(
    `${VAULT_API_URL}/vaults`,
    swrFetcher,
    { errorRetryCount: 0, revalidateOnFocus: false },
  );
  const hasVault = (vaults?.length ?? 0) > 0;
  const vault = vaults?.[0] ?? null;

  // Token addresses for swap
  const tokenIn = vault ? WBNB_ADDRESS : undefined;
  const tokenOut = vault?.token0 as Address | undefined;

  // Swap execution hook
  const {
    execute: executeSwap,
    approve: approveToken,
    needsApproval,
    isPending: isSwapPending,
  } = useSwap(
    address as Address | undefined,
    tokenIn as Address | undefined,
    QUOTER_V2_ADDRESS as Address,
  );

  const [side, setSide] = useState<TradeSide>("buy");
  const [slippage, setSlippage] = useState<SlippageOption>("0.5");
  const [quote, setQuote] = useState<TradeQuote | null>(null);

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

  // Run trade simulation via Quoter V2 when amount or side changes
  useEffect(() => {
    if (!vault || numericAmount <= 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    const tokenIn = side === "buy" ? WBNB_ADDRESS : vault.token0;
    const tokenOut = side === "buy" ? vault.token0 : WBNB_ADDRESS;

    simulateTrade({
      quoterAddress: QUOTER_V2_ADDRESS,
      tokenIn: tokenIn as `0x${string}`,
      tokenOut: tokenOut as `0x${string}`,
      amountIn: parseEther(numericAmount.toString()),
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
  }, [vault, numericAmount, side]);

  const receiving = quote ? Number(formatEther(quote.amountOut)) : 0;
  const priceImpact = quote?.priceImpact ?? 0;
  const minReceived = quote
    ? Number(
        formatEther(
          calculateMinReceived(quote.amountOut, Math.round(slippagePct * 100)),
        ),
      )
    : 0;
  const networkFee = quote
    ? {
        gwei: Number(quote.gasEstimate) / 1e9,
        bnb: Number(quote.gasEstimate) / 1e18,
        usd: 0,
      }
    : { gwei: 0, bnb: 0, usd: 0 };

  const bnbBalance = balances.find((b) => b.token === "BNB");
  const balanceLabel = bnbBalance
    ? `${bnbBalance.amount} BNB`
    : "0.0000 BNB";

  function handleUseMax() {
    if (bnbBalance) {
      form.setValue("amount", bnbBalance.amount, { shouldValidate: true });
    }
  }

  // Percentage shortcuts — compute fraction of wallet balance
  function handlePercentage(pct: number) {
    if (bnbBalance) {
      const value = ((parseFloat(bnbBalance.amount) * pct) / 100).toFixed(4);
      form.setValue("amount", value, { shouldValidate: true });
    }
  }

  function onSubmit(data: TradeFormValues) {
    if (!vault || !address || !quote) return;

    if (needsApproval) {
      approveToken();
      return;
    }

    const swapTokenIn = side === "buy"
      ? (WBNB_ADDRESS as Address)
      : (vault.token0 as Address);
    const swapTokenOut = side === "buy"
      ? (vault.token0 as Address)
      : (WBNB_ADDRESS as Address);

    executeSwap({
      routerAddress: QUOTER_V2_ADDRESS as Address,
      tokenIn: swapTokenIn,
      tokenOut: swapTokenOut,
      fee: DEFAULT_POOL_FEE,
      amountIn: parseEther(data.amount),
      amountOutMinimum: calculateMinReceived(
        quote.amountOut,
        Math.round(slippagePct * 100),
      ),
      recipient: address as Address,
    });
  }

  const tokenSymbol = vault?.tokenSymbol ?? "OKS";

  // Field configs — contain JSX so they can't be defined in constants
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
        <Button
          size="default"
          variant="outline"
          onClick={handleUseMax}
          type="button"
        >
          {t("useMax")}
        </Button>
      ),
    },
  ];

  const slippageField: FieldItem[] =
    slippage === "custom"
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

  // Trade detail rows — shown when the user has entered an amount
  const detailRows: TradeInfoRow[] = [
    {
      label: t("receiving"),
      value: `≈ ${formatCompactNumber(receiving)} ${side === "buy" ? tokenSymbol : "BNB"}`,
    },
    {
      label: t("priceImpact"),
      value: `${priceImpact.toFixed(3)}%`,
      variant: priceImpact > 1 ? "destructive" : "success",
    },
    {
      label: t("minReceived"),
      value: `${formatCompactNumber(minReceived)} ${side === "buy" ? tokenSymbol : "BNB"}`,
    },
  ];

  return {
    t,
    form,
    isConnected,
    handleConnect,
    hasVault,
    isLoadingVaults,
    side,
    setSide,
    slippage,
    setSlippage,
    numericAmount,
    networkFee,
    amountFields,
    slippageField,
    approveField,
    detailRows,
    handlePercentage,
    onSubmit,
    needsApproval,
    isSwapPending,
  };
}
