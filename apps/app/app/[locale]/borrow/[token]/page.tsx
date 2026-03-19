import Template from "@/components/templates/borrow";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  return getPageMetadata(
    locale,
    { page: "borrow", params: { token: token.toUpperCase() } },
    `/borrow/${token}`,
  );
}

export default function Page() {
  return <Template />;
}
