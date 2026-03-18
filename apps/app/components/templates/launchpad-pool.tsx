"use client";

// Components
import PageHeader from "@/components/molecules/page-header";
import LaunchpadPoolForm from "@/components/organism/launchpad-pool-form";

// Hooks
import { useTranslations } from "next-intl";

export default function LaunchpadPoolTemplate() {
  const t = useTranslations("launchpad");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("poolPage.title")}
        description={t("poolPage.description")}
      />
      <LaunchpadPoolForm />
    </div>
  );
}
