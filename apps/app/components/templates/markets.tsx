"use client";

// Components
import MarketsCatalog from "@/components/organism/markets-catalog";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { MarketToken } from "@/types/interfaces";

export default function MarketsTemplate({
  initialTokens,
}: {
  initialTokens: MarketToken[];
}) {
  const t = useTranslations("markets");

  return (
    <div className="flex flex-col py-4">
      <h1 className="text-lg font-bold">{t("title")}</h1>
      <MarketsCatalog initialTokens={initialTokens} />
    </div>
  );
}
