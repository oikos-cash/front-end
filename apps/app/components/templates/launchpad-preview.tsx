"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

// Components
import Card from "@/components/atoms/card";
import Alert from "@/components/atoms/alert";
import Badge from "@/components/atoms/badge";
import PageHeader from "@/components/molecules/page-header";

// Hooks
import { useTranslations } from "next-intl";
import { useLaunchpadStore } from "@/stores/launchpad";

// Types
import type { I18nPreviewCard } from "@/types/interfaces";
import { PRESALE_DURATION_OPTIONS } from "@/types/constants";

export default function LaunchpadPreviewTemplate() {
  const t = useTranslations("launchpad");
  const store = useLaunchpadStore();

  const cards = t.raw("previewPage.cards") as I18nPreviewCard[];
  const missingFields = store.getMissingFields();
  const missingKeys = new Set(missingFields.map((f) => f.key));
  const missingByKey = Object.fromEntries(missingFields.map((f) => [f.key, f.path]));

  const fdv = useMemo(() => {
    const price = parseFloat(store.floorPrice) || 0;
    const supply = parseFloat(store.totalSupply) || 0;
    return price * supply;
  }, [store.floorPrice, store.totalSupply]);

  const hardCap = useMemo(() => fdv * 0.1, [fdv]);
  const softCap = useMemo(
    () => hardCap * (store.softCapPercent / 100),
    [hardCap, store.softCapPercent],
  );

  const durationLabel = useMemo(() => {
    const option = PRESALE_DURATION_OPTIONS.find(
      (o) => o.value === store.presaleDuration,
    );
    return option?.label ?? store.presaleDuration;
  }, [store.presaleDuration]);

  const values: Record<string, React.ReactNode> = {
    tokenName: store.tokenName,
    tokenSymbol: store.tokenSymbol,
    tokenDecimals: store.tokenDecimals,
    tokenDescription: store.tokenDescription || t("noDescription"),
    tokenLogoUrl: store.tokenLogoUrl ? (
      <Image
        src={store.tokenLogoUrl}
        alt="Logo"
        width={32}
        height={32}
        className="rounded"
      />
    ) : (
      t("noLogo")
    ),
    enablePresale: (
      <Badge variant={store.enablePresale ? "default" : "secondary"}>
        {store.enablePresale ? t("enabled") : t("disabled")}
      </Badge>
    ),
    totalSupply: parseFloat(store.totalSupply || "0").toLocaleString(),
    floorPrice: `${store.floorPrice} BNB`,
    reserveAsset: store.reserveAsset.toUpperCase(),
    fdv: `${fdv.toLocaleString()} BNB`,
    protocol: store.protocol,
    presalePrice: `${store.floorPrice} BNB`,
    hardCap: `${hardCap.toLocaleString()} BNB`,
    softCap: `${softCap.toLocaleString()} BNB (${store.softCapPercent}%)`,
    duration: durationLabel,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("previewPage.title")}
        description={t("previewPage.description")}
      />

      <Alert
        title={t("deployTitle")}
        description={`${t("deployNotice")} ${t("deploymentFee")}`}
      />

      {cards.map((card, i) => {
        if (card.presaleOnly && !store.enablePresale) return null;

        return (
          <Card key={i} title={card.title} description={card.description}>
            <div className="flex flex-col gap-2 text-sm">
              {card.rows.map((row) => {
                const isMissing = missingKeys.has(row.key);

                return (
                  <div key={row.key} className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    {isMissing ? (
                      <Link
                        href={missingByKey[row.key]!}
                        className="text-destructive hover:underline"
                      >
                        {t("errors.required")}
                      </Link>
                    ) : (
                      <span className="max-w-[60%] truncate text-right font-medium">
                        {values[row.key] ?? "—"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
