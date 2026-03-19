// =================================================
//                      ATOMS
// =================================================
export interface ButtonAtomProps extends React.ComponentProps<"button"> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?:
    | "default"
    | "xs"
    | "sm"
    | "lg"
    | "icon"
    | "icon-xs"
    | "icon-sm"
    | "icon-lg";
  asChild?: boolean;
  isLoading?: boolean;
}

export interface CardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export interface AccordionProps {
  type?: "single" | "multiple";
  className?: string;
  items: {
    value: string;
    trigger: React.ReactNode;
    content: React.ReactNode;
  }[];
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

export interface SheetProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  content: React.ReactNode;
  footer?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  submitLabel?: string;
  onSubmit?: () => void;
  cancelLabel?: string;
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
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  items: { value: string; label: string; href?: string }[];
}

export interface FileUploadProps {
  value?: string;
  onChange?: (value: string) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
  className?: string;
}

export interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
}

export interface InputProps extends React.ComponentProps<"input"> {
  className?: string;
  startIcon?: React.ReactNode;
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
    | ((
        field: import("react-hook-form").ControllerRenderProps<any, string>,
      ) => React.ReactNode);
  className?: string;
  orientation?: "vertical" | "horizontal" | "responsive";
  t?: (key: string) => string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

// =================================================
//                     MOLECULES
// =================================================
export type TokenStatus =
  | "graduated"
  | "inProgress"
  | "finalized"
  | "preparing";
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

export interface SliderFieldItem extends FieldItemBase {
  type: "slider";
  min?: number;
  max?: number;
  step?: number;
}

export interface FileFieldItem extends FieldItemBase {
  type: "file";
  accept?: string;
}

export type FieldItem =
  | InputFieldItem
  | SelectFieldItem
  | CheckboxFieldItem
  | TextareaFieldItem
  | SliderFieldItem
  | FileFieldItem;

export interface FieldRendererProps {
  fields: FieldItem[];
  control: import("react-hook-form").Control<any>;
  t?: (key: string) => string;
  className?: string;
}

// =================================================
//                     ORGANISMS
// =================================================
export interface PriceTableToken {
  token: string;
  price: string;
  change24h: number;
  fdv: string;
}

export interface AvatarInfoProps {
  title: string;
  subtitle?: string;
  src?: string;
  size?: "sm" | "default" | "lg";
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TradeInfoRow {
  label: string;
  value: string;
  variant?: "default" | "success" | "destructive";
}

export interface TradeInfoProps {
  rows: TradeInfoRow[];
  className?: string;
}

export interface BannerProps {
  namespace: string;
  href: string;
  variant?: "default" | "outline";
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export interface I18nCardConfig {
  title: string;
  description: string;
  help?: string;
  required?: boolean;
  fields: { type: string; name: string; placeholder?: string }[];
}

export interface I18nPreviewCard {
  title: string;
  description: string;
  presaleOnly?: boolean;
  rows: { label: string; key: string }[];
}

export interface LaunchpadTokenFormValues {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription?: string;
  enablePresale: string;
  tokenLogoUrl?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
}

export interface LaunchpadPoolFormValues {
  floorPrice: string;
  totalSupply: string;
  reserveAsset: string;
  protocol: string;
}

export interface LaunchpadPresaleFormValues {
  presaleDuration: string;
  softCapPercent: number;
}

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

export interface StakeActivePositionProps {
  token?: string;
}

export interface BorrowFormPanelProps {
  token?: string;
}

export interface BorrowFormValues {
  borrowAmount: string;
  duration: string;
}

export interface LoanHistoryItem {
  id: string;
  type: "borrow" | "repay" | "roll";
  amount: number;
  collateral: number;
  fees: number;
  token: string;
  txHash: string;
  timestamp: Date;
}

export interface LoanHistoryProps {
  token?: string;
}

export interface LoanActivePositionProps {
  token?: string;
}

export type LoanActionTab = "repay" | "roll" | "addCollateral";

export interface ActiveLoanMockData {
  token: string;
  quoteToken: string;
  borrowedAmount: number;
  collateralAmount: number;
  ltv: number;
  daysLeft: number;
  expiresAt: number;
  dailyInterest: number;
  totalInterestAccrued: number;
  imv: number;
  isSelfRepaying: boolean;
  isExpired: boolean;
  hasActiveLoan: boolean;
}

export interface RepayFormValues {
  repayAmount: string;
}

export interface RollFormValues {
  rollDuration: string;
}

export interface AddCollateralFormValues {
  collateralAmount: string;
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

export interface CrosshairData {
  visible: boolean;
  x: number;
  y: number;
  time: string;
  price: string;
  volume: string;
}

export interface PriceChartRendererProps {
  ready: boolean;
  crosshairData: CrosshairData;
  containerRef: React.RefObject<HTMLDivElement | null>;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
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

export interface PresaleMockData {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenLogoUrl: string;
  price: number;
  hardCap: number;
  softCap: number;
  totalSupply: number;
  raised: number;
  contributors: number;
  endsAt: number;
  status: "active" | "ended" | "finalized";
  softCapReached: boolean;
  minContribution: number;
  maxContribution: number;
  userContribution: number;
  userTokens: number;
  deployer: string;
  isDeployer: boolean;
}

export interface PresaleAdminControlsProps {
  status: PresaleMockData["status"];
  softCapReached: boolean;
  isDeployer: boolean;
}

export interface PresaleContributionFormValues {
  amount: string;
}

export interface PresaleContributionFormProps {
  price: number;
  minContribution: number;
  maxContribution: number;
  status: "active" | "ended" | "finalized";
  userBalance: number;
}

export interface LiquidityChartProps {
  bars: LiquidityBar[];
  spotPrice: number;
}

export interface LiquidityChartTooltipData {
  bar: LiquidityBar;
  x: number;
  y: number;
}

export interface LiquidityChartInnerProps {
  width: number;
  height: number;
  bars: LiquidityBar[];
  spotPrice: number;
  onReady: () => void;
  onHover: (data: LiquidityChartTooltipData) => void;
  onLeave: () => void;
}

export interface DividendToken {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  totalDistributed: number;
  unvested: number;
  vested: number;
}

export interface VestingEntry {
  id: string;
  amount: number;
  claimed: number;
  startDate: Date;
  unlockDate: Date;
  vestedPercent: number;
  withdrawable: number;
  stillLocked: number;
  isFullyUnlocked: boolean;
}

export interface DividendTokenDetailData {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  totalDistributed: number;
  unvested: number;
  vested: number;
  vestingEntries: VestingEntry[];
}

export interface DividendClaimHistory {
  id: string;
  type: "lock" | "withdraw";
  token: string;
  amount: number;
  txHash: string;
  timestamp: Date;
}

export interface DividendClaimHistoryProps {
  token?: string;
}

export interface PresaleProgressProps {
  raised: number;
  hardCap: number;
  softCap: number;
  softCapReached: boolean;
  contributors: number;
  endsAt: number;
  status: "active" | "ended" | "finalized";
}

export interface StudioTokenListProps {
  tokens: StudioToken[];
}

export interface StudioToken {
  id: string;
  name: string;
  symbol: string;
  status: "active" | "presale" | "paused";
  price: number;
  change24h: number;
  volume24h: number;
  totalVolume: number;
  holders: number;
  liquidity: number;
  earnings: number;
  createdAt: Date;
}

export interface StudioStats {
  totalTokens: number;
  totalVolume: number;
  totalHolders: number;
  totalLiquidity: number;
  totalEarnings: number;
}

export interface StudioActivityItem {
  id: string;
  type: "trade" | "stake" | "lp_add" | "lp_remove";
  token: string;
  amount: number;
  wallet: string;
  timestamp: Date;
}

export interface SwapToken {
  symbol: string;
  name: string;
  iconUrl: string;
  balance: number;
  price: number;
}

export interface SwapFormValues {
  fromToken: string;
  toToken: string;
  fromAmount: string;
}

export interface RecentSwap {
  id: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  timestamp: Date;
}

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
export interface PageSeoConfig {
  page: string;
  params?: Record<string, string>;
}

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
export interface LaunchpadState {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenDecimals: number;
  enablePresale: boolean;
  tokenLogoUrl: string;
  website: string;
  twitter: string;
  discord: string;
  telegram: string;
  floorPrice: string;
  totalSupply: string;
  reserveAsset: string;
  protocol: string;
  presaleDuration: string;
  softCapPercent: number;
  completedSteps: number[];
  setTokenInfo: (data: Partial<LaunchpadState>) => void;
  setPoolConfig: (data: Partial<LaunchpadState>) => void;
  setPresaleConfig: (data: Partial<LaunchpadState>) => void;
  markStepCompleted: (step: number) => void;
  getMissingFields: () => MissingField[];
  isReadyToDeploy: () => boolean;
  reset: () => void;
}

export interface MissingField {
  key: string;
  path: string;
}

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
