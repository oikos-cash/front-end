import { getTranslations } from "next-intl/server";

export default async function StakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("stake");

  return (
    <main>
      <h1>{t("title")} - {token}</h1>
    </main>
  );
}
