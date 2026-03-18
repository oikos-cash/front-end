import Link from "next/link";

// Components
import Button from "@/components/atoms/button";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { BannerProps } from "@/types/interfaces";

// Icons
import { ArrowRight } from "lucide-react";

export default function Banner({
  namespace,
  href,
  variant = "default",
}: BannerProps) {
  const t = useTranslations(namespace);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 size-16 rounded-full bg-primary/5 blur-xl" />

      <div className="relative flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{t("title")}</span>
          <span className="text-xs text-muted-foreground">
            {t("description")}
          </span>
        </div>
        <Button variant={variant} size="sm" className="w-full" asChild>
          <Link href={href}>
            {t("label")}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
