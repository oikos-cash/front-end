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

// Types
import type { HedgeQuote, HedgePosition, HedgeStats } from "@/types/interfaces";

/**
 * Manages hedge state: quote fetching, position management, create/close actions.
 * Uses message signing for authentication with the hedge API.
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
    try {
      const [pos, st] = await Promise.all([
        fetchHedgePositions(userAddress),
        fetchHedgeUserStats(userAddress),
      ]);
      setPositions(pos);
      setStats(st);
    } catch (err) {
      console.error("[useHedge] positions error:", err);
    } finally {
      setPositionsLoading(false);
    }
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
      const message = `Create hedge for vault ${vaultAddress} at ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const result = await createHedge({
        userAddress,
        vaultAddress,
        loanAmountBNB,
        loanDurationDays,
        signature,
        message,
      });
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
      const message = `Close hedge ${hedgeId} at ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const result = await closeHedge({
        hedgeId,
        userAddress,
        signature,
        message,
      });
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
