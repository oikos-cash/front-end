import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

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
import { VAULT_API_URL } from "@/types/constants";

/**
 * Manages the full trade panel state:
 * - Buy/sell side toggle with separate styling per mode
 * - Slippage config with preset options + custom input
 * - Real-time trade preview (receiving amount, price impact, min received)
 * - Percentage-based amount shortcuts (25/50/75/100%)
 */
export function useTradePanel() {
  const t = useTranslations("trade");
  const { isConnected, balances, handleConnect } = useWallet();

  // Check if backend has vaults
  const { data: vaults } = useSWR<VaultInfo[]>(
    `${VAULT_API_URL}/vaults`,
    swrFetcher,
    { errorRetryCount: 0, revalidateOnFocus: false },
  );
  const hasVault = (vaults?.length ?? 0) > 0;

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

  // TODO: Replace with real simulateTrade() when backend provides vault/router addresses
  const receiving = 0;
  const priceImpact = 0;
  const minReceived = 0;
  const networkFee = { gwei: 0, bnb: 0, usd: 0 };

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
    console.log("Trade:", side, data);
  }

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
  ];

  return {
    t,
    form,
    isConnected,
    handleConnect,
    hasVault,
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
  };
}
