"use client";

import { useEffect, useState } from "react";

// Components
import Link from "next/link";
import Alert from "@/components/atoms/alert";
import LaunchpadStepHeader from "@/components/molecules/launchpad/step-header";

// Hooks
import { useLaunchpadPreview } from "@/hooks/use-launchpad-preview";

// Utils
import { cn } from "@/utils/object";

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
      <LaunchpadStepHeader
        step={4}
        totalSteps={4}
        stepLabel={t("stepPreview")}
        title={t("previewPage.title")}
        description={t("previewPage.description")}
      />

      <Alert
        title={t("deployTitle")}
        description={`${t("deployNotice")} ${t("deploymentFee")}`}
      />

      {cards.map((card, i) => {
        if (mounted && card.presaleOnly && !store.enablePresale) return null;

        return (
          <section
            key={i}
            className={cn(
              "relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card/60 p-5",
              "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-16px_rgba(0,0,0,0.55)]",
            )}
          >
            <header className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex items-center justify-center rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-mini font-semibold tabular-nums tracking-tight text-primary ring-1 ring-inset ring-primary/25"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="text-sm font-semibold leading-tight tracking-tight text-foreground">
                  {card.title}
                </h3>
                {card.description && (
                  <p className="text-xs leading-relaxed text-muted-foreground/85">
                    {card.description}
                  </p>
                )}
              </div>
            </header>
            <dl className="flex flex-col divide-y divide-border/40 overflow-hidden rounded-md border border-border/40 bg-background/30 text-sm">
              {card.rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-accent/30"
                >
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 max-w-[65%] truncate text-right">
                    {mounted && missingKeys.has(row.key) ? (
                      <Link
                        href={missingByKey[row.key]!}
                        className="text-xs font-medium text-destructive transition-colors hover:underline"
                      >
                        {t("errors.required")}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {mounted ? (values[row.key] ?? "—") : "—"}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
