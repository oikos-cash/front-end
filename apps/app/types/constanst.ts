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
//               LIQUIDITY DETAILS
// =================================================
export const LABEL_COLORS: Record<string, string> = {
  reservesWbnb: "text-yellow-400",
  reservesOks: "text-green-400",
  capacityOks: "text-green-400",
  tickLower: "text-orange-400",
  tickUpper: "text-orange-400",
};
