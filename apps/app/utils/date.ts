/**
 * Returns a short month + year string from a given date.
 * Example: "Mar 2026"
 *
 * @param date - The date to format
 * @returns A string in "Mon YYYY" format (e.g. "Mar 2026")
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Returns a human-readable relative time string from a given date.
 * Example: "5s ago", "3m ago", "2h ago", "1d ago"
 *
 * @param date - The past date to compare against the current time
 * @returns A compact relative time string (e.g. "5s ago", "3m ago", "2h ago", "1d ago")
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Formats a duration in milliseconds into a countdown string.
 * Example: "2d 5h 30m 15s"
 *
 * @param ms - Duration in milliseconds
 * @returns A formatted countdown string (e.g. "2d 5h 30m 15s"), or "0d 0h 0m 0s" if ms <= 0
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0d 0h 0m 0s";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Returns true if a cooldown timestamp is still in the future.
 *
 * @param endsAt - Unix timestamp in milliseconds when the cooldown expires, or null if no cooldown
 * @returns True if the cooldown has not yet expired, false otherwise
 */
export function isCooldownActive(endsAt: number | null): boolean {
  if (!endsAt) return false;
  return endsAt > Date.now();
}

/**
 * Formats a cooldown remaining time into a compact string.
 * Example: "2d 5h" or "3h 30m"
 *
 * @param endsAt - Unix timestamp in milliseconds when the cooldown expires, or null if no cooldown
 * @returns A compact remaining time string (e.g. "2d 5h" or "3h 30m"), or empty string if expired or null
 */
export function formatCooldown(endsAt: number | null): string {
  if (!endsAt) return "";
  const diff = endsAt - Date.now();
  if (diff <= 0) return "";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}
