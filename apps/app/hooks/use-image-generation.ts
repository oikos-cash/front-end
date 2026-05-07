"use client";

import { useState, useCallback, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { VAULT_API_URL } from "@/types/constants";
import { formatAuthMessage, buildAuthHeaders } from "@/utils/auth-fetch";

const POLL_INTERVAL = 2000;

/**
 * Hook for AI image generation via the backend API.
 * Used in the Launchpad to generate token logos.
 * Creates a job, polls for completion, returns generated image URLs.
 *
 * Auth: `POST /api/generate` and `GET /api/jobs/:id` are protected by the
 * NestJS AuthGuard. We sign once at the start of `generate()` and reuse the
 * same EIP-191 headers for the polling fetches. If the AuthGuard's TTL window
 * expires mid-job (>~5 min), the polling fetch will see 401 and re-sign.
 *
 * @example
 * const { generate, images, isLoading } = useImageGeneration();
 * await generate("A futuristic DeFi token logo in blue and gold");
 */
export function useImageGeneration() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const signAuthHeaders = useCallback(async (): Promise<
    Record<string, string>
  > => {
    if (!address) throw new Error("Wallet not connected");
    const message = formatAuthMessage(address);
    const signature = await signMessageAsync({ message });
    return buildAuthHeaders({ address, signature, message });
  }, [address, signMessageAsync]);

  const generate = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setImages([]);
      stopPolling();

      try {
        if (!address) throw new Error("Wallet not connected");

        // 1. Sign once for the whole flow (job create + polling).
        let auth = await signAuthHeaders();

        // 2. Create generation job
        const res = await fetch(`${VAULT_API_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth },
          body: JSON.stringify({ prompt }),
        });

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const data = await res.json();
        const jobId = data.job?.id ?? data.data?.job?.id;
        if (!jobId) throw new Error("No job ID returned");

        // 3. Poll for completion
        return new Promise<string[]>((resolve, reject) => {
          pollRef.current = setInterval(async () => {
            try {
              let pollRes = await fetch(
                `${VAULT_API_URL}/api/jobs/${jobId}`,
                { headers: { ...auth } },
              );

              // Auth window may have expired mid-job → re-sign once and retry.
              if (pollRes.status === 401) {
                try {
                  auth = await signAuthHeaders();
                  pollRes = await fetch(
                    `${VAULT_API_URL}/api/jobs/${jobId}`,
                    { headers: { ...auth } },
                  );
                } catch {
                  // user rejected the re-sign — keep polling silently
                  return;
                }
              }

              if (!pollRes.ok) return;

              const pollData = await pollRes.json();
              const job = pollData.job ?? pollData.data?.job;
              if (!job) return;

              if (job.progress) setProgress(job.progress);

              if (job.status === "completed" && job.result?.filename) {
                stopPolling();
                setIsLoading(false);

                // Generate 3 image URLs from the base filename
                const baseName = job.result.filename.replace(/\.[^.]+$/, "");
                const urls = [1, 2, 3].map(
                  (i) => `${VAULT_API_URL}/images/${baseName}-${i}.png`,
                );
                setImages(urls);
                resolve(urls);
              } else if (job.status === "failed") {
                stopPolling();
                setIsLoading(false);
                const errMsg = job.error || "Image generation failed";
                setError(errMsg);
                reject(new Error(errMsg));
              }
            } catch {
              // Ignore poll errors, will retry
            }
          }, POLL_INTERVAL);
        });
      } catch (err) {
        setIsLoading(false);
        const msg = err instanceof Error ? err.message : "Image generation failed";
        setError(msg);
        console.error("[useImageGeneration]", err);
        return [];
      }
    },
    [address, signAuthHeaders, stopPolling],
  );

  return { generate, images, isLoading, progress, error };
}
