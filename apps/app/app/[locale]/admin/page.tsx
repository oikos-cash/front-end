import AdminTemplate from "@/components/templates/admin";
import { fetchMarketTokens } from "@/utils/markets";
import { fetchVaultServer } from "@/utils/fetcher";
import { SSR_REVALIDATE_DEFAULT } from "@/types/constants";
import { filterBlockedVaults } from "@/utils/token-blocklist";
import type { VaultInfo } from "@/types/interfaces";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "Protocol growth & usage analytics",
  robots: { index: false, follow: false },
};

export default async function Page() {
  // `fetchMarketTokens` already merges vaults + token metadata and swallows
  // its own errors (returns []). We additionally pull the raw vault records
  // for the metrics the merged MarketToken drops (e.g. accrued interest).
  const tokens = await fetchMarketTokens();

  let vaults: VaultInfo[] = [];
  try {
    const raw = await fetchVaultServer<VaultInfo[]>("/vaults", {
      revalidate: SSR_REVALIDATE_DEFAULT,
    });
    vaults = filterBlockedVaults(raw);
  } catch {
    // Backend offline — the dashboard still renders from `tokens` (which
    // may itself be empty) with graceful per-widget empty states.
    vaults = [];
  }

  return <AdminTemplate initialTokens={tokens} initialVaults={vaults} />;
}
