// =================================================
//                      ATOMS
// =================================================
export interface AccordionProps {
  type?: "single" | "multiple";
  className?: string;
  items: { value: string; trigger: React.ReactNode; content: React.ReactNode }[];
}

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
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

export interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
}

// =================================================
//                     MOLECULES
// =================================================
export type TokenStatus = "graduated" | "inProgress" | "finalized" | "preparing";
export type TokenHealth = "healthy" | "warning" | "critical";

export interface MarketToken {
  id: string;
  name: string;
  symbol: string;
  description: string;
  iconUrl?: string;
  status: TokenStatus;
  health: TokenHealth;
  isPresale: boolean;
  marketCap?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  createdAt?: Date;
  raised?: number;
  hardCap?: number;
}

export interface TokenCardProps {
  token: MarketToken;
}

export interface TokenCardSkeletonProps {
  count?: number;
}

export interface StatsCardProps {
  variant: "spot" | "volume" | "marketCap" | "imv";
  title: string;
  subtitle?: string;
  value: string;
  change?: string;
  secondary: string;
  actions?: React.ReactNode;
}

// =================================================
//                     ORGANISMS
// =================================================
export type TradeSide = "buy" | "sell";
export type SlippageOption = "0.1" | "0.5" | "1" | "custom";

export interface NetworkFee {
  gwei: number;
  bnb: number;
  usd: number;
}
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
export interface LiquidityBar {
  name: string;
  from: number;
  to: number;
  height: number;
  fill: string;
  amount0: number;
  amount1: number;
}

export interface LiquidityTick {
  price: number;
  usd: number;
  tick: number;
}

export interface LiquidityDetail {
  label: string;
  floor: string;
  anchor: string;
  discovery: string;
}

export interface LiquidityData {
  spotPrice: number;
  spotBnb: number;
  liquidityRatio: number;
  circulatingSupply: number;
  imvPrice: number;
  bars: LiquidityBar[];
  details: LiquidityDetail[];
}

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
