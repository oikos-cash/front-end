import type { SlippageOption, FieldItem } from "@/types/interfaces";

// =================================================
//                   API CONFIG
// =================================================
/** Internal Next.js API routes (default for local dev) */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** Vault API — uses internal route or external backend */
export const VAULT_API_URL =
  process.env.NEXT_PUBLIC_VAULT_API_URL ?? "/api";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "wss://trollbox-ws.oikos.cash";

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const SUPPORTED_CHAIN_IDS = [56, 97] as const;

// =================================================
//                CONTRACT ADDRESSES
// =================================================
/** WBNB on BSC Mainnet */
export const WBNB_ADDRESS =
  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as const;

/** Oikos Factory on BSC Mainnet */
export const FACTORY_ADDRESS =
  "0x9F5973EC7E5f0781E0fCE71Dd949c997c38508Fc" as const;

/** Zero address constant */
export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

// =================================================
//                 WEBSOCKET CONFIG
// =================================================
// =================================================
//               BNB PRICE CONFIG
// =================================================
/** PancakeSwap V3 WBNB/USDT pool on BSC Mainnet */
export const BNB_USDT_POOL_ADDRESS =
  "0x7862d9b4be2156b15d54f41ee4ede2d5b0b455e4" as const;

export const BNB_PRICE_CACHE_KEY = "oikos_bnb_price_cache";
export const BNB_PRICE_CACHE_DURATION = 5 * 60 * 1000;
export const BNB_PRICE_REFRESH_INTERVAL = 30_000;
export const BNB_PRICE_FALLBACK = 0;

export const BNB_PRICE_API_URL = "/api/price/bnb";

// =================================================
//                 WEBSOCKET CONFIG
// =================================================
export const WS_PING_INTERVAL = 30_000;
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
export const WS_RECONNECT_BASE_DELAY = 5_000;

// =================================================
//                 SWR / CACHE CONFIG
// =================================================
export const SWR_DEDUPE_INTERVAL = 2000;
export const SWR_ERROR_RETRY_COUNT = 3;
export const SWR_ERROR_RETRY_INTERVAL = 5000;

export const SSR_REVALIDATE_SHORT = 30;
export const SSR_REVALIDATE_DEFAULT = 60;
export const SSR_REVALIDATE_LONG = 300;

// =================================================
//                   TOKEN CARD
// =================================================
export const STATUS_VARIANT = {
  graduated: "default",
  inProgress: "secondary",
  finalized: "outline",
  preparing: "ghost",
} as const;

export const HEALTH_VARIANT = {
  healthy: "default",
  warning: "destructive",
  critical: "destructive",
} as const;

// =================================================
//                 MARKETS CATALOG
// =================================================
export const MARKETS_PAGE_SIZE = 12;
export const MARKETS_MAX_TOKENS = 60;

// =================================================
//                 TRADES HISTORY
// =================================================
export const TRADES_PAGE_SIZE = 20;
export const TRADES_MAX_TRADES = 100;

// =================================================
//                  TRADE PANEL
// =================================================
export const SLIPPAGE_OPTIONS: Exclude<SlippageOption, "custom">[] = [
  "0.1",
  "0.5",
  "1",
];

// =================================================
//                 STAKE HISTORY
// =================================================
export const STAKE_HISTORY_PAGE_SIZE = 15;
export const STAKE_HISTORY_MAX_ITEMS = 60;

// =================================================
//                 LOAN HISTORY
// =================================================
export const LOAN_HISTORY_PAGE_SIZE = 15;
export const LOAN_HISTORY_MAX_ITEMS = 60;

// =================================================
//              LOAN HISTORY FILTERS
// =================================================
export const LOAN_HISTORY_FILTERS = [
  { value: "all", labelKey: "filterAll" },
  { value: "borrow", labelKey: "filterBorrow" },
  { value: "repay", labelKey: "filterRepay" },
  { value: "roll", labelKey: "filterRoll" },
];

// =================================================
//              BORROW FORM FIELDS
// =================================================
export const BORROW_FIELDS = [
  {
    name: "borrowAmount",
    type: "number",
    min: 0,
    step: "any",
    placeholder: "0.00",
  },
  { name: "duration", type: "select" },
] as const;

export const BORROW_DURATION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

// =================================================
//              STAKE FORM FIELDS
// =================================================
export const STAKE_FIELDS = [
  { name: "amount", type: "number", min: 0, step: "any", placeholder: "0.00" },
] as const;

// =================================================
//          PRESALE CONTRIBUTION FIELDS
// =================================================
export const PRESALE_CONTRIBUTION_FIELDS = [
  { name: "amount", type: "number", min: 0, step: "any" },
] as const;

// =================================================
//          LOAN ACTIVE POSITION TABS
// =================================================
export const LOAN_TAB_FIELDS = {
  repay: [
    {
      name: "repayAmount",
      type: "number",
      min: 0,
      step: "any",
      placeholder: "0.00",
    },
  ],
  roll: [{ name: "rollDuration", type: "select" }],
  addCollateral: [
    {
      name: "collateralAmount",
      type: "number",
      min: 0,
      step: "any",
      placeholder: "0.00",
    },
  ],
} as const;

// =================================================
//                  ROLL DURATION
// =================================================
export const ROLL_DURATION_OPTIONS = [
  { value: "2592000", label: "30 days" },
  { value: "5184000", label: "60 days" },
  { value: "7776000", label: "90 days" },
  { value: "15552000", label: "180 days" },
  { value: "31536000", label: "1 year" },
];

