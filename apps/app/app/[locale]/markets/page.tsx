import MarketsTemplate from "@/components/templates/markets";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "markets" }, "/markets");
}

export default function Page() {
  return <MarketsTemplate />;
}
