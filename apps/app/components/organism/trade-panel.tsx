"use client";

import { useState, useMemo } from "react";

// Components
import Badge from "@/components/atoms/badge";
import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";
import Checkbox from "@/components/atoms/checkbox";
import ButtonGroup from "@/components/atoms/button-group";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Utils
import {
  getMockNetworkFee,
  formatCompactNumber,
  calculatePriceImpact,
  calculateMinReceived,
  calculateReceivingAmount,
} from "@/utils/number";

// Types
import type { TradeSide, SlippageOption } from "@/types/interfaces";

// Icons
import { Lock, Wallet, Settings } from "lucide-react";

const SLIPPAGE_OPTIONS: Exclude<SlippageOption, "custom">[] = [
  "0.1",
  "0.5",
  "1",
];

export default function TradePanel() {
  const t = useTranslations("trade");
  const { isConnected, balances, handleConnect } = useWallet();

  const [side, setSide] = useState<TradeSide>("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState<SlippageOption>("0.5");
  const [customSlippage, setCustomSlippage] = useState("");
  const [useWbnb, setUseWbnb] = useState(false);
  const [approveMax, setApproveMax] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const slippagePct =
    slippage === "custom"
      ? parseFloat(customSlippage) || 0
      : parseFloat(slippage);

  const receiving = useMemo(
    () => calculateReceivingAmount(numericAmount, side),
    [numericAmount, side],
  );
  const priceImpact = useMemo(
    () => calculatePriceImpact(numericAmount, side),
    [numericAmount, side],
  );
  const minReceived = useMemo(
    () => calculateMinReceived(receiving, slippagePct),
    [receiving, slippagePct],
  );
  const networkFee = useMemo(() => getMockNetworkFee(), []);

  const bnbBalance = balances.find((b) => b.token === "BNB");
  const balanceLabel = bnbBalance ? `${bnbBalance.amount} BNB` : "0.0000 BNB";

  function handleUseMax() {
    if (bnbBalance) {
      setAmount(bnbBalance.amount);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        <Badge
          variant={side === "buy" ? "default" : "destructive"}
          className="text-xs"
        >
          {side === "buy" ? t("buying") : t("selling")}
        </Badge>
      </div>

      {isConnected ? (
        <div className="flex flex-col gap-3">
          {/* Buy/Sell Toggle */}
          <ButtonGroup>
            <Button
              size="sm"
              variant={side === "buy" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSide("buy")}
            >
              {t("buy")}
            </Button>
            <Button
              size="sm"
              variant={side === "sell" ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => setSide("sell")}
            >
              {t("sell")}
            </Button>
          </ButtonGroup>

          {/* Amount Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{t("amount")}</span>
              <span className="text-xs text-muted-foreground">
                {t("balance")}: {balanceLabel}
              </span>
            </div>

            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={useWbnb}
                onCheckedChange={(v) => setUseWbnb(v as boolean)}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium">{t("useWbnb")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("useWbnbDescription")}
                </span>
              </div>
            </label>

            <ButtonGroup className="w-full">
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <Button size="default" variant="outline" onClick={handleUseMax}>
                {t("useMax")}
              </Button>
            </ButtonGroup>
          </div>

          {/* Details Card (visible when amount > 0) */}
          {numericAmount > 0 && (
            <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("receiving")}
                </span>
                <span className="text-xs font-medium">
                  ≈ {formatCompactNumber(receiving)}{" "}
                  {side === "buy" ? "OKS" : "BNB"}
                </span>
              </div>
              <div className="border-t border-border/50" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("priceImpact")}
                </span>
                <span className="text-xs font-medium">
                  {priceImpact.toFixed(3)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("minReceived")}
                </span>
                <span className="text-xs font-medium">
                  {formatCompactNumber(minReceived)}{" "}
                  {side === "buy" ? "OKS" : "BNB"}
                </span>
              </div>
            </div>
          )}

          {/* Slippage */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">{t("maxSlippage")}</span>
            <ButtonGroup>
              {SLIPPAGE_OPTIONS.map((opt) => (
                <Button
                  key={opt}
                  size="xs"
                  variant={slippage === opt ? "default" : "outline"}
                  onClick={() => setSlippage(opt)}
                >
                  {opt}%
                </Button>
              ))}
              <Button
                size="xs"
                variant={slippage === "custom" ? "default" : "outline"}
                onClick={() => setSlippage("custom")}
              >
                {t("custom")}
              </Button>
            </ButtonGroup>
            {slippage === "custom" && (
              <input
                type="number"
                step="any"
                min="0"
                max="50"
                value={customSlippage}
                onChange={(e) => setCustomSlippage(e.target.value)}
                placeholder="0.00%"
                className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            )}
          </div>

          {/* Network Fee */}
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

          {/* Approve Max */}
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={approveMax}
              onCheckedChange={(v) => setApproveMax(v as boolean)}
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium">{t("approveMax")}</span>
              <span className="text-xs text-muted-foreground">
                {t("approveMaxDescription")}
              </span>
            </div>
          </label>

          {/* CTA */}
          <Button
            variant={side === "buy" ? "default" : "destructive"}
            className="w-full"
            disabled={numericAmount <= 0}
          >
            {side === "buy" ? t("buyOks") : t("sellOks")}
          </Button>
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
    </div>
  );
}
