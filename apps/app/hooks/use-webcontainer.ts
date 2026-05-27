"use client";

import { useEffect, useRef, useState } from "react";

import {
  connectWebContainer,
  type WebContainerClient,
} from "@/services/webcontainer";
import { WEBCONTAINER_BACKEND, type WebContainerBackend } from "@/types/constants";

interface UseWebContainerOptions {
  /** WS URL for the OSS backend. Ignored when backend === "stackblitz". */
  url?: string;
  /** Optional bearer token forwarded as `?token=…` on the OSS upgrade. */
  authToken?: string;
  /** Disable the connection entirely (e.g. wallet not connected). */
  enabled?: boolean;
  /** Override the env-derived backend; defaults to WEBCONTAINER_BACKEND. */
  backend?: WebContainerBackend;
  /** StackBlitz-only: container home/workdir name. The WC singleton can
   *  only be booted once per page, so this must be stable across mounts. */
  workdirName?: string;
}

/**
 * Owns one WebContainer client per React component instance and
 * surfaces connection status. Picks the OSS (WS) or StackBlitz
 * (in-browser) backend based on env, with an explicit override prop
 * for callers that need to force one.
 */
export function useWebContainer({
  url,
  authToken,
  enabled = true,
  backend = WEBCONTAINER_BACKEND,
  workdirName,
}: UseWebContainerOptions) {
  const clientRef = useRef<WebContainerClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      clientRef.current = null;
      setIsConnected(false);
      return;
    }
    // The OSS backend can't start without a URL; the StackBlitz one
    // is URL-less.
    if (backend === "oss" && !url) {
      clientRef.current = null;
      setIsConnected(false);
      return;
    }

    setError(null);
    let client: WebContainerClient;
    try {
      if (backend === "stackblitz") {
        // Dynamic import keeps the @webcontainer/api bundle out of
        // the critical path when only the OSS backend is in use.
        client = createDeferredStackBlitzClient(setError, { workdirName });
      } else {
        client = connectWebContainer(url as string, { authToken });
      }
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
  }, [enabled, url, authToken, backend, workdirName]);

  return {
    client: clientRef.current,
    isConnected,
    error,
  };
}

/**
 * Returns a `WebContainerClient` proxy whose methods queue until the
 * `@webcontainer/api` module finishes loading. Lets us avoid a static
 * import — the dependency is heavy and only needed when the operator
 * explicitly opts into the StackBlitz backend.
 */
function createDeferredStackBlitzClient(
  onError: (err: Error) => void,
  opts: { workdirName?: string } = {},
): WebContainerClient {
  type Inner = WebContainerClient;
  let inner: Inner | null = null;
  let innerPromise: Promise<Inner> | null = null;
  const connectionListeners = new Set<(connected: boolean) => void>();
  let closed = false;

  function loadInner(): Promise<Inner> {
    if (innerPromise) return innerPromise;
    innerPromise = import("@/services/stackblitz-webcontainer").then(
      ({ connectStackBlitzWebContainer }) => {
        if (closed) {
          // React 19 strict-mode double-invokes effects, so the first
          // mount's deferred client is closed before its dynamic
          // import resolves. Returning a benign no-op client lets
          // that branch settle without surfacing a phantom error.
          return makeNoopClient();
        }
        const real = connectStackBlitzWebContainer({
          workdirName: opts.workdirName,
        });
        inner = real;
        for (const cb of connectionListeners) real.onConnectionChange(cb);
        return real;
      },
    );
    innerPromise.catch((err) => onError(err as Error));
    return innerPromise;
  }

  // Kick off the import eagerly so the boot starts immediately.
  void loadInner();

  return {
    isReady: () => inner?.isReady() ?? false,
    spawn: async (opts) => {
      const real = inner ?? (await loadInner());
      return real.spawn(opts);
    },
    writeFile: async (path, contents) => {
      const real = inner ?? (await loadInner());
      return real.writeFile(path, contents);
    },
    mkdir: async (path, mkdirOpts) => {
      const real = inner ?? (await loadInner());
      return real.mkdir(path, mkdirOpts);
    },
    onOutput: (pid, listener) => {
      let unsub: (() => void) | null = null;
      let cancelled = false;
      if (inner) {
        unsub = inner.onOutput(pid, listener);
      } else {
        void loadInner().then((real) => {
          if (cancelled) return;
          unsub = real.onOutput(pid, listener);
        });
      }
      return () => {
        cancelled = true;
        unsub?.();
      };
    },
    onExit: (pid, listener) => {
      let unsub: (() => void) | null = null;
      let cancelled = false;
      if (inner) {
        unsub = inner.onExit(pid, listener);
      } else {
        void loadInner().then((real) => {
          if (cancelled) return;
          unsub = real.onExit(pid, listener);
        });
      }
      return () => {
        cancelled = true;
        unsub?.();
      };
    },
    onConnectionChange: (listener) => {
      connectionListeners.add(listener);
      const innerUnsub = inner?.onConnectionChange(listener);
      return () => {
        connectionListeners.delete(listener);
        innerUnsub?.();
      };
    },
    close: () => {
      closed = true;
      inner?.close();
    },
  };
}

function makeNoopClient(): WebContainerClient {
  const closed = () => Promise.reject(new Error("client closed"));
  return {
    isReady: () => false,
    spawn: closed,
    writeFile: closed,
    mkdir: closed,
    onOutput: () => () => {},
    onExit: () => () => {},
    onConnectionChange: () => () => {},
    close: () => {},
  };
}
