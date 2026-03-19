// Components
import Empty from "@/components/atoms/empty";

// Hooks
import { useTranslations } from "next-intl";

export default function NotFoundTemplate() {
  const t = useTranslations("notFound");

  return (
    <div className="flex flex-1 items-center justify-center py-20 **:data-[slot=empty-title]:text-7xl **:data-[slot=empty-description]:text-lg">
      <Empty title={"404"} description={t("description")} />
    </div>
  );
}
