import LaunchpadTokenTemplate from "@/components/templates/launchpad/token";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "launchpadToken" }, "/launchpad/token");
}

export default function LaunchpadTokenPage() {
  return <LaunchpadTokenTemplate />;
}
