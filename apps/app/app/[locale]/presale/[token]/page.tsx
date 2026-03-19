import PresaleTemplate from "@/components/templates/presale";
import { getPageMetadata } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  return getPageMetadata(
    locale,
    { page: "presale", params: { token: token.toUpperCase() } },
    `/presale/${token}`,
  );
}

export default function PresalePage() {
  return <PresaleTemplate />;
}
