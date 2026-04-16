import Template from "@/components/templates/stake";
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
    { page: "stake", params: { token: token.toUpperCase() } },
    `/stake/${token}`,
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const vault = await fetchVaultByToken(token);

  return <Template initialVault={vault} />;
}
