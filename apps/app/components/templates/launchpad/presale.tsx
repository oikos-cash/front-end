// Components
import PageHeader from "@/components/molecules/page-header";
import LaunchpadPresaleForm from "@/components/organism/form/launchpad-presale";
import LaunchpadSummary from "@/components/molecules/launchpad/summary";

// Hooks
import { useTranslations } from "next-intl";

export default function LaunchpadPresaleTemplate() {
  const t = useTranslations("launchpad");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("presalePage.title")}
        description={t("presalePage.description")}
        breadcrumbs={[
          { label: t("title"), href: "/launchpad/token" },
          { label: t("stepPresale") },
        ]}
      />
      <LaunchpadPresaleForm />
      <LaunchpadSummary variant="presale" />
    </div>
  );
}
