import { useMemo } from "react";
import Image from "next/image";

// Components
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";
import { useLaunchpadStore } from "@/stores/launchpad";

// Types
import type { I18nPreviewCard } from "@/types/interfaces";

// Constants
import { PRESALE_DURATION_OPTIONS } from "@/types/constants";

/**
 * Manages launchpad preview page state:
 * - Computes FDV, hard cap, soft cap from store values
 * - Resolves presale duration label from constant options
 * - Builds the values map (key → rendered ReactNode) for all preview rows
 * - Detects missing fields for validation links
 */
export function useLaunchpadPreview() {
  const t = useTranslations("launchpad");
  const store = useLaunchpadStore();

  const cards = t.raw("previewPage.cards") as I18nPreviewCard[];
  const missingFields = store.getMissingFields();
  const missingKeys = new Set(missingFields.map((f) => f.key));
  const missingByKey = Object.fromEntries(
    missingFields.map((f) => [f.key, f.path]),
  );

  // Derived financial values — recalculate when store inputs change
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

  // Maps each preview row key to its rendered value — some are plain text, others JSX
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
    protocol: (() => {
      // Match the live Summary card: small protocol logo + capitalised name.
      const logo =
        store.protocol === "uniswap"
          ? "/uniswap.png"
          : store.protocol === "pancakeswap"
            ? "/pancake.png"
            : null;
      const label =
        store.protocol === "pancakeswap"
          ? "PancakeSwap"
          : store.protocol
            ? store.protocol.charAt(0).toUpperCase() + store.protocol.slice(1)
            : "—";
      return (
        <span className="inline-flex items-center gap-1.5">
          {logo && (
            <Image
              src={logo}
              alt={label}
              width={16}
              height={16}
              className="size-4 shrink-0 rounded-full object-contain"
            />
          )}
          <span>{label}</span>
        </span>
      );
    })(),
    presalePrice: `${store.floorPrice} BNB`,
    hardCap: `${hardCap.toLocaleString()} BNB`,
    softCap: `${softCap.toLocaleString()} BNB (${store.softCapPercent}%)`,
    duration: durationLabel,
  };

  return {
    t,
    store,
    cards,
    values,
    missingKeys,
    missingByKey,
  };
}
