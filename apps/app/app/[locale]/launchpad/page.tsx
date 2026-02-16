import { getTranslations } from "next-intl/server";

export default async function LaunchpadPage() {
  const t = await getTranslations("launchpad");

  return (
    <main>
      <h1>{t("title")}</h1>
    </main>
  );
}
