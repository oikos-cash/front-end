import { SidebarProps } from "@/types/interfaces";
import PriceTable from "@/components/organism/price-table";
import WalletPanel from "@/components/organism/wallet-panel";

export default function Sidebar({ children }: SidebarProps) {
  return (
    <div className="flex min-h-[calc(100vh-54px)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-border px-4 lg:sticky lg:top-[54px] lg:h-[calc(100vh-54px)] lg:overflow-y-auto lg:w-72 lg:border-b-0 lg:border-r lg:px-6 xl:w-96">
        <PriceTable />
      </aside>
      <main className="min-w-0 flex-1 px-4 lg:px-6">{children}</main>
      <aside className="w-full shrink-0 border-t border-border px-4 lg:sticky lg:top-[54px] lg:h-[calc(100vh-54px)] lg:overflow-y-auto lg:w-72 lg:border-t-0 lg:border-l lg:px-6 xl:w-96">
        <WalletPanel />
      </aside>
    </div>
  );
}
