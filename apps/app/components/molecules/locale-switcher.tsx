"use client";

import { useLocale } from "next-intl";
import { Flag } from "lucide-react";

import Button from "@/components/atoms/button";
import Tooltip from "@/components/atoms/tooltip";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

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
        className="gap-1.5 px-2 font-mono text-[11px] tracking-[0.1em]"
      >
        <Flag className="size-3.5" />
        {locale.toUpperCase()}
      </Button>
    </Tooltip>
  );
}
