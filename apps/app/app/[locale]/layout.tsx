// Components
import Header from "@/components/layouts/header";
import SideBar from "@/components/layouts/sidebar";
import Toaster from "@/components/atoms/toaster";
import ErrorBoundary from "@/components/atoms/error-boundary";
import SWRProvider from "@/components/atoms/swr-provider";
import Web3Provider from "@/components/atoms/web3-provider";

// Styles
import "@/styles/globals.css";

// i18n
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

// Types
import type { Metadata } from "next";

// Constants
import { SITE_URL, SITE_NAME, SITE_LOCALE_MAP } from "@/types/constants";

// Fonts — Inter + JetBrains Mono as free substitutes for the GT Standard family
// used on app.oikos.cash. Inter covers UI/body; JetBrains Mono is used for
// numerals, addresses, and any tabular data.
import { Inter, JetBrains_Mono } from "next/font/google";
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  const title = t("site.name");
  const description = t("site.description");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${SITE_URL}/${l}`]),
      ),
    },
    openGraph: {
      siteName: title,
      locale: SITE_LOCALE_MAP[locale] ?? locale,
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => SITE_LOCALE_MAP[l] ?? l),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${mono.variable} antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Web3Provider>
            <SWRProvider>
              <Header />
              <SideBar>
                <ErrorBoundary>{children}</ErrorBoundary>
              </SideBar>
              <Toaster />
            </SWRProvider>
          </Web3Provider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
