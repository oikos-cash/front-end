"use client";

import { useLocale } from "next-intl";

import Button from "@/components/atoms/button";
import Tooltip from "@/components/atoms/tooltip";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Monochrome stylised flag glyphs that inherit the surrounding text colour
 * via `currentColor`. Strokes only — no fills — so the design stays neutral
 * against the dark theme. New locales just need an entry here.
 */
function FlagGlyph({ locale }: { locale: string }) {
  const common = {
    width: 16,
    height: 12,
    viewBox: "0 0 16 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (locale === "es") {
    // Spanish flag: three horizontal bands; the centre band is thicker.
    return (
      <svg {...common}>
        <rect x="0.5" y="0.5" width="15" height="11" rx="1.5" />
        <line x1="0.5" y1="3.5" x2="15.5" y2="3.5" />
        <line x1="0.5" y1="8.5" x2="15.5" y2="8.5" />
      </svg>
    );
  }

  // Default "en" — US-style: stripes with a small canton in the top-left.
  return (
    <svg {...common}>
      <rect x="0.5" y="0.5" width="15" height="11" rx="1.5" />
      <rect x="0.5" y="0.5" width="6" height="5" />
      <line x1="7" y1="3" x2="15.5" y2="3" />
      <line x1="0.5" y1="6" x2="15.5" y2="6" />
      <line x1="0.5" y1="8.5" x2="15.5" y2="8.5" />
    </svg>
  );
}

/**
 * Compact monochrome locale toggle. Renders an outline flag + the current
 * two-letter locale code; clicking cycles to the next locale in routing.
 * Uses next-intl's locale-aware router so the user stays on the same page
 * across the switch.
 */
export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const next =
    routing.locales.find((l) => l !== locale) ?? locale;

  function toggle() {
    router.replace(pathname, { locale: next });
  }

  return (
    <Tooltip content={`Switch to ${next.toUpperCase()}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        aria-label={`Current language: ${locale.toUpperCase()}. Switch to ${next.toUpperCase()}`}
        className="gap-1.5 px-2 font-mono text-mini tracking-[0.08em]"
      >
        <FlagGlyph locale={locale} />
        {locale.toUpperCase()}
      </Button>
    </Tooltip>
  );
}
