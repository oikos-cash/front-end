import LaunchpadPoolTemplate from "@/components/templates/launchpad/pool";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "launchpadPool" }, "/launchpad/pool");
}

export default function LaunchpadPoolPage() {
  return <LaunchpadPoolTemplate />;
}
