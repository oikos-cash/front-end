import { fetchVaultServer } from "@/utils/fetcher";
import { SSR_REVALIDATE_DEFAULT } from "@/types/constants";
import { filterBlockedVaults } from "@/utils/token-blocklist";
import type { VaultInfo } from "@/types/interfaces";

/**
 * Fetch vault data by token symbol for the Liquidity page (SSR).
 * Tries to find the vault that matches the token slug from the URL.
 */
export async function fetchVaultByToken(
  tokenSlug: string,
): Promise<VaultInfo | null> {
  try {
    const rawVaults = await fetchVaultServer<VaultInfo[]>("/vaults", {
      revalidate: SSR_REVALIDATE_DEFAULT,
    });
    const vaults = filterBlockedVaults(rawVaults);

    const slug = tokenSlug.toLowerCase();
    return (
      vaults.find(
        (v) =>
          v.tokenSymbol.toLowerCase() === slug ||
          v.address.toLowerCase() === slug,
      ) ?? null
    );
  } catch {
    return null;
  }
}
