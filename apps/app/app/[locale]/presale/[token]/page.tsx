import PresaleTemplate from "@/components/templates/presale";
import { getPageMetadata } from "@/utils/seo";
import { fetchVaultByToken } from "@/utils/liquidity";

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

export default async function PresalePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const vault = await fetchVaultByToken(token);

  return <PresaleTemplate initialVault={vault} />;
}
