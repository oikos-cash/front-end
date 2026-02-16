import { getTranslations } from "next-intl/server";

export default async function Header() {
  const t = await getTranslations("header");

  return <p>{t("title")}</p>;
}
