"use client";

// Components
import Button from "@/components/atoms/button";
import Empty from "@/components/atoms/empty";
import StakeFormPanel from "@/components/organism/stake-form-panel";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function StakeTemplate() {
  const t = useTranslations("stake");
  const { isConnected, handleConnect } = useWallet();

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <StakeFormPanel />
    </div>
  );
}
