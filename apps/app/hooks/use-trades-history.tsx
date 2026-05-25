"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { ColumnDef } from "@tanstack/react-table";

// Components
import Badge from "@/components/atoms/badge";

// Hooks
import { useTranslations } from "next-intl";
import { useWebSocket } from "@/hooks/use-websocket";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useWallet } from "@/stores/wallet";
import { getWebSocketService } from "@/services/websocket";

// Types
import {
  Trade,
  VaultInfo,
  WSBlockchainEvent,
} from "@/types/interfaces";

// Icons
import { ArrowUpRight } from "lucide-react";

// Utils
import { timeAgo } from "@/utils/date";
import { truncateAddress } from "@/utils/string";
import { swrFetcher } from "@/utils/fetcher";
import { filterBlockedVaults } from "@/utils/token-blocklist";

// Constants
import { TRADES_MAX_TRADES, VAULT_API_URL } from "@/types/constants";

/**
 * Trades history hook — listens for real Swap events via WebSocket.
 * Shows empty state with server error when WS is not connected.
 */
export function useTradesHistory(
  token: string = "OKS",
  poolAddress?: string,
) {
  const t = useTranslations("tradesHistory");
  const { bnbPrice } = useBnbPrice();
  const { address } = useWallet();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("global");
  const [tokenFilter, setTokenFilter] = useState("all");

  // Source of truth for "what symbol belongs to what pool" is the vault
  // feed (`/vaults`) — it always carries a real `tokenSymbol` alongside
  // its `poolAddress`. `/api/pools` currently returns `[]` on the
  // backend, so the prior pool-based map stayed empty and the hook
  // silently fell through to the hook's `token` prop — which on the
  // global view is whatever vault landed first after filtering, i.e.
  // the wrong label for every other pool's trades.
  //
  // Same SWR key the wallet store uses, so this rides the existing
  // request and dedupes for free.
  const { data: rawVaults } = useSWR<VaultInfo[]>(
    `${VAULT_API_URL}/vaults`,
    swrFetcher,
    { errorRetryCount: 0, revalidateOnFocus: false },
  );
  const vaults = useMemo(
    () => (rawVaults ? filterBlockedVaults(rawVaults) : undefined),
    [rawVaults],
  );

  // poolAddress (lower-case) → project-token symbol.
  const poolSymbolMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vaults ?? []) {
      if (v.poolAddress && v.tokenSymbol) {
        m.set(v.poolAddress.toLowerCase(), v.tokenSymbol);
      }
    }
    return m;
  }, [vaults]);

  // Mirror `poolSymbolMap` into a ref so callbacks that run inside other
  // effects (e.g. the historical-seed loader, which resolves via WS
  // *after* SWR may have already populated the map and bumped the
  // closure-captured copy out of date) always read the current value.
  const poolSymbolMapRef = useRef(poolSymbolMap);
  useEffect(() => {
    poolSymbolMapRef.current = poolSymbolMap;
  }, [poolSymbolMap]);

  /** Resolve the best symbol for a swap event: pool map → event-supplied
   *  symbol (if not the "UNKNOWN" placeholder) → hook's `token` prop. */
  function resolveTradeSymbol(event: WSBlockchainEvent): string {
    const fromMap = event.poolAddress
      ? poolSymbolMapRef.current.get(event.poolAddress.toLowerCase())
      : undefined;
    if (fromMap) return fromMap;
    if (event.tokenSymbol && event.tokenSymbol !== "UNKNOWN") {
      return event.tokenSymbol;
    }
    return token;
  }

  // Re-label already-rendered trades when the pool→symbol map lands or
  // changes. Without this the historical seed (loaded immediately at
  // mount, before `/vaults` resolves) stays labelled with the prop
  // `token` fallback forever.
  // Re-label whenever the map changes OR the trades list lands (the
  // historical seed can arrive AFTER the map resolves, in which case
  // mapping-on-map-change alone would miss it). Keyed by `trades.length`
  // — we don't want to chase per-row mutations because those originate
  // from this very effect.
  useEffect(() => {
    if (poolSymbolMap.size === 0) return;
    setTrades((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        const want = t.poolAddress
          ? poolSymbolMap.get(t.poolAddress.toLowerCase())
          : undefined;
        if (want && want !== t.token) {
          changed = true;
          return { ...t, token: want };
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [poolSymbolMap, trades.length]);

  // Listen for Swap events via WS
  const onEvent = useCallback(
    (event: WSBlockchainEvent) => {
      if (event.eventName !== "Swap") return;
      // Per-pool mode: ignore live pushes from other pools.
      if (
        poolAddress &&
        event.poolAddress?.toLowerCase() !== poolAddress.toLowerCase()
      )
        return;

      const raw0 = parseFloat(event.args.amount0 ?? "0");
      const raw1 = parseFloat(event.args.amount1 ?? "0");
      // amounts come as wei (18 decimals) — convert to human-readable
      const amount0 = raw0 / 1e18;
      const amount1 = raw1 / 1e18;
      // Derive direction from the on-chain signed amounts. The pool reports
      // signs from its own perspective: positive = token came IN (user paid
      // it), negative = went OUT (user received it). The rest of this hook
      // already treats amount0 as the project token and amount1 as WBNB, so
      // amount1 > 0 (WBNB entering the pool) ⇒ user bought the project
      // token; amount1 < 0 ⇒ user sold.
      //
      // Note: `event.tradeInfo.type` from the indexer is intentionally not
      // used — it's been observed to label trades from WBNB's perspective
      // (a buy of the project token comes through as type="sell" because
      // the user "sold" WBNB), which is the opposite of what the UI wants.
      const isBuy = amount1 > 0;
      const amount = Math.abs(amount0);
      const bnbAmount = Math.abs(amount1);
      const price = amount > 0 ? bnbAmount / amount : 0;

      const trade: Trade = {
        id: event.id ?? `${event.transactionHash}-${event.logIndex ?? event.blockNumber}`,
        type: isBuy ? "buy" : "sell",
        // Resolve per-trade symbol from the pool-address map first; see
        // `resolveTradeSymbol` for the fallback order.
        token: resolveTradeSymbol(event),
        poolAddress: event.poolAddress,
        amount,
        price,
        bnbAmount,
        usdValue: parseFloat((bnbAmount * bnbPrice).toFixed(2)),
        // The pool's sender/recipient are usually the ExchangeHelper router,
        // not the human. The indexer decodes the real EOA but exposes it as
        // the *recipient* (i.e. who ends up holding the swapped tokens),
        // because for both buy and sell directions the helper routes the
        // output back to the caller. Prefer actualRecipient first, fall
        // through to actualSender (direct pool calls) and finally args.
        wallet:
          event.tradeInfo?.actualRecipient ??
          event.actualRecipient ??
          event.args.recipient ??
          event.tradeInfo?.actualSender ??
          event.actualSender ??
          event.args.sender,
        txHash: event.transactionHash,
        timestamp: new Date(
          event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000,
        ),
      };

      setTrades((prev) => {
        // De-dup against the historical seed: an event that arrives via
        // push immediately after the initial getGlobalTrades() reply
        // would otherwise show up twice.
        if (prev.some((p) => p.id === trade.id)) return prev;
        return [trade, ...prev].slice(0, TRADES_MAX_TRADES);
      });
    },
    // `resolveTradeSymbol` closes over the current `poolSymbolMap` /
    // `token`, so include them here to invalidate the callback when the
    // pool catalogue resolves (one tick after mount on the global view).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, bnbPrice, poolSymbolMap, poolAddress],
  );

  // Always enable the WS hook so the GLOBAL `onEvent` callback registers
  // regardless of whether a specific pool is being viewed. When a pool
  // is supplied the hook also emits the per-pool `subscribe`; when no
  // pool is supplied we fan out the subscription to every known pool
  // below so the global trade feed receives swaps from all markets.
  const { isConnected } = useWebSocket({
    poolAddress,
    channels: poolAddress ? ["event"] : [],
    onEvent,
    enabled: true,
  });

  // Global-view subscription fan-out. The backend only pushes events for
  // pools the client has explicitly registered, so for "all trades"
  // (poolAddress undefined) we subscribe to every vault's poolAddress.
  // Drives off the same `/vaults` SWR data as the symbol map so both
  // come up together (and so we don't fire a redundant request).
  const subscribablePools = useMemo(
    () =>
      (vaults ?? [])
        .map((v) => v.poolAddress)
        .filter((a): a is string => !!a),
    [vaults],
  );
  const subscribablePoolsKey = subscribablePools.join(",");

  useEffect(() => {
    if (poolAddress) return; // per-pool mode already subscribed by useWebSocket
    if (subscribablePools.length === 0) return;
    let cancelled = false;
    let subscribed: string[] = [];
    const ws = getWebSocketService();

    function subscribeAll() {
      if (cancelled) return;
      subscribed = subscribablePools.slice();
      for (const a of subscribed) ws.subscribe("event", a);
    }

    if (ws.isConnected()) {
      subscribeAll();
    } else {
      ws.connect()
        .then(subscribeAll)
        .catch((err) =>
          console.error("[useTradesHistory] WS connect failed:", err),
        );
    }

    return () => {
      cancelled = true;
      for (const a of subscribed) ws.unsubscribe("event", a);
    };
    // `subscribablePools` itself is a fresh array reference on each
    // render; key off the stable joined string so we re-subscribe only
    // when the pool set actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolAddress, subscribablePoolsKey]);

  // Load historical trades via WS getGlobalTrades
  useEffect(() => {
    let cancelled = false;
    const ws = getWebSocketService();

    function parseSwapEvent(event: WSBlockchainEvent): Trade {
      const raw0 = parseFloat(event.args.amount0 ?? "0");
      const raw1 = parseFloat(event.args.amount1 ?? "0");
      const amount0 = raw0 / 1e18;
      const amount1 = raw1 / 1e18;
      // See onEvent above. WBNB flowing INTO the pool ⇒ user bought.
      const isBuy = amount1 > 0;
      const amount = Math.abs(amount0);
      const bnbAmount = Math.abs(amount1);
      const price = amount > 0 ? bnbAmount / amount : 0;
      // timestamp from WS is already in ms
      const ts = event.timestamp > 1e12
        ? event.timestamp
        : event.timestamp * 1000;

      return {
        id: event.id ?? `${event.transactionHash}-${event.logIndex ?? event.blockNumber}`,
        type: (isBuy ? "buy" : "sell") as Trade["type"],
        token: resolveTradeSymbol(event),
        poolAddress: event.poolAddress,
        amount,
        price,
        bnbAmount,
        usdValue: parseFloat((bnbAmount * bnbPrice).toFixed(2)),
        wallet:
          event.tradeInfo?.actualRecipient ??
          event.actualRecipient ??
          event.args.recipient ??
          event.tradeInfo?.actualSender ??
          event.actualSender ??
          event.args.sender ??
          "",
        txHash: event.transactionHash,
        timestamp: new Date(ts),
      };
    }

    // Per-pool mode: only keep events that belong to the page's pool.
    // Without this guard the per-pool view (e.g. /trade/dws) inherits the
    // global seed and lists trades from every market.
    const poolFilter = poolAddress?.toLowerCase();

    function loadTrades() {
      if (cancelled) return;
      ws.getGlobalTrades(100)
        .then((events) => {
          if (cancelled) return;
          const swapEvents = events.filter(
            (e) =>
              e.eventName === "Swap" &&
              (!poolFilter || e.poolAddress?.toLowerCase() === poolFilter),
          );
          const historical = swapEvents.map(parseSwapEvent);
          setTrades(historical.slice(0, TRADES_MAX_TRADES));
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("[useTradesHistory] getGlobalTrades failed:", err);
          setIsLoading(false);
        });
    }

    if (ws.isConnected()) {
      loadTrades();
    } else {
      ws.connect()
        .then(() => loadTrades())
        .catch((err) => {
          console.error("[useTradesHistory] WS connect failed:", err);
        });
    }

    return () => { cancelled = true; };
  }, [token, bnbPrice, poolAddress]);

  const columns: ColumnDef<Trade>[] = useMemo(
    () => [
      {
        accessorKey: "type",
        header: t("type"),
        cell: ({ row }) => {
          const type = row.getValue("type") as Trade["type"];
          return (
            <Badge
              variant={type === "buy" ? "default" : "destructive"}
              className="px-1.5 py-0 text-2xs"
            >
              {type === "buy" ? t("buy") : t("sell")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "amount",
        header: t("details"),
        cell: ({ row }) => {
          const amount = (row.getValue("amount") as number).toLocaleString();
          const price = row.original.price.toFixed(6);
          return (
            <span className="whitespace-nowrap text-xs">
              {amount} {row.original.token} @ {price}
            </span>
          );
        },
      },
      {
        accessorKey: "bnbAmount",
        header: t("value"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs">
            {row.original.bnbAmount.toFixed(4)} BNB / $
            {row.original.usdValue.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "txHash",
        header: t("txId"),
        cell: ({ row }) => (
          <a
            href={`https://bscscan.com/tx/${row.original.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
          >
            {truncateAddress(row.original.txHash)}
            <ArrowUpRight className="size-3 text-muted-foreground/50" />
          </a>
        ),
      },
      {
        accessorKey: "timestamp",
        header: t("time"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {timeAgo(row.getValue("timestamp") as Date)}
          </span>
        ),
      },
    ],
    [t],
  );

  const filteredTrades = trades.filter((trade) => {
    if (view === "myTrades" && address) {
      if (trade.wallet.toLowerCase() !== address.toLowerCase()) return false;
    }
    if (tokenFilter !== "all" && trade.token !== tokenFilter) return false;
    return true;
  });

  const tokenOptions = [
    { value: "all", label: t("allTokens") },
    { value: token, label: token },
  ];

  const handleViewChange = (value: string) => {
    setView(value);
  };

  const handleClearHistory = () => {
    setTrades([]);
  };

  return {
    t,
    trades,
    view,
    tokenFilter,
    setTokenFilter,
    isLoading,
    isConnected,
    hasData: true,
    columns,
    filteredTrades,
    tokenOptions,
    handleViewChange,
    handleClearHistory,
  };
}
