"use client";

import { useState, useEffect, useCallback } from "react";
import { useSignMessage } from "wagmi";
import { toast } from "sonner";

// Services
import {
  fetchHedgeQuote,
  fetchHedgePositions,
  fetchHedgeUserStats,
  createHedge,
  closeHedge,
} from "@/services/hedge";
import { formatAuthMessage, buildAuthHeaders } from "@/utils/auth-fetch";

// Types
import type { HedgeQuote, HedgePosition, HedgeStats } from "@/types/interfaces";

/**
 * Manages hedge state: quote fetching, position management, create/close actions.
 *
 * Auth: each mutation prompts the wallet for an EIP-191 signature, which is
 * sent as `x-address`/`x-signature`/`x-message` headers (NOT in the body).
 * The backend's `CreateHedgeDto` rejects extra body fields under
 * `forbidNonWhitelisted: true`, so signature/message MUST go in headers.
 */
export function useHedge(options: {
  userAddress?: string | null;
  vaultAddress?: string;
  loanAmountBNB?: number;
  loanDurationDays?: number;
  autoFetchQuote?: boolean;
  autoFetchPositions?: boolean;
}) {
  const {
    userAddress,
    vaultAddress,
    loanAmountBNB = 0,
    loanDurationDays = 30,
    autoFetchQuote = false,
    autoFetchPositions = false,
  } = options;

  const { signMessageAsync } = useSignMessage();

  const [quote, setQuote] = useState<HedgeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [positions, setPositions] = useState<HedgePosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [stats, setStats] = useState<HedgeStats | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const activePositions = positions.filter(
    (p) => p.status === "active" || p.status === "pending",
  );

  const fetchQuote = useCallback(async () => {
    if (loanAmountBNB <= 0) return;
    setQuoteLoading(true);
    try {
      const q = await fetchHedgeQuote(loanAmountBNB, loanDurationDays);
      setQuote(q);
    } catch (err) {
      console.error("[useHedge] quote error:", err);
    } finally {
      setQuoteLoading(false);
    }
  }, [loanAmountBNB, loanDurationDays]);

  const fetchPositionsList = useCallback(async () => {
    if (!userAddress) return;
    setPositionsLoading(true);
    // Settle the two calls independently so a stats failure doesn't blank
    // out the positions list (and vice versa).
    const [posResult, statsResult] = await Promise.allSettled([
      fetchHedgePositions(userAddress),
      fetchHedgeUserStats(userAddress),
    ]);
    if (posResult.status === "fulfilled") {
      setPositions(posResult.value);
    } else {
      console.error("[useHedge] positions error:", posResult.reason);
    }
    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      console.error("[useHedge] stats error:", statsResult.reason);
    }
    setPositionsLoading(false);
  }, [userAddress]);

  useEffect(() => {
    if (autoFetchQuote) fetchQuote();
  }, [autoFetchQuote, fetchQuote]);

  useEffect(() => {
    if (autoFetchPositions) fetchPositionsList();
  }, [autoFetchPositions, fetchPositionsList]);

  async function handleCreateHedge() {
    if (!userAddress || !vaultAddress || !quote) return null;
    setIsCreating(true);
    try {
      const message = formatAuthMessage(userAddress);
      const signature = await signMessageAsync({ message });
      const auth = buildAuthHeaders({
        address: userAddress,
        signature,
        message,
      });
      const result = await createHedge(
        {
          vaultAddress,
          loanAmountBNB,
          loanDurationDays,
        },
        auth,
      );
      toast.success("Hedge position created");
      await fetchPositionsList();
      return result.hedge;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create hedge";
      toast.error(msg);
      return null;
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCloseHedge(hedgeId: string) {
    if (!userAddress) return null;
    setIsClosing(true);
    try {
      const message = formatAuthMessage(userAddress);
      const signature = await signMessageAsync({ message });
      const auth = buildAuthHeaders({
        address: userAddress,
        signature,
        message,
      });
      const result = await closeHedge(hedgeId, auth);
      toast.success("Hedge position closed");
      await fetchPositionsList();
      return result.hedge;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to close hedge";
      toast.error(msg);
      return null;
    } finally {
      setIsClosing(false);
    }
  }

  return {
    quote,
    quoteLoading,
    positions,
    activePositions,
    positionsLoading,
    stats,
    fetchQuote,
    fetchPositions: fetchPositionsList,
    createHedge: handleCreateHedge,
    closeHedge: handleCloseHedge,
    isCreating,
    isClosing,
  };
}
