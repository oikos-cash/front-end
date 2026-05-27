"use client";

import { useEffect, useRef } from "react";
import { useAccount, useSendTransaction, useSignTypedData } from "wagmi";
import type {
  Address,
  Hex,
  TypedData as WagmiTypedData,
  TypedDataDomain as WagmiTypedDataDomain,
} from "viem";

interface UseWalletBridgeOptions {
  /** Session id that keys the in-memory queue on the bridge route. Must
   *  match the one the agent process is configured with. */
  sessionId: string;
  /** Optional: disable entirely (e.g. while the wallet panel is being
   *  set up or in tests). */
  enabled?: boolean;
}

/**
 * Drives the host side of the wallet bridge. Opens an SSE stream to
 * /api/wallet-bridge/<sessionId>/pending, handles each incoming agent
 * request via wagmi, POSTs the result back to /respond.
 *
 * v1 method surface:
 *   - eth_accounts            → returns [connected address] (or refusal)
 *   - eth_signTypedData_v4    → wagmi prompts MetaMask, returns hex sig
 *
 * Anything else gets refused with code 4200 ("method not supported").
 */
export function useWalletBridge({ sessionId, enabled = true }: UseWalletBridgeOptions): void {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { sendTransactionAsync } = useSendTransaction();
  const isConnectedRef = useRef(isConnected);
  const addressRef = useRef(address);

  // Keep refs current so the long-lived SSE handler always sees the
  // latest wallet state without re-binding.
  useEffect(() => {
    isConnectedRef.current = isConnected;
    addressRef.current = address;
  }, [isConnected, address]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const controller = new AbortController();
    const url = `/api/wallet-bridge/${encodeURIComponent(sessionId)}/pending`;
    const es = new EventSource(url, { withCredentials: false });

    const respond = async (
      id: string,
      payload: { result?: unknown } | { error: { code: number; message: string } },
    ) => {
      try {
        await fetch(
          `/api/wallet-bridge/${encodeURIComponent(sessionId)}/respond`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
            signal: controller.signal,
          },
        );
      } catch {
        // Swallowed — the agent's request will time out if the response
        // never lands. Nothing useful to recover here.
      }
    };

    const handleRequest = async (raw: string) => {
      let req: { id?: string; method?: string; params?: unknown[] };
      try {
        req = JSON.parse(raw);
      } catch {
        return;
      }
      if (!req?.id || typeof req.method !== "string") return;

      // Wallet-not-connected refusal — applies to all methods given the
      // "require wallet for everything" stance.
      if (!isConnectedRef.current || !addressRef.current) {
        await respond(req.id, {
          error: { code: 4100, message: "wallet not connected to /terminal" },
        });
        return;
      }

      try {
        if (req.method === "eth_accounts") {
          await respond(req.id, { result: [addressRef.current] });
          return;
        }

        if (req.method === "eth_sendTransaction") {
          const [params] = (req.params ?? []) as [
            {
              from?: string;
              to?: string;
              value?: string;
              data?: string;
              gas?: string;
              nonce?: string;
              maxFeePerGas?: string;
              maxPriorityFeePerGas?: string;
              gasPrice?: string;
              chainId?: string;
            },
          ];
          if (!params || typeof params !== "object") {
            await respond(req.id, {
              error: { code: -32602, message: "eth_sendTransaction: expected tx object as first param" },
            });
            return;
          }
          const hexToBig = (h: string | undefined): bigint | undefined =>
            h === undefined ? undefined : BigInt(h);
          const hash = await sendTransactionAsync({
            to: params.to as Address | undefined,
            value: hexToBig(params.value),
            data: (params.data ?? undefined) as Hex | undefined,
            gas: hexToBig(params.gas),
            nonce:
              params.nonce !== undefined ? Number(BigInt(params.nonce)) : undefined,
            maxFeePerGas: hexToBig(params.maxFeePerGas),
            maxPriorityFeePerGas: hexToBig(params.maxPriorityFeePerGas),
            gasPrice: hexToBig(params.gasPrice),
          });
          await respond(req.id, { result: hash });
          return;
        }

        if (req.method === "eth_signTypedData_v4") {
          const [_address, payloadJson] = (req.params ?? []) as [string, string];
          if (typeof payloadJson !== "string") {
            await respond(req.id, {
              error: { code: -32602, message: "eth_signTypedData_v4: expected JSON-string payload" },
            });
            return;
          }
          const payload = JSON.parse(payloadJson) as {
            domain: WagmiTypedDataDomain;
            types: WagmiTypedData;
            primaryType: string;
            message: Record<string, unknown>;
          };
          const sig = await signTypedDataAsync({
            domain: payload.domain,
            types: payload.types,
            primaryType: payload.primaryType,
            message: payload.message,
          });
          await respond(req.id, { result: sig });
          return;
        }

        await respond(req.id, {
          error: { code: 4200, message: `wallet bridge: method '${req.method}' not supported in this slice` },
        });
      } catch (err) {
        // wagmi throws on user rejection — surface as MetaMask 4001.
        const message = err instanceof Error ? err.message : String(err);
        const code = /reject|denied/i.test(message) ? 4001 : -32603;
        await respond(req.id, { error: { code, message } });
      }
    };

    es.addEventListener("request", (ev) => {
      void handleRequest((ev as MessageEvent).data);
    });
    es.addEventListener("error", () => {
      // EventSource auto-reconnects; nothing to do here. The browser
      // will close the underlying connection on tab close, which the
      // server detects via req.signal.
    });

    return () => {
      controller.abort();
      es.close();
    };
  }, [enabled, sessionId, signTypedDataAsync, sendTransactionAsync]);
}
