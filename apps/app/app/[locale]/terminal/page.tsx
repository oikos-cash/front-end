import TerminalTemplate from "@/components/templates/terminal";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "terminal" }, "/terminal");
}

export default function Page() {
  return <TerminalTemplate />;
}
