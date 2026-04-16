"use client";

import { useState, useCallback } from "react";
import { VAULT_API_URL } from "@/types/constants";

/**
 * Hook for AI text generation via the backend API.
 * Used in the Launchpad to generate token descriptions.
 *
 * @example
 * const { generate, result, isLoading } = useAIGeneration();
 * await generate("Generate a description for a DeFi token called OKS");
 */
export function useAIGeneration() {
  const [result, setResult] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${VAULT_API_URL}/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "claude",
          maxTokens: 1000,
          temperature: 0.7,
        }),
      });

      if (res.status === 429) {
        setError("Rate limited. Please wait a moment and try again.");
        return [];
      }

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data = await res.json();
      const alternatives = data.alternatives ?? [];
      setResult(alternatives);
      return alternatives;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI generation failed";
      setError(msg);
      console.error("[useAIGeneration]", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { generate, result, isLoading, error };
}
