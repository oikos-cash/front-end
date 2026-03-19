import LaunchpadSidebar from "@/components/layouts/launchpad-sidebar";

export default function LaunchpadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LaunchpadSidebar>{children}</LaunchpadSidebar>;
}
