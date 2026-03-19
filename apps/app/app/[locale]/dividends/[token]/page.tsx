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

export default function DividendTokenDetailPage() {
  return <DividendTokenDetailTemplate />;
}
