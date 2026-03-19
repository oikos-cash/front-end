import Template from "@/components/templates/home";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "home" }, "/");
}

export default function Main() {
  return <Template />;
}
