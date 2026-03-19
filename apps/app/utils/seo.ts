import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { PageSeoConfig } from "@/types/interfaces";
import {
  SITE_URL,
  SITE_NAME,
  SITE_LOCALE_MAP,
  OG_IMAGE_SIZE,
} from "@/types/constants";

export async function getPageMetadata(
  locale: string,
  config: PageSeoConfig,
  path: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "seo" });
  const { page, params } = config;

  const title = t(page + ".title", params);
  const description = t(page + ".description", params);
  const siteName = t("site.name");

  const canonical = `${SITE_URL}/${locale}${path === "/" ? "" : path}`;

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${SITE_URL}/${loc}${path === "/" ? "" : path}`;
  }
  languages["x-default"] = `${SITE_URL}/${routing.defaultLocale}${path === "/" ? "" : path}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      siteName,
      url: canonical,
      locale: SITE_LOCALE_MAP[locale] ?? locale,
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => SITE_LOCALE_MAP[l] ?? l),
      type: "website",
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          ...OG_IMAGE_SIZE,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}
