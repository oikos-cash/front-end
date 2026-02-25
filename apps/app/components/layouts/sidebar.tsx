import { SidebarProps } from "@/types/interfaces";
import PriceTable from "@/components/organism/price-table";

export default function Sidebar({ children }: SidebarProps) {
  return (
    <div className="flex min-h-[calc(100vh-54px)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-border px-4 lg:w-96 lg:border-b-0 lg:border-r lg:px-6">
        <PriceTable />
      </aside>
      <main className="min-w-0 flex-1 px-4 lg:px-6">{children}</main>
      <aside className="w-full shrink-0 border-t border-border px-4 lg:w-96 lg:border-t-0 lg:border-l lg:px-6">
        <p>right</p>
      </aside>
    </div>
  );
}
