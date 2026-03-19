import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL, STATIC_ROUTES } from "@/types/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = `${SITE_URL}/${locale}${route === "/" ? "" : route}`;
    }

    entries.push({
      url: `${SITE_URL}/${routing.defaultLocale}${route === "/" ? "" : route}`,
      lastModified: new Date(),
      changeFrequency: route === "/" ? "daily" : "weekly",
      priority: route === "/" ? 1.0 : 0.8,
      alternates: { languages },
    });
  }

  return entries;
}
