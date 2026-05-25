// Components
import LaunchpadStepHeader from "@/components/molecules/launchpad/step-header";
import LaunchpadTokenForm from "@/components/organism/form/launchpad-token";

// Hooks
import { useTranslations } from "next-intl";

export default function LaunchpadTokenTemplate() {
  const t = useTranslations("launchpad");

  return (
    <div className="flex flex-col gap-6">
      <LaunchpadStepHeader
        step={1}
        totalSteps={4}
        stepLabel={t("stepTokenInfo")}
        title={t("tokenPage.title")}
        description={t("tokenPage.description")}
      />
      <LaunchpadTokenForm />
    </div>
  );
}
