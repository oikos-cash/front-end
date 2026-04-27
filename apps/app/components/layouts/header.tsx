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
import NetworkSelector from "@/components/organism/network-selector";
import WrapUnwrapModal from "@/components/organism/wrap-unwrap-modal";

// Hooks
import { useTranslations } from "next-intl";
import { useBnbPrice } from "@/hooks/use-bnb-price";

// Icons
import { Menu, Wallet, X, ArrowLeftRight } from "lucide-react";

import { useState } from "react";

export default function Header() {
  const [wrapOpen, setWrapOpen] = useState(false);
  const t = useTranslations("header");
  const { bnbPrice } = useBnbPrice();

  const navItems = [
    { value: "exchange", label: t("nav.exchange"), href: "/" },
    { value: "liquidity", label: t("nav.liquidity"), href: "/liquidity/oks" },
    { value: "borrow", label: t("nav.borrow"), href: "/borrow/oks" },
    { value: "stake", label: t("nav.stake"), href: "/stake/oks" },
    { value: "markets", label: t("nav.markets"), href: "/markets" },
    { value: "dividends", label: t("nav.dividends"), href: "/dividends" },
    { value: "launchpad", label: t("nav.launchpad"), href: "/launchpad" },
    { value: "studio", label: t("nav.studio"), href: "/studio" },
  ];

  const networkItems = [{ value: "bsc-mainnet", label: t("network") }];

  return (
    <header className="sticky top-0 z-50 h-15 border-b border-border bg-background">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Link
            target="_blank"
            href="https://oikos.cash/"
            aria-label="Oikos Logo"
          >
            <svg
              width="34"
              height="28"
              viewBox="54 62 92 76"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Oikos"
            >
              <path d="M128.8,136.5c-24.3,0-48.6,0-72.9,0c0-24.3,0-48.6,0-72.9c24.3,0,48.6,0,72.9,0C128.8,87.9,128.8,112.1,128.8,136.5z M63.4,71.1c0,19.3,0,38.6,0,57.9c19.3,0,38.5,0,57.8,0c0-19.3,0-38.6,0-57.9C101.9,71.1,82.7,71.1,63.4,71.1z" />
              <path d="M136.6,63.5c2.5,0,5,0,7.5,0c0,24.3,0,48.5,0,72.8c-2.5,0-4.9,0-7.5,0C136.6,112.1,136.6,87.9,136.6,63.5z" />
            </svg>
          </Link>
          <Badge variant="default">{t("beta")}</Badge>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Badge variant="outline">
            BNB/USD ${bnbPrice.toFixed(4)}
          </Badge>

          <NetworkSelector />

          <Button variant="ghost" size="icon-xs" onClick={() => setWrapOpen(true)} title="Wrap/Unwrap BNB">
            <ArrowLeftRight className="size-4" />
          </Button>
          <WrapUnwrapModal open={wrapOpen} onOpenChange={setWrapOpen} />

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
                    BNB/USD ${bnbPrice.toFixed(4)}
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
                          BSC Mainnet
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
