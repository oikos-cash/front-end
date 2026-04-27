"use client";

import { useState, useCallback, useRef } from "react";
import { VAULT_API_URL } from "@/types/constants";

const POLL_INTERVAL = 2000;

/**
 * Hook for AI image generation via the backend API.
 * Used in the Launchpad to generate token logos.
 * Creates a job, polls for completion, returns generated image URLs.
 *
 * @example
 * const { generate, images, isLoading } = useImageGeneration();
 * await generate("A futuristic DeFi token logo in blue and gold");
 */
export function useImageGeneration() {
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

  const generate = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setImages([]);
      stopPolling();

      try {
        // 1. Create generation job
        const res = await fetch(`${VAULT_API_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const data = await res.json();
        const jobId = data.job?.id;
        if (!jobId) throw new Error("No job ID returned");

        // 2. Poll for completion
        return new Promise<string[]>((resolve, reject) => {
          pollRef.current = setInterval(async () => {
            try {
              const pollRes = await fetch(`${VAULT_API_URL}/api/jobs/${jobId}`);
              if (!pollRes.ok) return;

              const pollData = await pollRes.json();
              const job = pollData.job;

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
    [stopPolling],
  );

  return { generate, images, isLoading, progress, error };
}
