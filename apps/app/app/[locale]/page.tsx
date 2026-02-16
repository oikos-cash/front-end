import { getTranslations } from "next-intl/server";

export default async function Dashboard() {
  const t = await getTranslations("home");

  return (
    <main>
      <p>{t("title")}</p>
    </main>
  );
}
