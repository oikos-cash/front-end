import { notFound } from "next/navigation";
import { isTokenBlocked } from "@/utils/token-blocklist";
import DividendTokenDetailTemplate from "@/components/templates/dividend/token-detail";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  return getPageMetadata(
    locale,
    { page: "dividendToken", params: { token: token.toUpperCase() } },
    `/dividends/${token}`,
  );
}

export default async function DividendTokenDetailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (isTokenBlocked({ symbol: token, addresses: [token] })) notFound();
  return <DividendTokenDetailTemplate />;
}
