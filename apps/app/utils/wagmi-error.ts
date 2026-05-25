/**
 * Surface the real revert reason from wagmi / viem errors.
 *
 * wagmi's `useWriteContract` and `useWaitForTransactionReceipt` hand back
 * a `ContractFunctionExecutionError` whose top-level `.message` reads
 * `The contract function "deployVault" reverted with the following
 * reason:`. The actual reason — be it a custom `error TotalSupplyTooLow`,
 * a `require` string, or a raw bytes payload — lives deeper down the
 * `cause` chain. Sonner only renders one line at a time, so we walk the
 * chain ourselves and produce a single, informative string.
 *
 * Looks for, in order of preference:
 *   1. `cause.data.errorName` + decoded args (custom Solidity errors —
 *      e.g. `TotalSupplyTooLow(minRequired=…, provided=…)`)
 *   2. `cause.reason`            (string passed to `require(…, "…")`)
 *   3. `cause.shortMessage`      (viem's one-liner summary)
 *   4. `error.shortMessage`      (wagmi's surfaced summary)
 *   5. First non-noise line of `error.message`.
 *
 * The walk stops as soon as it finds a useful field and never panics on
 * unknown shapes — anything we can't read falls through to the message
 * tail.
 */

type Unknown = Record<string, unknown> | null | undefined;

function read<T = unknown>(obj: Unknown, key: string): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  return (obj as Record<string, unknown>)[key] as T | undefined;
}

function formatErrorArgs(args: unknown): string | null {
  if (!Array.isArray(args) || args.length === 0) return null;
  return args
    .map((a) => {
      if (typeof a === "bigint") return a.toString();
      if (typeof a === "string") return a;
      if (a == null) return String(a);
      try {
        return JSON.stringify(a, (_, v) =>
          typeof v === "bigint" ? v.toString() : v,
        );
      } catch {
        return String(a);
      }
    })
    .join(", ");
}

/**
 * Walk an Error's `cause` chain (deepest first) and pull the first
 * informative field we encounter.
 */
function walkCause(err: unknown): string | null {
  let node: Unknown = err as Unknown;
  // Cap the depth — viem chains are typically 2–4 deep.
  for (let depth = 0; depth < 8 && node; depth++) {
    const data = read(node, "data") as Unknown;
    const errorName = read<string>(data, "errorName");
    if (errorName) {
      const argsStr = formatErrorArgs(read(data, "args"));
      return argsStr ? `${errorName}(${argsStr})` : errorName;
    }
    const reason = read<string>(node, "reason");
    if (reason) return reason;
    const shortMessage = read<string>(node, "shortMessage");
    if (shortMessage) return shortMessage;
    node = read(node, "cause") as Unknown;
  }
  return null;
}

/**
 * Best-effort first line of a multi-line wagmi error message. Skips the
 * generic "The contract function 'X' reverted …" header so we surface
 * the next meaningful line instead.
 */
function firstUsefulLine(message: string): string {
  const lines = message
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (/^The contract function .* reverted/i.test(line)) continue;
    if (/^Contract Call:/i.test(line)) continue;
    if (/^URL:/i.test(line)) continue;
    if (/^Request Arguments:/i.test(line)) continue;
    if (/^Version:/i.test(line)) continue;
    return line;
  }
  return lines[0] ?? message;
}

/**
 * Public: turn any unknown wagmi/viem error into the most informative
 * one-line string we can produce. Safe to call on `null`/`undefined`.
 */
export function extractRevertReason(err: unknown): string {
  if (!err) return "Unknown error";
  if (err instanceof Error) {
    const fromCause = walkCause(err);
    if (fromCause) return fromCause;
    // Wagmi sometimes lifts shortMessage onto the top-level error.
    const top = read<string>(err as unknown as Unknown, "shortMessage");
    if (top) return top;
    return firstUsefulLine(err.message);
  }
  return String(err);
}
