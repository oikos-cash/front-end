/**
 * EIP-191 auth helpers for the NestJS backend AuthGuard.
 *
 * The backend verifies on protected routes:
 * - `x-address`:  lowercased Ethereum address
 * - `x-signature`: EIP-191 personal_sign over `x-message`
 * - `x-message`:   includes a recent timestamp (TTL window enforced server-side)
 *
 * These are pure functions: callers (hooks) sign via wagmi's `useSignMessage`
 * and then build the headers. Keeping signing in React land avoids importing
 * `@wagmi/core` from utility code and keeps SSR safe.
 *
 * @example
 *   const { signMessageAsync } = useSignMessage();
 *   const message = formatAuthMessage(address);
 *   const signature = await signMessageAsync({ message });
 *   const headers = buildAuthHeaders({ address, signature, message });
 *   await saveToken(payload, headers);
 */

/**
 * Format the message string the backend AuthGuard expects.
 * If the backend ever changes the expected format, update this single function.
 */
export function formatAuthMessage(
  address: string,
  timestamp: number = Date.now(),
): string {
  const lower = address.toLowerCase();
  return `Sign this message to authenticate with Oikos services:\n\nAddress: ${lower}\nTimestamp: ${timestamp}`;
}

/**
 * Assemble the three EIP-191 headers from an already-signed message.
 */
export function buildAuthHeaders(args: {
  address: string;
  signature: string;
  message: string;
}): Record<string, string> {
  if (!args.address) {
    throw new Error("Cannot build auth headers without a wallet address");
  }
  return {
    "x-address": args.address.toLowerCase(),
    "x-signature": args.signature,
    "x-message": args.message,
  };
}
