// Pure derivations for the protocol admin / analytics dashboard.
//
// Everything here is a deterministic transform over data the app already
// knows how to fetch (`MarketToken[]` from `fetchMarketTokens`, `VaultInfo[]`
// from `/vaults`, `LoanEvent[]` from `services/loan`). No I/O, no React — so
// these are trivially unit-testable and safe to run on the server.

import type {
  MarketToken,
  VaultInfo,
  LoanEvent,
  TokenStatus,
} from "@/types/interfaces";

// =================================================
//                    TYPES
// =================================================

/** Protocol-wide snapshot aggregates, derived from the vault/token list. */
export interface ProtocolKpis {
  /** Number of launched tokens (vaults). */
  totalTokens: number;
  /** How many have graduated to a full AMM. */
  graduated: number;
  /** How many are still in presale. */
  inPresale: number;
  /** Σ market cap across all tokens, denominated in BNB. */
  totalMarketCapBnb: number;
  /** Σ market cap across all tokens, in USD (needs the live BNB price). */
  totalMarketCapUsd: number;
  /** Σ circulating supply across all tokens (token units — informational). */
  totalCirculating: number;
  /** Σ accrued loan interest across vaults (raw units from the indexer). */
  totalInterestBnb: number;
  /** Most recent token launch we have a date for. */
  newestCreatedAt?: Date;
}

/** One point on the cumulative-launches growth curve. */
export interface LaunchPoint {
  date: Date;
  /** Cumulative number of tokens launched up to and including `date`. */
  cumulative: number;
}

/** One bar of the "market cap by token" chart. */
export interface MarketCapBar {
  symbol: string;
  name: string;
  /** Market cap in USD. */
  valueUsd: number;
}

/** One slice of the status-distribution donut. */
export interface StatusSlice {
  status: TokenStatus;
  label: string;
  count: number;
  /** CSS colour token, e.g. "var(--chart-1)". */
  color: string;
}

/** One day of loan activity, split by event type. */
export interface LoanActivityDay {
  /** Start-of-day (UTC) for this bucket. */
  date: Date;
  borrow: number;
  payback: number;
  roll: number;
}

/** Loan aggregates derived from a recent-events window. */
export interface LoanAggregates {
  borrows: number;
  paybacks: number;
  rolls: number;
  defaults: number;
  /** Σ borrowed amount over the window, in BNB. */
  totalBorrowedBnb: number;
  /** Distinct borrower addresses seen in the window. */
  uniqueBorrowers: number;
}

// =================================================
//                  CONSTANTS
// =================================================

/** Human labels + palette for each token status (donut + badges). */
export const STATUS_META: Record<
  TokenStatus,
  { label: string; color: string }
> = {
  graduated: { label: "Graduated", color: "var(--chart-3)" },
  inProgress: { label: "In Progress", color: "var(--chart-1)" },
  finalized: { label: "Finalized", color: "var(--chart-2)" },
  preparing: { label: "Preparing", color: "var(--chart-5)" },
};

/** Palette for loan event types (activity chart). */
export const LOAN_TYPE_COLOR = {
  borrow: "var(--chart-1)",
  payback: "var(--chart-3)",
  roll: "var(--chart-2)",
} as const;

const WEI = 1e18;

// =================================================
//                  DERIVATIONS
// =================================================

/**
 * Roll a token list + raw vault list up into the headline KPI figures.
 * `bnbPriceUsd` converts the BNB-denominated market caps to USD; pass 0
 * to leave the USD figure at 0 until the price is known.
 */
export function deriveKpis(
  tokens: MarketToken[],
  vaults: VaultInfo[],
  bnbPriceUsd: number,
): ProtocolKpis {
  let totalMarketCapBnb = 0;
  let totalCirculating = 0;
  let graduated = 0;
  let inPresale = 0;
  let newest: Date | undefined;

  for (const t of tokens) {
    if (t.marketCap && Number.isFinite(t.marketCap)) totalMarketCapBnb += t.marketCap;
    if (t.circulatingSupply && Number.isFinite(t.circulatingSupply))
      totalCirculating += t.circulatingSupply;
    if (t.status === "graduated") graduated += 1;
    if (t.isPresale) inPresale += 1;
    if (t.createdAt && (!newest || t.createdAt > newest)) newest = t.createdAt;
  }

  // Accrued loan interest lives on the raw vault records (wei strings).
  let totalInterestBnb = 0;
  for (const v of vaults) {
    const raw = parseFloat(v.totalInterest ?? "0");
    if (Number.isFinite(raw) && raw > 0) totalInterestBnb += raw / WEI;
  }

  return {
    totalTokens: tokens.length,
    graduated,
    inPresale,
    totalMarketCapBnb,
    totalMarketCapUsd: totalMarketCapBnb * bnbPriceUsd,
    totalCirculating,
    totalInterestBnb,
    newestCreatedAt: newest,
  };
}

/**
 * Cumulative token-launch curve. Tokens with no known `createdAt` are
 * dropped (they can't be placed on the timeline); the remaining ones are
 * sorted ascending and accumulated. One point per launch day.
 */
export function buildLaunchSeries(tokens: MarketToken[]): LaunchPoint[] {
  const dated = tokens
    .filter((t): t is MarketToken & { createdAt: Date } => t.createdAt instanceof Date)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const points: LaunchPoint[] = [];
  let cumulative = 0;
  for (const t of dated) {
    cumulative += 1;
    const last = points[points.length - 1];
    // Collapse same-day launches into a single (latest) cumulative point.
    if (last && sameDay(last.date, t.createdAt)) {
      last.cumulative = cumulative;
    } else {
      points.push({ date: startOfDay(t.createdAt), cumulative });
    }
  }
  return points;
}

