import Template from "@/components/templates/home";
import { getPageMetadata } from "@/utils/seo";
import { fetchDefaultVault } from "@/utils/exchange";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, { page: "home" }, "/");
}

export default async function Main() {
  const vault = await fetchDefaultVault();

  return <Template initialVault={vault} />;
}
