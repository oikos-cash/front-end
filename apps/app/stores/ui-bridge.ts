"use client";

import { create } from "zustand";
import type {
  ModalName,
  SwapFormState,
  VisibleMarket,
} from "@oikos/ui-mcp";

/**
 * UI bridge store — the indirection layer between the ui-mcp server
 * (mounted at the root layout) and the page-side React state (modals,
 * forms, markets) that the agent's `ui__*` tools need to drive.
 *
 * Why a store: Next App Router unmounts a page on navigation, so the
 * ui-mcp hook can't directly reach into, say, the swap form's
 * `useForm` instance after the agent navigates from `/terminal` to
 * `/swap`. Instead, each consumer (swap form, hedge modal, markets
 * catalog) subscribes to a slice of this store. The store is the one
 * thing that survives across route mounts.
 *
 * Pattern:
 *   - Tools WRITE into the store (e.g., set requestedModal).
 *   - Page-side consumers REACT to those writes (e.g., HedgeModal owner
 *     watches requestedModal and flips its local open state).
 *   - Page-side consumers also REPORT current state back into the store
 *     (e.g., the swap form syncs its values; markets catalog syncs its
 *     visible rows). Tools that READ (`get_swap_state`,
 *     `get_visible_markets`) just return the latest snapshot.
 *
 * One-shot writes (open_modal, set_swap_form, submit_swap, etc.) carry
 * a monotonically increasing `nonce` so the consumer can ack each
 * request — even if the same modal is requested twice in a row.
 */

export interface ModalRequest {
  /** Modal to open. */
  name: ModalName;
  /** Optional props passed to the modal. */
  props?: Record<string, unknown>;
  /** Monotonic counter; consumer should react when this changes. */
  nonce: number;
}

export interface SwapFormRequest {
  /** Partial values to apply. Omitted fields are unchanged. */
  partial: Partial<SwapFormState>;
  nonce: number;
}

export interface SubmitSwapRequest {
  /** Resolves with the tx hash on user-approval. Rejects on rejection
   *  or failure. The page-side consumer (swap form) wires this up. */
  resolve: (result: { hash: string }) => void;
  reject: (err: Error) => void;
  nonce: number;
}

export interface MarketSelectRequest {
  symbol: string;
  /** Resolves once the route change settles. */
  resolve: () => void;
  reject: (err: Error) => void;
  nonce: number;
}

interface UiBridgeState {
  // ---- modal state ----
  /** Most recent open request — consumers compare nonces to ack. */
  modalRequest: ModalRequest | null;
  /** Reported by the modal-owning component when its open state flips. */
  activeModal: ModalName | null;
  requestModal: (name: ModalName, props?: Record<string, unknown>) => void;
  reportActiveModal: (active: ModalName | null) => void;
  requestCloseModal: () => void;

  // ---- swap form state ----
  /** Reported by the swap form on every value change. Null if no swap
   *  form is currently mounted. */
  swapFormState: SwapFormState | null;
  swapFormRequest: SwapFormRequest | null;
  submitSwapRequest: SubmitSwapRequest | null;
  requestSetSwapForm: (partial: Partial<SwapFormState>) => void;
  requestSubmitSwap: () => Promise<{ hash: string }>;
  reportSwapFormState: (state: SwapFormState | null) => void;
  /** Page-side consumer calls this after handling a request — clears
   *  it so the same request isn't re-applied on re-render. */
  consumeSwapFormRequest: (nonce: number) => void;
  consumeSubmitSwapRequest: (nonce: number) => void;

  // ---- markets state ----
  visibleMarkets: VisibleMarket[];
  marketSelectRequest: MarketSelectRequest | null;
  reportVisibleMarkets: (markets: VisibleMarket[]) => void;
  requestSelectMarket: (symbol: string) => Promise<void>;
  consumeMarketSelectRequest: (nonce: number) => void;
}

let nextNonce = 1;
const mintNonce = () => nextNonce++;

export const useUiBridgeStore = create<UiBridgeState>((set, get) => ({
  modalRequest: null,
  activeModal: null,
  requestModal: (name, props) =>
    set({ modalRequest: { name, props, nonce: mintNonce() } }),
  reportActiveModal: (active) => set({ activeModal: active }),
  requestCloseModal: () =>
    // Closing routes through the same request channel; consumer treats
    // a "close" as flipping its local open state off. We model close as
    // a modalRequest with name=null-ish — but since ModalName has no
    // null variant, just report the close via activeModal and clear
    // any pending open request.
    set({ modalRequest: null, activeModal: null }),

  swapFormState: null,
  swapFormRequest: null,
  submitSwapRequest: null,
  requestSetSwapForm: (partial) =>
    set({ swapFormRequest: { partial, nonce: mintNonce() } }),
  requestSubmitSwap: () =>
    new Promise<{ hash: string }>((resolve, reject) => {
      set({
        submitSwapRequest: { resolve, reject, nonce: mintNonce() },
      });
    }),
  reportSwapFormState: (state) => set({ swapFormState: state }),
  consumeSwapFormRequest: (nonce) => {
    const cur = get().swapFormRequest;
    if (cur && cur.nonce === nonce) set({ swapFormRequest: null });
  },
  consumeSubmitSwapRequest: (nonce) => {
    const cur = get().submitSwapRequest;
    if (cur && cur.nonce === nonce) set({ submitSwapRequest: null });
  },

  visibleMarkets: [],
  marketSelectRequest: null,
  reportVisibleMarkets: (markets) => set({ visibleMarkets: markets }),
  requestSelectMarket: (symbol) =>
    new Promise<void>((resolve, reject) => {
      set({
        marketSelectRequest: { symbol, resolve, reject, nonce: mintNonce() },
      });
    }),
  consumeMarketSelectRequest: (nonce) => {
    const cur = get().marketSelectRequest;
    if (cur && cur.nonce === nonce) set({ marketSelectRequest: null });
  },
}));
