import { SidebarProps } from "@/types/interfaces";
import PriceTable from "@/components/organism/price-table";
import TradePanel from "@/components/organism/trade-panel";
import WalletPanel from "@/components/organism/wallet-panel";

export default function Sidebar({ children }: SidebarProps) {
  return (
    <div className="flex min-h-[calc(100vh-54px)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-border lg:sticky lg:top-13.5 lg:h-[calc(100vh-54px)] lg:overflow-y-auto lg:w-72 lg:border-b-0 lg:border-r xl:w-96">
        <PriceTable />
      </aside>
      <main className="min-w-0 flex-1 px-4">{children}</main>
      <aside className="w-full shrink-0 border-t border-border lg:sticky lg:top-13.5 lg:h-[calc(100vh-54px)] lg:overflow-y-auto lg:w-72 lg:border-t-0 lg:border-l xl:w-96">
        <WalletPanel />
        <div className="border-t border-border" />
        <TradePanel />
      </aside>
    </div>
  );
}
