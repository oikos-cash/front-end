"use client";

// Components
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import Empty from "@/components/atoms/empty";
import TokenIcon from "@/components/atoms/token-icon";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { Lock, Wallet } from "lucide-react";

// Mock: change to true to simulate connected wallet
const isConnected = false;

const mockBalance = {
  token: "BNB",
  iconUrl:
    "https://assets-cdn.trustwallet.com/blockchains/binance/info/logo.png",
  amount: "0.0000",
  usd: "$0.00",
  totalValue: "$0.00",
};

export default function WalletPanel() {
  const t = useTranslations("wallet");

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold">{t("title")}</h3>

      {isConnected ? (
        <>
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TokenIcon
                  token={mockBalance.token}
                  iconUrl={mockBalance.iconUrl}
                />
                <span className="text-sm font-medium">{mockBalance.token}</span>
              </div>
              <span className="text-sm font-medium">{mockBalance.amount}</span>
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {t("wrap")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ≈ {mockBalance.usd}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">{t("totalValue")}</span>
            <span className="text-sm font-semibold">
              {mockBalance.totalValue}
            </span>
          </div>
        </>
      ) : (
        <Empty
          title={t("connectTitle")}
          description={t("connectDescription")}
          icon={<Lock className="size-6 text-muted-foreground" />}
        >
          <Button variant="default" size="sm">
            <Wallet className="size-3.5" />
            {t("connectButton")}
          </Button>
        </Empty>
      )}
    </div>
  );
}
