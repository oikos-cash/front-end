"use client";

// Components
import Banner from "@/components/molecules/banner/cta";
import PriceTable from "@/components/organism/price/table";
import TradePanel from "@/components/organism/trade/panel";
import WalletPanel from "@/components/organism/wallet-panel";

// Hooks
import { usePathname } from "next/navigation";

// Types
import { SidebarProps } from "@/types/interfaces";

export default function Sidebar({ children }: SidebarProps) {
  // Trade panel belongs to the Exchange surface. That's both the locale
  // root (`/en`) and the per-token route (`/en/trade/<symbol>`), which the
  // same Home template renders.
  const pathname = usePathname();
  const isExchange =
    /^\/[^/]+\/?$/.test(pathname) ||
    /^\/[^/]+\/trade(\/|$)/.test(pathname);

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-border/60 bg-sidebar/50 p-4 backdrop-blur-md lg:sticky lg:top-14 lg:h-[calc(100vh-56px)] lg:w-72 lg:overflow-y-auto lg:border-b-0 lg:border-r xl:w-80">
        <PriceTable />
        <Banner namespace="sidebar" href="/swap" />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-6">{children}</main>
      <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-border/60 bg-sidebar/50 p-4 backdrop-blur-md lg:sticky lg:top-14 lg:h-[calc(100vh-56px)] lg:w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l xl:w-80">
        <WalletPanel />
        {isExchange && <TradePanel />}
      </aside>
    </div>
  );
}
