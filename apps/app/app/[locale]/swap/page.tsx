import SwapTemplate from "@/components/templates/swap";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "swap" }, "/swap");
}

export default function Page() {
  return <SwapTemplate />;
}
