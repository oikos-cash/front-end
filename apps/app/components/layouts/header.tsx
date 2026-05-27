"use client";

// Components
import Link from "next/link";
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";
import Drawer from "@/components/atoms/drawer";
import Accordion from "@/components/atoms/accordion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Skeleton from "@/components/atoms/skeleton";
import LocaleSwitcher from "@/components/molecules/locale-switcher";
import NetworkSelector from "@/components/organism/network-selector";
import WrapUnwrapModal from "@/components/organism/wrap-unwrap-modal";

// Hooks
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useBnbPrice } from "@/hooks/use-bnb-price";

// Icons
import { Menu, Wallet, X, ArrowLeftRight } from "lucide-react";

import { useEffect, useState } from "react";

export default function Header() {
  const [wrapOpen, setWrapOpen] = useState(false);
  // The BNB price is fetched live, so its SSR snapshot (a cached fallback)
  // disagrees with the freshly-fetched client value and trips a hydration
  // warning. Hold the displayed value until after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const t = useTranslations("header");
  const pathname = usePathname();
  const { bnbPrice } = useBnbPrice();

  // Token-scoped routes (Trade / Borrow / Liquidity / Stake / Presale /
  // Dividends / Studio) carry their token slug as the trailing path
  // segment. When the user navigates from one of these via the nav
  // dropdown, swap-in the current slug so e.g. on /trade/dws the
  // "Liquidity" entry routes to /liquidity/dws instead of the hardcoded
  // /liquidity/oks default.
  const TOKEN_SCOPED = [
    "trade",
    "borrow",
    "liquidity",
    "stake",
    "presale",
    "dividends",
    "studio",
  ];
  const currentTokenSlug = (() => {
    // `pathname` is locale-prefixed (e.g. /en/trade/dws). Strip the locale
    // segment, then look for one of the token-scoped routes.
    const parts = pathname.split("/").filter(Boolean);
    // parts[0] = locale, parts[1] = route, parts[2] = token (when scoped).
    if (parts.length >= 3 && TOKEN_SCOPED.includes(parts[1])) return parts[2];
    return "oks";
  })();

  // Stake / Dividends / Studio are hidden from the nav for now — the routes
  // still exist if visited directly. Re-add by uncommenting once they're
  // ready to ship.
  const navItems = [
    { value: "exchange", label: t("nav.exchange"), href: "/" },
    {
      value: "liquidity",
      label: t("nav.liquidity"),
      href: `/liquidity/${currentTokenSlug}`,
    },
    {
      value: "borrow",
      label: t("nav.borrow"),
      href: `/borrow/${currentTokenSlug}`,
    },
    // { value: "stake", label: t("nav.stake"), href: `/stake/${currentTokenSlug}` },
    { value: "markets", label: t("nav.markets"), href: "/markets" },
    // { value: "dividends", label: t("nav.dividends"), href: "/dividends" },
    { value: "launchpad", label: t("nav.launchpad"), href: "/launchpad" },
    // { value: "studio", label: t("nav.studio"), href: "/studio" },
    { value: "terminal", label: t("nav.terminal"), href: "/terminal" },
  ];

  const networkItems = [{ value: "bsc-mainnet", label: t("network") }];

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-[#121117]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#121117]/60 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,200,67,0.25),transparent)]" />
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Link
            target="_blank"
            href="https://oikos.cash/"
            aria-label="Oikos Logo"
            className="text-foreground transition-opacity hover:opacity-80"
          >
            <svg
              width="30"
              height="24"
              viewBox="54 62 92 76"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Oikos"
            >
              <path d="M128.8,136.5c-24.3,0-48.6,0-72.9,0c0-24.3,0-48.6,0-72.9c24.3,0,48.6,0,72.9,0C128.8,87.9,128.8,112.1,128.8,136.5z M63.4,71.1c0,19.3,0,38.6,0,57.9c19.3,0,38.5,0,57.8,0c0-19.3,0-38.6,0-57.9C101.9,71.1,82.7,71.1,63.4,71.1z" />
              <path d="M136.6,63.5c2.5,0,5,0,7.5,0c0,24.3,0,48.5,0,72.8c-2.5,0-4.9,0-7.5,0C136.6,112.1,136.6,87.9,136.6,63.5z" />
            </svg>
          </Link>
          <Badge variant="default" className="font-mono text-2xs uppercase tracking-[0.08em]">{t("beta")}</Badge>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Badge variant="outline" className="font-mono tabular-nums text-mini">
            BNB/USD{" "}
            <span className="ml-1.5 text-foreground" suppressHydrationWarning>
              {mounted ? `$${bnbPrice.toFixed(4)}` : "—"}
            </span>
          </Badge>

          <NetworkSelector />

          <Button variant="ghost" size="icon-xs" onClick={() => setWrapOpen(true)} title="Wrap/Unwrap BNB">
            <ArrowLeftRight className="size-4" />
          </Button>
          <WrapUnwrapModal open={wrapOpen} onOpenChange={setWrapOpen} />

          <LocaleSwitcher />

          <Select
            className="w-37.5"
            items={navItems}
            placeholder={t("nav.exchange")}
          />

          <div className="w-40">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                if (!mounted) {
                  return <Skeleton className="h-9 w-full rounded-md" />;
                }

                if (!account) {
                  return (
                    <Button variant="default" className="w-full" onClick={openConnectModal}>
                      <Wallet className="size-4" />
                      {t("connectWallet")}
                    </Button>
                  );
                }

                return (
                  <Button variant="outline" className="w-full" onClick={openAccountModal}>
                    {chain?.hasIcon && chain.iconUrl && (
                      <img
                        src={chain.iconUrl}
                        alt={chain.name ?? ""}
                        className="size-4 rounded-full"
                      />
                    )}
                    {account.displayName}
                  </Button>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>

        <div className="md:hidden">
          <Drawer
            title=""
            close={
              <Button variant="ghost" size="icon">
                <X className="size-4" />
              </Button>
            }
            content={
              <div className="flex flex-col gap-3">
                <div className="text-center w-full">
                  <Badge variant="outline" className="w-fit">
                    <span suppressHydrationWarning>
                      BNB/USD {mounted ? `$${bnbPrice.toFixed(4)}` : "—"}
                    </span>
                  </Badge>
                </div>
                <Accordion
                  items={[
                    {
                      value: "nav",
                      trigger: t("nav.exchange"),
                      content: (
                        <nav className="flex flex-col gap-1">
                          {navItems.map((item) => (
                            <Link
                              key={item.value}
                              href={item.href}
                              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </nav>
                      ),
                    },
                    {
                      value: "network",
                      trigger: t("network"),
                      content: (
                        <span className="text-sm text-muted-foreground">
                          BNB Chain
                        </span>
                      ),
                    },
                  ]}
                />
                <ConnectButton.Custom>
                  {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                    if (!mounted) {
                      return <Skeleton className="h-9 w-full rounded-md" />;
                    }

                    if (!account) {
                      return (
                        <Button variant="default" className="w-full" onClick={openConnectModal}>
                          <Wallet className="size-4" />
                          {t("connectWallet")}
                        </Button>
                      );
                    }

                    return (
                      <Button variant="outline" className="w-full" onClick={openAccountModal}>
                        {chain?.hasIcon && chain.iconUrl && (
                          <img
                            src={chain.iconUrl}
                            alt={chain.name ?? ""}
                            className="size-4 rounded-full"
                          />
                        )}
                        {account.displayName}
                      </Button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            }
          >
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
            </Button>
          </Drawer>
        </div>
      </div>
    </header>
  );
}
