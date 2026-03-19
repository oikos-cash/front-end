import DividendsTemplate from "@/components/templates/dividend/list";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "dividends" }, "/dividends");
}

export default function DividendsPage() {
  return <DividendsTemplate />;
}