/** Top-N tokens by market cap (USD), largest first. */
export function buildMarketCapBars(
  tokens: MarketToken[],
  bnbPriceUsd: number,
  limit = 10,
): MarketCapBar[] {
  return tokens
    .filter((t) => t.marketCap && t.marketCap > 0)
    .map((t) => ({
      symbol: t.symbol,
      name: t.name,
      valueUsd: (t.marketCap ?? 0) * bnbPriceUsd,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, limit);
}

/** Status distribution for the donut, dropping empty statuses. */
export function buildStatusSlices(tokens: MarketToken[]): StatusSlice[] {
  const counts = new Map<TokenStatus, number>();
  for (const t of tokens) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);

  return (Object.keys(STATUS_META) as TokenStatus[])
    .map((status) => ({
      status,
      label: STATUS_META[status].label,
      color: STATUS_META[status].color,
      count: counts.get(status) ?? 0,
    }))
    .filter((s) => s.count > 0);
}

/**
 * Bucket loan events into per-day counts by type. Returns a dense series
 * (every day between the first and last event is present, zero-filled) so
 * the bar chart has no gaps. Capped at `maxDays` most-recent days.
 */
export function buildLoanActivity(
  events: LoanEvent[],
  maxDays = 30,
): LoanActivityDay[] {
  if (events.length === 0) return [];

  const byDay = new Map<number, LoanActivityDay>();
  for (const e of events) {
    const ts = normalizeTimestampMs(e.timestamp);
    if (!ts) continue;
    const dayStart = startOfDayMs(ts);
    let bucket = byDay.get(dayStart);
    if (!bucket) {
      bucket = { date: new Date(dayStart), borrow: 0, payback: 0, roll: 0 };
      byDay.set(dayStart, bucket);
    }
    switch (e.eventName) {
      case "Borrow":
        bucket.borrow += 1;
        break;
      case "Payback":
        bucket.payback += 1;
        break;
      case "RollLoan":
        bucket.roll += 1;
        break;
      // DefaultLoans and anything else are not charted as activity bars.
    }
  }

  const days = [...byDay.keys()].sort((a, b) => a - b);
  if (days.length === 0) return [];

  // Zero-fill the gap between first and last observed day.
  const DAY = 86_400_000;
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const dense: LoanActivityDay[] = [];
  for (let d = first; d <= last; d += DAY) {
    dense.push(byDay.get(d) ?? { date: new Date(d), borrow: 0, payback: 0, roll: 0 });
  }
  return dense.slice(-maxDays);
}

/** Aggregate a recent-events window into loan totals. */
export function deriveLoanAggregates(events: LoanEvent[]): LoanAggregates {
  let borrows = 0;
  let paybacks = 0;
  let rolls = 0;
  let defaults = 0;
  let totalBorrowedBnb = 0;
  const borrowers = new Set<string>();

  for (const e of events) {
    switch (e.eventName) {
      case "Borrow":
        borrows += 1;
        totalBorrowedBnb += weiToBnb(e.args?.borrowAmount);
        break;
      case "Payback":
        paybacks += 1;
        break;
      case "RollLoan":
        rolls += 1;
        break;
      case "DefaultLoans":
        defaults += 1;
        break;
    }
    const who = e.args?.who ?? e.userAddress;
    if (who) borrowers.add(who.toLowerCase());
  }

  return {
    borrows,
    paybacks,
    rolls,
    defaults,
    totalBorrowedBnb,
    uniqueBorrowers: borrowers.size,
  };
}

// =================================================
//              FORMAT / COLOR HELPERS
// =================================================

/** Compact USD, e.g. "$1.25M", "$980", "$0.00". */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

/** Compact BNB with a trailing unit, e.g. "1.25K BNB". */
export function formatBnb(value: number, unit = "BNB"): string {
  if (!Number.isFinite(value) || value <= 0) return `0 ${unit}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${unit}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${unit}`;
  if (value >= 1) return `${value.toFixed(3)} ${unit}`;
  return `${value.toFixed(4)} ${unit}`;
}

/** Plain integer with thousands separators. */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

// =================================================
//                    INTERNAL
// =================================================

/** Convert a possibly-string wei amount to a BNB number. */
function weiToBnb(raw?: string | number): number {
  if (raw == null) return 0;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n / WEI : 0;
}

/**
 * The indexer timestamps loan events either as seconds or milliseconds
 * (and occasionally as an ISO string). Normalize to epoch-ms, or 0 if
 * unparseable.
 */
function normalizeTimestampMs(ts: number | string | undefined): number {
  if (ts == null) return 0;
  if (typeof ts === "string") {
    const asNum = Number(ts);
    if (Number.isFinite(asNum)) return normalizeTimestampMs(asNum);
    const parsed = Date.parse(ts);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (!Number.isFinite(ts)) return 0;
  // < 1e12 → seconds; otherwise already ms.
  return ts < 1e12 ? ts * 1000 : ts;
}

function startOfDayMs(ms: number): number {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfDay(date: Date): Date {
  return new Date(startOfDayMs(date.getTime()));
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDayMs(a.getTime()) === startOfDayMs(b.getTime());
}
