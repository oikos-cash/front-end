/**
 * Truncates a blockchain address to show the first 6 and last 4 characters.
 * Example: "0x1a2B3c...Ef12"
 */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
