// =================================================
//                      ATOMS
// =================================================
export interface ButtonAtomProps
  extends React.ComponentProps<"button"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  asChild?: boolean;
  isLoading?: boolean;
}

export interface CardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

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
  label?: string;
  description?: string;
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

export interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
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

export interface InputProps extends React.ComponentProps<"input"> {
  className?: string;
}

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  className?: string;
}

export interface FieldProps {
  name: string;
  control: import("react-hook-form").Control<any>;
  label?: string;
  description?: React.ReactNode;
  children:
    | React.ReactNode
    | ((field: import("react-hook-form").ControllerRenderProps<any, string>) => React.ReactNode);
  className?: string;
  orientation?: "vertical" | "horizontal" | "responsive";
  t?: (key: string) => string;
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

export interface KpiCardProps {
  title: string;
  description?: string;
  subtitle?: string;
  value: string;
  change?: string;
  secondary?: string;
  actions?: React.ReactNode;
}

// =================================================
//                   FIELD RENDERER
// =================================================
interface FieldItemBase {
  name: string;
  label?: string;
  description?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  endContent?: React.ReactNode;
}

export interface InputFieldItem extends FieldItemBase {
  type: "text" | "number" | "email" | "tel" | "password" | "url" | "search";
  min?: string | number;
  max?: string | number;
  step?: string | number;
  pattern?: string;
  autoComplete?: string;
  readOnly?: boolean;
  inputClassName?: string;
}

export interface SelectFieldItem extends FieldItemBase {
  type: "select";
  items: { value: string; label: string; href?: string }[];
  defaultValue?: string;
}

export interface CheckboxFieldItem extends FieldItemBase {
  type: "checkbox";
}

export interface TextareaFieldItem extends FieldItemBase {
  type: "textarea";
  rows?: number;
  maxLength?: number;
  textareaClassName?: string;
}

export type FieldItem =
  | InputFieldItem
  | SelectFieldItem
  | CheckboxFieldItem
  | TextareaFieldItem;

export interface FieldRendererProps {
  fields: FieldItem[];
  control: import("react-hook-form").Control<any>;
  t?: (key: string) => string;
  className?: string;
}

// =================================================
//                     ORGANISMS
// =================================================
export interface StakeFormPanelProps {
  token?: string;
}

export interface StakeFormValues {
  amount: string;
}

export interface StakeHistoryItem {
  id: string;
  type: "stake" | "unstake";
  amount: number;
  rewards: number;
  token: string;
  txHash: string;
  timestamp: Date;
}

export interface StakeHistoryProps {
  token?: string;
}

export interface TradeFormValues {
  amount: string;
  customSlippage: string;
  useWbnb: boolean;
  approveMax: boolean;
}

export interface StakeMockData {
  tokenSymbol: string;
  sTokenSymbol: string;
  totalStaked: number;
  apr30d: number;
  totalRewards: number;
  userStaked: number;
  userSTokenBalance: number;
  userRewards: number;
  cooldownEndsAt: number | null;
  userBalance: number;
}

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
export interface StakeTemplateProps {
  token?: string;
}

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
