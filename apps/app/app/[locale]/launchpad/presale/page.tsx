import LaunchpadPresaleTemplate from "@/components/templates/launchpad/presale";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(
    locale,
    { page: "launchpadPresale" },
    "/launchpad/presale",
  );
}

export default function LaunchpadPresalePage() {
  return <LaunchpadPresaleTemplate />;
}
