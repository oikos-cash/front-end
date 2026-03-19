"use client";

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
        if (card.presaleOnly && !store.enablePresale) return null;

        return (
          <Card key={i} title={card.title} description={card.description}>
            <div className="flex flex-col gap-2 text-sm">
              {card.rows.map((row) => (
                <div key={row.key} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  {missingKeys.has(row.key) ? (
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
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
