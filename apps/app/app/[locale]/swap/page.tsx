import SwapTemplate from "@/components/templates/swap";
import { getPageMetadata } from "@/utils/seo";
import { fetchSwapTokens } from "@/utils/swap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "swap" }, "/swap");
}

export default async function Page() {
  const tokens = await fetchSwapTokens();

  return <SwapTemplate initialTokens={tokens} />;
}
