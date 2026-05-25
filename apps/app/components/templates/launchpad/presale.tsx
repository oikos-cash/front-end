// Components
import LaunchpadStepHeader from "@/components/molecules/launchpad/step-header";
import LaunchpadPresaleForm from "@/components/organism/form/launchpad-presale";

// Hooks
import { useTranslations } from "next-intl";

export default function LaunchpadPresaleTemplate() {
  const t = useTranslations("launchpad");

  return (
    <div className="flex flex-col gap-6">
      <LaunchpadStepHeader
        step={3}
        totalSteps={4}
        stepLabel={t("stepPresale")}
        title={t("presalePage.title")}
        description={t("presalePage.description")}
      />
      <LaunchpadPresaleForm />
    </div>
  );
}
