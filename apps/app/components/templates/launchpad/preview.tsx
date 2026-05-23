"use client";

import { useEffect, useState } from "react";

// Components
import Link from "next/link";
import Card from "@/components/atoms/card";
import Alert from "@/components/atoms/alert";
import PageHeader from "@/components/molecules/page-header";

// Hooks
import { useLaunchpadPreview } from "@/hooks/use-launchpad-preview";

export default function LaunchpadPreviewTemplate() {
  const { t, store, cards, values, missingKeys, missingByKey } =
    useLaunchpadPreview();
  // Zustand's persist middleware only rehydrates on the client, so SSR sees
  // the default (empty) form while the client sees the persisted values.
  // Render store-derived content (missing-key links vs filled values) only
  // after mount so the server/client trees match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("previewPage.title")}
        description={t("previewPage.description")}
        breadcrumbs={[
          { label: t("title"), href: "/launchpad/token" },
          { label: t("stepPreview") },
        ]}
      />

      <Alert
        title={t("deployTitle")}
        description={`${t("deployNotice")} ${t("deploymentFee")}`}
      />

      {cards.map((card, i) => {
        // Until rehydrated, treat the presale-only card as visible (the
        // store default is enablePresale=false, but post-hydration it might
        // flip to true). Render rows with an em-dash placeholder so the
        // SSR markup matches the first client render exactly.
        if (mounted && card.presaleOnly && !store.enablePresale) return null;

        return (
          <Card key={i} title={card.title} description={card.description}>
            <div className="flex flex-col gap-2 text-sm">
              {card.rows.map((row) => (
                <div key={row.key} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  {mounted && missingKeys.has(row.key) ? (
                    <Link
                      href={missingByKey[row.key]!}
                      className="text-destructive hover:underline"
                    >
                      {t("errors.required")}
                    </Link>
                  ) : (
                    <span className="max-w-[60%] truncate text-right font-medium">
                      {mounted ? (values[row.key] ?? "—") : "—"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
