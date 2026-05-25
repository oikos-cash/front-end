// Components
import LaunchpadStepHeader from "@/components/molecules/launchpad/step-header";
import LaunchpadPoolForm from "@/components/organism/form/launchpad-pool";

// Hooks
import { useTranslations } from "next-intl";

export default function LaunchpadPoolTemplate() {
  const t = useTranslations("launchpad");

  return (
    <div className="flex flex-col gap-6">
      <LaunchpadStepHeader
        step={2}
        totalSteps={4}
        stepLabel={t("stepPoolSetup")}
        title={t("poolPage.title")}
        description={t("poolPage.description")}
      />
      <LaunchpadPoolForm />
    </div>
  );
}
