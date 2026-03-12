"use client";

// Components
import MarketsCatalog from "@/components/organism/markets-catalog";

// Hooks
import { useTranslations } from "next-intl";

export default function MarketsTemplate() {
  const t = useTranslations("markets");

  return (
    <div className="flex flex-col py-4">
      <h1 className="text-lg font-bold">{t("title")}</h1>
      <MarketsCatalog />
    </div>
  );
}
