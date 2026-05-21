"use client";

import { useState } from "react";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
import Empty from "@/components/atoms/empty";
import Avatar from "@/components/atoms/avatar";
import Button from "@/components/atoms/button";
import WrapUnwrapModal from "@/components/organism/wrap-unwrap-modal";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Icons
import { Lock, Wallet } from "lucide-react";

function BalanceSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-10 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-5 w-12 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WalletPanel() {
  const t = useTranslations("wallet");
  const { isConnected, isBalancesLoading, balances, totalValue, handleConnect } =
    useWallet();

  const [wrapOpen, setWrapOpen] = useState(false);
  const [wrapMode, setWrapMode] = useState<"wrap" | "unwrap">("wrap");
  function openWrap(mode: "wrap" | "unwrap") {
    setWrapMode(mode);
    setWrapOpen(true);
  }

  return (
    <Card
      title={t("title")}
      description={t("description")}
      footer={
        isConnected && (
          <div className="flex w-full items-center justify-between">
            <span className="text-sm font-medium">{t("totalValue")}</span>
            <span className="text-sm font-semibold">
              {isBalancesLoading ? (
                <span className="inline-block h-4 w-14 animate-pulse rounded bg-muted" />
              ) : (
                totalValue
              )}
            </span>
          </div>
        )
      }
    >
      {isConnected ? (
        isBalancesLoading ? (
          <BalanceSkeleton />
        ) : (
          <div className="flex flex-col gap-3">
            {balances.map((balance) => (
              <div
                key={balance.token}
                className="flex flex-col gap-2 rounded-md border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={balance.token} src={balance.iconUrl} />
                    <span className="text-sm font-medium">
                      {balance.token}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{balance.amount}</span>
                </div>

                <div className="flex items-center justify-between">
                  {balance.token === "BNB" ? (
                    <button
                      type="button"
                      onClick={() => openWrap("wrap")}
                      className="text-xs"
                    >
                      <Badge
                        variant="outline"
                        className="cursor-pointer text-xs transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                      >
                        {t("wrap")}
                      </Badge>
                    </button>
                  ) : balance.token === "WBNB" ? (
                    <button
                      type="button"
                      onClick={() => openWrap("unwrap")}
                      className="text-xs"
                    >
                      <Badge
                        variant="outline"
                        className="cursor-pointer text-xs transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                      >
                        {t("unwrap")}
                      </Badge>
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-foreground">
                    ≈ {balance.usd}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
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

      <WrapUnwrapModal
        open={wrapOpen}
        onOpenChange={setWrapOpen}
        defaultMode={wrapMode}
      />
    </Card>
  );
}
