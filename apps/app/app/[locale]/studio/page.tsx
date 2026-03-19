import StudioTemplate from "@/components/templates/studio/list";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "studio" }, "/studio");
}

export default function StudioPage() {
  return <StudioTemplate />;
}
