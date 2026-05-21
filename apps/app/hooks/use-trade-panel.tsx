"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { parseEther, formatEther, maxUint256 } from "viem";
import { toast } from "sonner";

// Hooks
import { useTranslations } from "next-intl";
import { useGasPrice } from "wagmi";
import { useWallet } from "@/stores/wallet";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useSwap, type SwapMode } from "@/hooks/use-swap";
import type { Address } from "viem";
import type { TxFlowStep } from "@/hooks/types/tx-flow";

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
  EXCHANGE_HELPER_ADDRESS,
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
  const { isConnected, address, balances, tokenBalances, handleConnect } =
    useWallet();
  const { data: networkGasPriceWei } = useGasPrice();
  const { bnbPrice } = useBnbPrice();

  // null = follow the network gas price; a positive number means the user has
  // overridden gas price via the Network Fee modal, value in *gwei*.
  const [gasOverrideGwei, setGasOverrideGwei] = useState<number | null>(null);
  const effectiveGasPriceWei = gasOverrideGwei != null
    ? BigInt(Math.round(gasOverrideGwei * 1e9))
    : networkGasPriceWei;

  // Check if backend has vaults
  const { data: vaults, isLoading: isLoadingVaults } = useSWR<VaultInfo[]>(
    `${VAULT_API_URL}/vaults`,
    swrFetcher,
    { errorRetryCount: 0, revalidateOnFocus: false },
  );
  const hasVault = (vaults?.length ?? 0) > 0;
  const vault = vaults?.[0] ?? null;

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
  const useWbnb = form.watch("useWbnb");
  const numericAmount = parseFloat(amount) || 0;

  // Source token for allowance checks. Native BNB never needs approval, so
  // pass undefined in that case (buy side without "Use WBNB").
  const swapTokenIn = vault
    ? side === "buy"
      ? useWbnb
        ? (WBNB_ADDRESS as Address)
        : undefined
      : (vault.token0 as Address)
    : undefined;
  const amountInWei = numericAmount > 0
    ? parseEther(numericAmount.toString())
    : undefined;

  // Swap execution hook (chained approve→execute via submit())
  const {
    submit: submitSwap,
    reset: resetSwap,
    needsApproval,
    isPending: isSwapPending,
    flowState,
  } = useSwap(
    address as Address | undefined,
    swapTokenIn,
    EXCHANGE_HELPER_ADDRESS,
    amountInWei,
  );

  // Emit toasts on terminal events.
  const toastedStepRef = useRef<TxFlowStep | null>(null);
  useEffect(() => {
    if (toastedStepRef.current === flowState.step) return;
    toastedStepRef.current = flowState.step;
    if (flowState.step === "success" && flowState.actionTxHash) {
      const hash = flowState.actionTxHash;
      toast.success(t("toastTradeSuccess"), {
        action: {
          label: t("viewTx"),
          onClick: () => window.open(`https://bscscan.com/tx/${hash}`, "_blank"),
        },
      });
      form.reset({ amount: "", customSlippage: "", useWbnb: false, approveMax: false });
    } else if (flowState.step === "error" && flowState.errorMessage) {
      toast.error(flowState.errorMessage);
    }
  }, [flowState, t, form]);

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
  // gasEstimate from QuoterV2 is in gas *units* (≈150k), not wei. To turn it
  // into a fee we need the current network gas price (wei per gas unit).
  //   fee_wei = gasEstimate × gasPrice
  //   fee_bnb = fee_wei / 1e18
  //   fee_usd = fee_bnb × bnbPrice
  // The previous code divided gasEstimate alone by 1e9/1e18, which always
  // rounded to 0.00 in the UI.
  const networkFee = (() => {
    if (!quote || !effectiveGasPriceWei || effectiveGasPriceWei === 0n) {
      return { gwei: 0, bnb: 0, usd: 0, isOverride: gasOverrideGwei != null };
    }
    const feeWei = quote.gasEstimate * effectiveGasPriceWei;
    const bnb = Number(feeWei) / 1e18;
    return {
      gwei: Number(effectiveGasPriceWei) / 1e9,
      bnb,
      usd: bnb * bnbPrice,
      isOverride: gasOverrideGwei != null,
    };
  })();

  const tokenSymbol = vault?.tokenSymbol ?? "OKS";

  // Source token follows the trade side: BNB on buy, the pair's token0 on sell.
  const sourceBalance = (() => {
    if (side === "buy") {
      const bnb = balances.find((b) => b.token === "BNB");
      return { amount: bnb?.amount ?? "0", symbol: "BNB" };
    }
    const raw = vault?.token0
      ? tokenBalances[vault.token0.toLowerCase()] ?? "0"
      : "0";
    return { amount: raw, symbol: tokenSymbol };
  })();
  const sourceAmount = parseFloat(sourceBalance.amount) || 0;
  const balanceLabel = `${sourceAmount.toFixed(4)} ${sourceBalance.symbol}`;

  // When paying with native BNB, the user also needs BNB left over to cover
  // gas. Reserve the estimated network fee with a 1.5× buffer so a small
  // gas-price spike between Use Max and submit doesn't make the swap fail.
  // Falls back to a sensible minimum (0.0005 BNB ≈ a few txs at BSC prices)
  // before a quote arrives.
  const isNativeBnb = side === "buy" && !useWbnb;
  const gasReserveBnb = isNativeBnb
    ? Math.max(networkFee.bnb * 1.5, 0.0005)
    : 0;
  const spendableAmount = Math.max(sourceAmount - gasReserveBnb, 0);

  function handleUseMax() {
    if (spendableAmount > 0) {
      form.setValue("amount", spendableAmount.toString(), {
        shouldValidate: true,
      });
    }
  }

  // Percentage shortcuts — compute fraction of the spendable balance (i.e.
  // after the gas reserve), so 100% still leaves room for gas.
  function handlePercentage(pct: number) {
    if (spendableAmount > 0) {
      const value = ((spendableAmount * pct) / 100).toFixed(4);
      form.setValue("amount", value, { shouldValidate: true });
    }
  }

  function onSubmit(data: TradeFormValues) {
    if (!vault || !address || !quote) return;

    // Reset prior terminal state so the new attempt starts clean.
    if (flowState.step === "success" || flowState.step === "error") resetSwap();

    const amountIn = parseEther(data.amount);
    const slippageBps = Math.round(slippagePct * 100);

    const mode: SwapMode = data.useWbnb
      ? side === "buy"
        ? "buyTokensWETH"
        : "sellTokens"
      : side === "buy"
        ? "buyTokens"
        : "sellTokensETH";

    submitSwap(
      {
        mode,
        routerAddress: EXCHANGE_HELPER_ADDRESS,
        vaultAddress: vault.address as Address,
        pool: vault.poolAddress as Address,
        price: BigInt(vault.spotPriceX96 || "0"),
        amount: amountIn,
        minAmount: calculateMinReceived(quote.amountOut, slippageBps),
        receiver: address as Address,
        slippageBps,
        // Only forward the gas price when the user has explicitly overridden
        // it. Passing undefined lets wagmi fetch the network price itself.
        ...(gasOverrideGwei != null && effectiveGasPriceWei
          ? { gasPrice: effectiveGasPriceWei }
          : {}),
      },
      data.approveMax ? maxUint256 : amountIn,
    );
  }

  // Field configs — contain JSX so they can't be defined in constants
  const amountFields: FieldItem[] = [
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

  function setUseWbnb(value: boolean) {
    form.setValue("useWbnb", value, { shouldDirty: true, shouldValidate: true });
  }

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
    useWbnb,
    setUseWbnb,
    numericAmount,
    networkFee,
    networkGasGwei:
      networkGasPriceWei && networkGasPriceWei > 0n
        ? Number(networkGasPriceWei) / 1e9
        : 0,
    gasOverrideGwei,
    setGasOverrideGwei,
    amountFields,
    slippageField,
    approveField,
    detailRows,
    handlePercentage,
    onSubmit,
    needsApproval,
    isSwapPending,
    flowState,
    resetSwap,
    tokenSymbol,
  };
}