// =================================================
//               LIQUIDITY POOLS
// =================================================
export const LIQUIDITY_POOLS = [
  { value: "oks", label: "OKS / WBNB" },
  { value: "sfl", label: "SFL / WBNB" },
  { value: "nxd", label: "NXD / WBNB" },
  { value: "aqf", label: "AQF / WBNB" },
  { value: "vtx", label: "VTX / WBNB" },
];

// =================================================
//               LIQUIDITY DETAILS
// =================================================
export const LABEL_COLORS: Record<string, string> = {
  reservesWbnb: "text-yellow-400",
  reservesOks: "text-green-400",
  capacityOks: "text-green-400",
  tickLower: "text-orange-400",
  tickUpper: "text-orange-400",
};

// =================================================
//                     PRESALE
// =================================================
export const PRESALE_STATUS_VARIANT = {
  active: "default",
  ended: "secondary",
  finalized: "outline",
} as const;

// =================================================
//                     STUDIO
// =================================================
export const STUDIO_TOKEN_STATUS_VARIANT = {
  active: "default",
  presale: "secondary",
  paused: "destructive",
} as const;

export const STUDIO_TOKEN_STATS = [
  "price",
  "volume24h",
  "holders",
  "liquidity",
] as const;

// =================================================
//               DIVIDEND HISTORY
// =================================================
export const DIVIDEND_HISTORY_PAGE_SIZE = 15;
export const DIVIDEND_HISTORY_MAX_ITEMS = 60;

// =================================================
//                    LAUNCHPAD
// =================================================
export const PRESALE_DURATION_OPTIONS = [
  { value: "259200", label: "3 days" },
  { value: "604800", label: "7 days" },
  { value: "1209600", label: "14 days" },
  { value: "2592000", label: "30 days" },
  { value: "5184000", label: "60 days" },
  { value: "7776000", label: "90 days" },
];

export const PROTOCOL_OPTIONS = [
  { value: "uniswap", label: "Uniswap" },
  { value: "pancakeswap", label: "PancakeSwap" },
];

export const RESERVE_ASSET_OPTIONS = [{ value: "wbnb", label: "WBNB" }];

// Launchpad field overrides
export const LAUNCHPAD_TOKEN_FIELD_OVERRIDES: Record<
  string,
  Partial<FieldItem>
> = {
  tokenDescription: { maxLength: 500, rows: 4 } as Partial<FieldItem>,
  tokenLogoUrl: {
    accept: "image/png,image/jpeg,image/svg+xml,image/webp",
  } as Partial<FieldItem>,
};

export const LAUNCHPAD_POOL_FIELD_OVERRIDES: Record<
  string,
  Partial<FieldItem>
> = {
  floorPrice: { min: 0, step: "any" } as Partial<FieldItem>,
  totalSupply: { min: 0, step: "any" } as Partial<FieldItem>,
};

export const LAUNCHPAD_PRESALE_FIELD_OVERRIDES: Record<
  string,
  Partial<FieldItem>
> = {
  softCapPercent: { min: 20, max: 60, step: 1 } as Partial<FieldItem>,
};

// Launchpad select items
export const LAUNCHPAD_POOL_SELECT_ITEMS: Record<
  string,
  { value: string; label: string }[]
> = {
  reserveAsset: RESERVE_ASSET_OPTIONS,
  protocol: PROTOCOL_OPTIONS,
};

export const LAUNCHPAD_PRESALE_SELECT_ITEMS: Record<
  string,
  { value: string; label: string }[]
> = {
  presaleDuration: PRESALE_DURATION_OPTIONS,
};

export const LAUNCHPAD_STEPS = [
  { path: "/launchpad/token", label: "Token Info" },
  { path: "/launchpad/pool", label: "Pool Setup" },
  { path: "/launchpad/presale", label: "Presale" },
  { path: "/launchpad/preview", label: "Preview & Launch" },
];

export const LAUNCHPAD_STEP_LABELS = [
  "stepTokenInfo",
  "stepPoolSetup",
  "stepPresale",
  "stepPreview",
] as const;

// =================================================
//                      SWAP
// =================================================
export const SWAP_HISTORY_PAGE_SIZE = 15;
export const SWAP_HISTORY_MAX_ITEMS = 60;

export const SWAP_TOKENS: { value: string; label: string }[] = [
  { value: "BNB", label: "BNB" },
  { value: "WBNB", label: "WBNB" },
  { value: "OKS", label: "OKS" },
  { value: "SFL", label: "SolarFlare" },
  { value: "NXD", label: "NexusDAO" },
  { value: "AQF", label: "AquaFi" },
  { value: "VTX", label: "VortexSwap" },
  { value: "USDT", label: "USDT" },
];

export const SWAP_SLIPPAGE_OPTIONS = ["0.1", "0.5", "1"] as const;

export const SWAP_ROUTES = [
  { dex: "PancakeSwap V3", share: 80 },
  { dex: "Uniswap V3", share: 15 },
  { dex: "BiSwap", share: 5 },
];

// =================================================
//                       SEO
// =================================================
export const SITE_URL = "https://oikos.finance";
export const SITE_NAME = "Oikos";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

export const SITE_LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  es: "es_ES",
};

export const STATIC_ROUTES = [
  "/",
  "/markets",
  "/swap",
  "/dividends",
  "/studio",
  "/launchpad/token",
  "/launchpad/pool",
  "/launchpad/presale",
  "/launchpad/preview",
] as const;

export const DYNAMIC_ROUTE_PREFIXES = [
  "/borrow",
  "/stake",
  "/liquidity",
  "/presale",
  "/dividends",
  "/studio",
] as const;
