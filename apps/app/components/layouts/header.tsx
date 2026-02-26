"use client";

// Components
import Link from "next/link";
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";
import Drawer from "@/components/atoms/drawer";
import Accordion from "@/components/atoms/accordion";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Icons
import { Menu, Wallet, X } from "lucide-react";

export default function Header() {
  const t = useTranslations("header");
  const { isConnected, address, handleConnect, handleDisconnect } = useWallet();

  const navItems = [
    { value: "exchange", label: t("nav.exchange"), href: "/" },
    { value: "liquidity", label: t("nav.liquidity"), href: "/liquidity/oks" },
    { value: "borrow", label: t("nav.borrow"), href: "/borrow/bnb" },
    { value: "stake", label: t("nav.stake"), href: "/stake/bnb" },
    { value: "markets", label: t("nav.markets"), href: "/markets" },
    { value: "launchpad", label: t("nav.launchpad"), href: "/launchpad" },
  ];

  const networkItems = [{ value: "bsc-mainnet", label: t("network") }];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-2 lg:px-6">
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

      {/* Desktop */}
      <div className="hidden items-center gap-3 md:flex">
        <Badge variant="outline">
          BNB/USD $630.0900 <span className="text-success">+7.19%</span>
        </Badge>

        <Select
          className="w-37.5"
          items={networkItems}
          placeholder={t("network")}
        />

        <Select
          className="w-37.5"
          items={navItems}
          placeholder={t("nav.exchange")}
        />

        {isConnected ? (
          <Button variant="outline" onClick={handleDisconnect}>
            <Wallet className="size-4" />
            {address}
          </Button>
        ) : (
          <Button variant="default" onClick={handleConnect}>
            <Wallet className="size-4" />
            {t("connectWallet")}
          </Button>
        )}
      </div>

      {/* Mobile */}
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
                  BNB/USD $630.0900 <span className="text-success">+7.19%</span>
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
              {isConnected ? (
                <Button variant="outline" className="w-full" onClick={handleDisconnect}>
                  <Wallet className="size-4" />
                  {address}
                </Button>
              ) : (
                <Button variant="default" className="w-full" onClick={handleConnect}>
                  <Wallet className="size-4" />
                  {t("connectWallet")}
                </Button>
              )}
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
