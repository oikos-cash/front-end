import type { SlippageOption } from "@/types/interfaces";

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
export const SLIPPAGE_OPTIONS: Exclude<SlippageOption, "custom">[] = ["0.1", "0.5", "1"];

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
//                  BORROW FORM
// =================================================
export const BORROW_DURATION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
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

export const RESERVE_ASSET_OPTIONS = [
  { value: "wbnb", label: "WBNB" },
];

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
