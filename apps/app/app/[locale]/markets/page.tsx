import { getTranslations } from "next-intl/server";

export default async function MarketsPage() {
  const t = await getTranslations("markets");

  return (
    <main>
      <h1>{t("title")}</h1>
    </main>
  );
}
