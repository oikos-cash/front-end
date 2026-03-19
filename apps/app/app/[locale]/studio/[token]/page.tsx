import StudioTokenDetailTemplate from "@/components/templates/studio/token-detail";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  return getPageMetadata(
    locale,
    { page: "studioToken", params: { token: token.toUpperCase() } },
    `/studio/${token}`,
  );
}

export default function StudioTokenDetailPage() {
  return <StudioTokenDetailTemplate />;
}
