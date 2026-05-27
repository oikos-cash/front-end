/**
 * UiContext — the surface every UI tool's handler resolves against.
 *
 * The page mounts a single `useUiMcpServer({ ... })` hook that builds
 * this object once and keeps it referentially stable. Each handler
 * reads/calls through these refs/callbacks, so the latest React state
 * is always visible without re-registering tools.
 *
 * Implementations of each sub-API live in the React tree (apps/app)
 * and are passed in when the server is created. The mcp/ package
 * stays pure TypeScript with no React dependency — easy to unit-test
 * with a fake context.
 */

export interface RouterApi {
  /** Current pathname, e.g. "/en/swap". */
  getPath: () => string;
  /** Navigate to a new path. Returns once the route change settles. */
  push: (path: string) => Promise<void>;
}

export interface AccountApi {
  /** Connected wagmi address, or null if disconnected. */
  getAddress: () => string | null;
  /** Active chain id (number form), or null. */
  getChainId: () => number | null;
  isConnected: () => boolean;
  /** Triggers the wallet-connect modal. Resolves once user closes it
   *  (whether they connected or not). */
  promptConnect: () => Promise<void>;
}

export type ModalName =
  | "hedge"
  | "wrap-unwrap"
  | "role-selector"
  | "swap-history"
  | "wallet-panel";

export interface ModalApi {
  /** Which modal is currently visible, if any. */
  getActive: () => ModalName | null;
  /** Open the named modal with optional props. */
  open: (name: ModalName, props?: Record<string, unknown>) => void;
  /** Close the active modal. */
  close: () => void;
}

export interface SwapFormState {
  sellToken: string | null;
  buyToken: string | null;
  amount: string | null;
  slippageBps: number | null;
}

export interface SwapFormApi {
  getState: () => SwapFormState;
  set: (partial: Partial<SwapFormState>) => void;
  /** Submit the swap (goes through wagmi → MetaMask via wallet-bridge).
   *  Resolves with the tx hash, or rejects on user rejection / failure. */
  submit: () => Promise<{ hash: string }>;
}

export interface VisibleMarket {
  symbol: string;
  vaultAddress: string;
  spotPrice: string;
  imv: string;
}

export interface MarketsApi {
  /** Whatever the markets page is currently showing (after filters). */
  getVisible: () => VisibleMarket[];
  /** Click into a specific market (navigates to /trade/<symbol>). */
  select: (symbol: string) => Promise<void>;
}

export interface UiContext {
  router: RouterApi;
  account: AccountApi;
  modals: ModalApi;
  swap: SwapFormApi;
  markets: MarketsApi;
  // Phase 3 will add: borrow, stake, presale, etc. Same shape pattern.
}
