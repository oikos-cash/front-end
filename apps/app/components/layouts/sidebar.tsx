import { SidebarProps } from "@/types/interfaces";

export default function Sidebar({ children }: SidebarProps) {
  return (
    <div className="flex flex-col gap-3 px-4 lg:flex-row lg:gap-6 lg:px-6">
      <aside className="w-full shrink-0 border-b border-border lg:w-96 lg:border-b-0 lg:border-r bg-red-300">
        <p>left</p>
      </aside>
      <main className="min-w-0 flex-1 bg-yellow-300">{children}</main>
      <aside className="w-full shrink-0 border-t border-border lg:w-96 lg:border-t-0 lg:border-l bg-red-900">
        <p>right</p>
      </aside>
    </div>
  );
}
