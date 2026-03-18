"use client";

// Components
import PageHeader from "@/components/molecules/page-header";
import LaunchpadTokenForm from "@/components/organism/launchpad-token-form";

// Hooks
import { useTranslations } from "next-intl";

export default function LaunchpadTokenTemplate() {
  const t = useTranslations("launchpad");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("tokenPage.title")}
        description={t("tokenPage.description")}
      />
      <LaunchpadTokenForm />
    </div>
  );
}
