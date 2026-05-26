"use client";

import dynamic from "next/dynamic";

import Empty from "@/components/atoms/empty";
import Button from "@/components/atoms/button";

import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

import { WEBCONTAINER_WS_URL } from "@/types/constants";

import { Lock, ServerOff, Wallet } from "lucide-react";

// TerminalShell imports `@xterm/xterm` which touches `window` at
// module load. Defer it until the browser bundle is hydrated so the
// SSR pass doesn't blow up.
const TerminalShell = dynamic(
  () => import("@/components/organism/terminal-shell"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[min(70vh,640px)] w-full animate-pulse rounded-xl border border-border/60 bg-card/60" />
    ),
  },
);

export default function TerminalTemplate() {
  const t = useTranslations("terminal");
  const { isConnected, handleConnect } = useWallet();

  const configured = !!WEBCONTAINER_WS_URL;

  return (
    <div className="flex flex-col gap-6 py-4">
      <header className="flex flex-col gap-3 px-1">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.65)]"
          />
          <span className="eyebrow-strong">Webcontainer</span>
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
            {t("title")}
          </h1>
          <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <span
          aria-hidden
          className="h-px w-full bg-[linear-gradient(90deg,rgba(245,200,67,0.45)_0%,rgba(245,200,67,0.18)_18%,transparent_55%)]"
        />
      </header>

      {!configured ? (
        <Empty
          className="py-16"
          title={t("notConfiguredTitle")}
          description={t("notConfiguredDescription")}
          icon={<ServerOff className="size-6 text-muted-foreground" />}
        />
      ) : !isConnected ? (
        <Empty
          className="py-16"
          title={t("connectTitle")}
          description={t("connectDescription")}
          icon={<Lock className="size-6 text-muted-foreground" />}
        >
          <Button variant="default" size="sm" onClick={handleConnect}>
            <Wallet className="size-3.5" />
            {t("connectButton")}
          </Button>
        </Empty>
      ) : (
        <TerminalShell command={["node", "./agent-entry-server.mjs"]} />
      )}
    </div>
  );
}
