"use client";

// Components
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import Empty from "@/components/atoms/empty";
import TokenIcon from "@/components/atoms/token-icon";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function WalletPanel() {
  const t = useTranslations("wallet");
  const { isConnected, balances, totalValue, handleConnect } = useWallet();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold">{t("title")}</h3>

      {isConnected ? (
        <>
          {balances.map((balance) => (
            <div
              key={balance.token}
              className="flex flex-col gap-3 rounded-md border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TokenIcon token={balance.token} iconUrl={balance.iconUrl} />
                  <span className="text-sm font-medium">{balance.token}</span>
                </div>
                <span className="text-sm font-medium">{balance.amount}</span>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {t("wrap")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ≈ {balance.usd}
                </span>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">{t("totalValue")}</span>
            <span className="text-sm font-semibold">{totalValue}</span>
          </div>
        </>
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
