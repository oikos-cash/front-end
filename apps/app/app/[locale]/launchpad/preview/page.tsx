import LaunchpadPreviewTemplate from "@/components/templates/launchpad/preview";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "launchpadPreview" }, "/launchpad/preview");
}

export default function LaunchpadPreviewPage() {
  return <LaunchpadPreviewTemplate />;
}
