"use client";

// Components
import Link from "next/link";
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { Wallet } from "lucide-react";

export default function Header() {
  const t = useTranslations("header");

  const navItems = [
    { value: "exchange", label: t("nav.exchange"), href: "/" },
    { value: "liquidity", label: t("nav.liquidity"), href: "/liquidity/bnb" },
    { value: "borrow", label: t("nav.borrow"), href: "/borrow/bnb" },
    { value: "stake", label: t("nav.stake"), href: "/stake/bnb" },
    { value: "markets", label: t("nav.markets"), href: "/markets" },
    { value: "launchpad", label: t("nav.launchpad"), href: "/launchpad" },
  ];

  const networkItems = [{ value: "bsc-mainnet", label: t("network") }];

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-2">
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

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="hidden sm:inline-flex">
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

        <Button variant="default">
          <Wallet className="size-4" />
          {t("connectWallet")}
        </Button>
      </div>
    </header>
  );
}
