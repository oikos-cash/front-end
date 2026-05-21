import Template from "@/components/templates/home";
import { getPageMetadata } from "@/utils/seo";
import { fetchDefaultVault } from "@/utils/exchange";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/types/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Use the standard per-page metadata, then override the browser tab title
  // with a branded absolute string ("Oikos — <tagline>") so the home route
  // reads as a proper landing page instead of the generic "Dashboard".
  const base = await getPageMetadata(locale, { page: "home" }, "/");
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    ...base,
    title: { absolute: `${SITE_NAME} — ${t("site.tagline")}` },
  };
}

export default async function Main() {
  const vault = await fetchDefaultVault();

  return <Template initialVault={vault} />;
}
