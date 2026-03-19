import Template from "@/components/templates/stake";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  return getPageMetadata(
    locale,
    { page: "stake", params: { token: token.toUpperCase() } },
    `/stake/${token}`,
  );
}

export default function Page() {
  return <Template />;
}
