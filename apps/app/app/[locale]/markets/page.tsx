import MarketsTemplate from "@/components/templates/markets";
import { getPageMetadata } from "@/utils/seo";
import { fetchMarketTokens } from "@/utils/markets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "markets" }, "/markets");
}

export default async function Page() {
  const tokens = await fetchMarketTokens();

  return <MarketsTemplate initialTokens={tokens} />;
}
