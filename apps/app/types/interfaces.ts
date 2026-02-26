// =================================================
//                      ATOMS
// =================================================
export interface AccordionProps {
  type?: "single" | "multiple";
  className?: string;
  items: { value: string; trigger: React.ReactNode; content: React.ReactNode }[];
}

export interface AlertProps {
  title: string;
  description: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
}

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "link";
}

export interface EmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  iconVariant?: "default" | "icon";
}

export interface DrawerProps {
  title: string;
  close?: React.ReactNode;
  footer?: React.ReactNode;
  content?: React.ReactNode;
  children: React.ReactNode;
  direction?: "top" | "bottom" | "left" | "right";
  description?: string;
}

export interface TableProps<TData, TValue> {
  columns: import("@tanstack/react-table").ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
}

export interface TokenIconProps {
  token: string;
  iconUrl?: string;
  size?: number;
}

export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

export interface SelectProps {
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  items: { value: string; label: string; href?: string }[];
}

// =================================================
//                     MOLECULES
// =================================================
export interface StatsCardProps {
  variant: "spot" | "volume" | "marketCap" | "imv";
  title: string;
  subtitle?: string;
  value: string;
  change?: string;
  secondary: string;
}

// =================================================
//                     ORGANISMS
// =================================================
export interface Trade {
  id: string;
  type: "buy" | "sell";
  token: string;
  amount: number;
  price: number;
  bnbAmount: number;
  usdValue: number;
  wallet: string;
  txHash: string;
  timestamp: Date;
}

export interface TradesHistoryProps {
  token?: string;
}

export interface PriceChartProps {
  token?: string;
}

export interface OHLCVBar {
  time: import("lightweight-charts").UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const CHART_INTERVALS = ["1h", "4h", "1d", "1w"] as const;
export const CHART_PERIODS = ["1d", "5d", "1m", "3m", "6m", "1y"] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];
export type ChartType = "bars" | "line";

// =================================================
//                      LAYOUTS
// =================================================
export interface SidebarProps {
  children: React.ReactNode;
}

// =================================================
//                     TEMPLATES
// =================================================

// =================================================
//                       PAGES
// =================================================

// =================================================
//                     FUNCTIONS
// =================================================

// =================================================
//                      STORES
// =================================================
export interface TokenBalance {
  token: string;
  iconUrl?: string;
  amount: string;
  usd: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balances: TokenBalance[];
  totalValue: string;
  handleConnect: () => void;
  handleDisconnect: () => void;
}
