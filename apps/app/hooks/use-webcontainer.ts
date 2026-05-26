"use client";

import { useEffect, useRef, useState } from "react";

import {
  connectWebContainer,
  type WebContainerClient,
} from "@/services/webcontainer";

interface UseWebContainerOptions {
  /** WS URL the client should connect to. When undefined, the hook
   *  stays in a disconnected state — useful for gating on env config. */
  url?: string;
  /** Optional bearer token forwarded as `?token=…` on the upgrade. */
  authToken?: string;
  /** Disable the connection entirely (e.g. wallet not connected). */
  enabled?: boolean;
}

/**
 * Owns one WebContainer WebSocket per React component instance and
 * surfaces connection status. The client itself is stable across the
 * hook's lifetime (mounted once, torn down on unmount or URL change).
 */
export function useWebContainer({
  url,
  authToken,
  enabled = true,
}: UseWebContainerOptions) {
  const clientRef = useRef<WebContainerClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !url) {
      clientRef.current = null;
      setIsConnected(false);
      return;
    }
    setError(null);
    let client: WebContainerClient;
    try {
      client = connectWebContainer(url, { authToken });
    } catch (err) {
      setError(err as Error);
      return;
    }
    clientRef.current = client;
    const unsubConn = client.onConnectionChange((connected) => {
      setIsConnected(connected);
    });
    return () => {
      unsubConn();
      client.close();
      if (clientRef.current === client) clientRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, url, authToken]);

  return {
    client: clientRef.current,
    isConnected,
    error,
  };
}
