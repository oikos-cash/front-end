// Components
import Header from "@/components/layouts/header";
import SideBar from "@/components/layouts/sidebar";
import Toaster from "@/components/atoms/toaster";
import ErrorBoundary from "@/components/atoms/error-boundary";
import SWRProvider from "@/components/atoms/swr-provider";
import Web3Provider from "@/components/atoms/web3-provider";
import UiMcpProvider from "@/components/atoms/ui-mcp-provider";
import AgentDrawer from "@/components/organism/agent-drawer";
import AgentDrawerChip from "@/components/organism/agent-drawer-chip";
import RoleSelectorModal from "@/components/organism/role-selector-modal";

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

  // Home tab shows a descriptive tagline; per-page tabs keep "{page} | Oikos"
  // via the template (set by each route's own generateMetadata).
  const tagline = t("site.tagline");
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${title} — ${tagline}`,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png" }],
      shortcut: "/favicon.png",
      apple: "/favicon.png",
    },
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
      images: [{ url: "/favicon.png" }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/favicon.png"],
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
              <UiMcpProvider>
                <Header />
                <SideBar>
                  <ErrorBoundary>{children}</ErrorBoundary>
                </SideBar>
                <Toaster />
                <RoleSelectorModal />
                {/* Drawer + chip are siblings of {children}, not wrappers,
                    so they stay mounted across route changes — that's
                    what keeps the WebContainer iframe alive when the
                    agent navigates the user around the app. */}
                <AgentDrawer />
                <AgentDrawerChip />
              </UiMcpProvider>
            </SWRProvider>
          </Web3Provider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
