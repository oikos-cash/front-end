import { notFound } from "next/navigation";
import { isTokenBlocked } from "@/utils/token-blocklist";
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

export default async function StudioTokenDetailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (isTokenBlocked({ symbol: token, addresses: [token] })) notFound();
  return <StudioTokenDetailTemplate />;
}
