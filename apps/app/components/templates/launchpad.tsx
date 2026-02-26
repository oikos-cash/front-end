"use client";

// Components
import Button from "@/components/atoms/button";
import Empty from "@/components/atoms/empty";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Icons
import { Lock, Wallet } from "lucide-react";

export default function LaunchpadTemplate() {
  const t = useTranslations("launchpad");
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
    <div className="py-4">
      <h1 className="text-lg font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">Hello World</p>
    </div>
  );
}
