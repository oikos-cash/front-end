"use client";

import useSWR from "swr";

// Services / utils
import { fetchLatestLoans } from "@/services/loan";
import { swrFetcher } from "@/utils/fetcher";
import {
  buildLoanActivity,
  deriveLoanAggregates,
  type LoanActivityDay,
  type LoanAggregates,
} from "@/utils/admin";

// Types
import type { LoanEvent } from "@/types/interfaces";

/** `GET /api/tokens/stats` — token-deployment counters. */
interface TokenDeployStats {
  total: number;
  pending: number;
  success: number;
  failed: number;
  lastDeployment?: string | number;
}

/** `GET /api/events/count` — total indexed pool events (proxy for trades). */
interface EventsCount {
  count: number;
}

export interface AdminStats {
  /** Raw recent loan events (most-recent window). */
  loanEvents: LoanEvent[];
  /** Counts + total borrowed, derived from the window. */
  loanAggregates: LoanAggregates;
  /** Per-day loan activity for the bar chart. */
  loanActivity: LoanActivityDay[];
  /** Token deployment counters (undefined until/if the endpoint answers). */
  deployStats?: TokenDeployStats;
  /** Total indexed pool events (undefined until/if the endpoint answers). */
  totalTrades?: number;
  loansLoading: boolean;
}

// The aggregate endpoints below are @Public on the backend but are not
// consumed anywhere else in the app yet. If the backend is unreachable we
// simply leave the corresponding tiles blank — hence shouldRetryOnError:false
// and a generous dedupe so a cold dashboard doesn't hammer a dead origin.
const PASSIVE = {
  revalidateOnFocus: false,
  shouldRetryOnError: false,
  dedupingInterval: 60_000,
} as const;

/**
 * Client-side protocol usage stats for the admin dashboard. Loan events come
 * from the indexer (`services/loan`); deployment + trade counters come from
 * the backend aggregate endpoints. Everything degrades to empty/undefined
 * when the backend is offline so the dashboard still renders.
 */
export function useAdminStats(): AdminStats {
  const { data: loans, isLoading: loansLoading } = useSWR(
    "admin-latest-loans",
    () => fetchLatestLoans(1000),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const { data: deployStats } = useSWR<TokenDeployStats>(
    "/api/tokens/stats",
    swrFetcher,
    PASSIVE,
  );

  const { data: eventsCount } = useSWR<EventsCount>(
    "/api/events/count",
    swrFetcher,
    PASSIVE,
  );

  const loanEvents = loans ?? [];

  return {
    loanEvents,
    loanAggregates: deriveLoanAggregates(loanEvents),
    loanActivity: buildLoanActivity(loanEvents),
    deployStats,
    totalTrades:
      typeof eventsCount?.count === "number" ? eventsCount.count : undefined,
    loansLoading,
  };
}
