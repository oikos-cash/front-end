import type {
  OHLCVBar,
  ChartPeriod,
  LiquidityBar,
  LiquidityData,
  LiquidityDetail,
  MarketToken,
  TokenStatus,
  TokenHealth,
  TradeSide,
  NetworkFee,
  StakeMockData,
  StakeHistoryItem,
  LoanHistoryItem,
  PresaleMockData,
  DividendToken,
  DividendClaimHistory,
  StudioToken,
  StudioStats,
  StudioActivityItem,
  SwapToken,
  RecentSwap,
  ActiveLoanMockData,
  VestingEntry,
  DividendTokenDetailData,
  PriceTableToken,
} from "@/types/interfaces";
import type { UTCTimestamp } from "lightweight-charts";

/**
 * Maps a chart period label to the corresponding number of calendar days.
 *
 * @param period - The chart period identifier (e.g. "1d", "5d", "1m", "3m", "6m", "1y")
 * @returns The number of days represented by the period
 */
export function getPeriodDays(period: ChartPeriod): number {
  switch (period) {
    case "1d":
      return 1;
    case "5d":
      return 5;
    case "1m":
      return 30;
    case "3m":
      return 90;
    case "6m":
      return 180;
    case "1y":
      return 365;
  }
}

/**
 * Maps a chart interval string to the corresponding number of minutes.
 *
 * @param interval - The interval identifier (e.g. "1h", "4h", "1d", "1w")
 * @returns The number of minutes in the interval, defaults to 60 for unrecognized values
 */
export function getIntervalMinutes(interval: string): number {
  switch (interval) {
    case "1h":
      return 60;
    case "4h":
      return 240;
    case "1d":
      return 1440;
    case "1w":
      return 10080;
    default:
      return 60;
  }
}

/**
 * Generates randomized mock OHLCV (Open-High-Low-Close-Volume) candlestick data
 * for a given chart period and interval. Prices start near 0.15 and walk randomly.
 *
 * @param period - The chart period determining the total time span (e.g. "1d", "1m", "1y")
 * @param interval - The candlestick interval (e.g. "1h", "4h", "1d", "1w")
 * @returns An array of OHLCVBar objects with randomized price and volume data
 */
export function generateMockOHLCV(
  period: ChartPeriod,
  interval: string,
): OHLCVBar[] {
  const days = getPeriodDays(period);
  const intervalMinutes = getIntervalMinutes(interval);
  const totalMinutes = days * 24 * 60;
  const count = Math.max(Math.floor(totalMinutes / intervalMinutes), 20);

  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = intervalMinutes * 60;
  const startTime = now - count * intervalSeconds;

  let price = 0.15 + Math.random() * 0.05;
  const bars: OHLCVBar[] = [];

  for (let i = 0; i < count; i++) {
    const time = (startTime + i * intervalSeconds) as UTCTimestamp;
    const open = price;
    const change1 = (Math.random() - 0.48) * 0.008;
    const change2 = (Math.random() - 0.48) * 0.008;
    const mid = Math.max(0.01, open + change1);
    const close = Math.max(0.01, mid + change2);
    const high = Math.max(open, close, mid) + Math.random() * 0.003;
    const low = Math.min(open, close, mid) - Math.random() * 0.003;
    const volume = Math.floor(Math.random() * 50000) + 5000;

    bars.push({
      time,
      open: parseFloat(open.toFixed(6)),
      high: parseFloat(Math.max(0.01, high).toFixed(6)),
      low: parseFloat(Math.max(0.01, low).toFixed(6)),
      close: parseFloat(close.toFixed(6)),
      volume,
    });
    price = close;
  }

  return bars;
}

export const LIQUIDITY_CHART_MARGIN = {
  top: 10,
  right: 10,
  bottom: 30,
  left: 10,
};

/**
 * Generates randomized mock liquidity data including spot price, IMV price,
 * liquidity bars (Floor, Anchor, Discovery zones), and detailed tick information.
 *
 * @returns A LiquidityData object with randomized prices, ratios, supply, bars, and details
 */
export function generateMockLiquidity(): LiquidityData {
  const spotBnb = 0.0002 + Math.random() * 0.0003;
  const spotPrice = spotBnb * (580 + Math.random() * 80);
  const liquidityRatio = 1.0 + Math.random() * 1.5;
  const circulatingSupply = Math.floor(140000 + Math.random() * 60000);
  const imvPrice = spotPrice * (0.3 + Math.random() * 0.3);

  const boundary = spotBnb + 0.0001 + Math.random() * 0.0002;
  const bars: LiquidityBar[] = [
    {
      name: "Floor",
      from: spotBnb * 0.8,
      to: spotBnb * 0.85,
      height: 0.7 + Math.random() * 0.3,
      fill: "#f5c843",
      amount0: Math.random() * 0.01,
      amount1: 15 + Math.random() * 15,
    },
    {
      name: "Anchor",
      from: spotBnb * 0.85,
      to: boundary,
      height: 0.1 + Math.random() * 0.2,
      fill: "#d4a84b",
      amount0: 5000 + Math.random() * 8000,
      amount1: 2 + Math.random() * 5,
    },
    {
      name: "Discovery",
      from: boundary + 0.0001,
      to: 0.0012,
      height: 0.2 + Math.random() * 0.2,
      fill: "#86efac",
      amount0: 300000 + Math.random() * 300000,
      amount1: 0,
    },
  ];

  const tickFmt = (price: number, usd: number, tick: number) =>
    `${price.toFixed(9)}  ($${usd.toFixed(4)}) Tick: ${tick}`;

  const floorResBnb = 15 + Math.random() * 15;
  const anchorResBnb = 2 + Math.random() * 5;

  const floorResOks = Math.random() * 0.01;
  const anchorResOks = 5000 + Math.random() * 8000;
  const discoveryResOks = 300000 + Math.random() * 300000;

  const floorCap = 150000 + Math.random() * 50000;
  const anchorCap = 20000 + Math.random() * 20000;

  const floorTickLower = {
    price: (imvPrice / spotPrice) * spotBnb * 0.99,
    usd: imvPrice * 0.99,
    tick: -89820 + Math.floor(Math.random() * 200),
  };
  const floorTickUpper = {
    price: (imvPrice / spotPrice) * spotBnb * 1.01,
    usd: imvPrice * 1.01,
    tick: -89760 + Math.floor(Math.random() * 200),
  };
  const anchorTickLower = {
    price: spotBnb * 0.98,
    usd: spotPrice * 0.98,
    tick: -89760 + Math.floor(Math.random() * 200),
  };
  const anchorTickUpper = {
    price: spotBnb * 1.5,
    usd: spotPrice * 1.5,
    tick: -77280 + Math.floor(Math.random() * 200),
  };
  const discoveryTickLower = {
    price: spotBnb * 1.5,
    usd: spotPrice * 1.5,
    tick: -76860 + Math.floor(Math.random() * 200),
  };
  const discoveryTickUpper = {
    price: spotBnb * 3.5,
    usd: spotPrice * 3.5,
    tick: -68100 + Math.floor(Math.random() * 200),
  };

  const details: LiquidityDetail[] = [
    {
      label: "reservesWbnb",
      floor: floorResBnb.toFixed(7),
      anchor: anchorResBnb.toFixed(7),
      discovery: "0.0000000",
    },
    {
      label: "reservesOks",
      floor: floorResOks.toFixed(5),
      anchor: anchorResOks.toFixed(5),
      discovery: discoveryResOks.toFixed(5),
    },
    {
      label: "capacityOks",
      floor: floorCap.toFixed(7),
      anchor: anchorCap.toFixed(7),
      discovery: "n/a",
    },
    {
      label: "tickLower",
      floor: tickFmt(
        floorTickLower.price,
        floorTickLower.usd,
        floorTickLower.tick,
      ),
      anchor: tickFmt(
        anchorTickLower.price,
        anchorTickLower.usd,
        anchorTickLower.tick,
      ),
      discovery: tickFmt(
        discoveryTickLower.price,
        discoveryTickLower.usd,
        discoveryTickLower.tick,
      ),
    },
    {
      label: "tickUpper",
      floor: tickFmt(
        floorTickUpper.price,
        floorTickUpper.usd,
        floorTickUpper.tick,
      ),
      anchor: tickFmt(
        anchorTickUpper.price,
        anchorTickUpper.usd,
        anchorTickUpper.tick,
      ),
      discovery: tickFmt(
        discoveryTickUpper.price,
        discoveryTickUpper.usd,
        discoveryTickUpper.tick,
      ),
    },
  ];

  return {
    spotPrice,
    spotBnb,
    liquidityRatio,
    circulatingSupply,
    imvPrice,
    bars,
    details,
  };
}

// =================================================
//                STAKING MOCK
// =================================================
const COOLDOWN_DAYS = 3;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * Generates randomized mock staking data for a given token, including pool totals,
 * user balances, APR, rewards, and cooldown state.
 *
 * @param token - The token symbol to generate staking data for (defaults to "OKS")
 * @returns A StakeMockData object with randomized staking metrics
 */
export function generateMockStakeData(token = "OKS"): StakeMockData {
  const totalStaked = 850000 + Math.random() * 400000;
  const totalRewards = 12000 + Math.random() * 8000;
  const apr30d = 8 + Math.random() * 18;
  const userStaked = 1200 + Math.random() * 3000;
  const userRewards = userStaked * (apr30d / 100) * (30 / 365);
  const userSTokenBalance = userStaked + userRewards;
  const userBalance = 500 + Math.random() * 2000;

  const hasCooldown = Math.random() > 0.5;
  const cooldownEndsAt = hasCooldown
    ? Date.now() + Math.random() * COOLDOWN_MS
    : null;

  return {
    tokenSymbol: token,
    sTokenSymbol: `s${token}`,
    totalStaked: parseFloat(totalStaked.toFixed(2)),
    apr30d: parseFloat(apr30d.toFixed(2)),
    totalRewards: parseFloat(totalRewards.toFixed(4)),
    userStaked: parseFloat(userStaked.toFixed(4)),
    userSTokenBalance: parseFloat(userSTokenBalance.toFixed(4)),
    userRewards: parseFloat(userRewards.toFixed(4)),
    cooldownEndsAt,
    userBalance: parseFloat(userBalance.toFixed(4)),
  };
}

/**
 * Formats a numeric value into a compact string with K/M suffixes for large numbers.
 *
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places for values below 1,000 (defaults to 4)
 * @returns A formatted string (e.g. "1.25M", "50.00K", or "123.4567")
 */
export function formatStakeNumber(value: number, decimals = 4): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value > 0 && value < 1e-4) {
    // Avoid scientific notation ("3.578e-6") in the UI. Pick enough
    // decimals to show ~4 significant figures, then strip trailing zeros.
    const sig = 4;
    const exp = Math.floor(Math.log10(value));
    const places = Math.max(sig - exp - 1, decimals);
    return value.toFixed(places).replace(/\.?0+$/, "");
  }
  return value.toFixed(decimals);
}

/**
 * Generates a paginated list of randomized mock stake/unstake history items.
 *
 * @param count - Number of history items to generate
 * @param offset - Starting index for pagination (used for unique IDs and timestamps)
 * @param token - The token symbol (defaults to "OKS")
 * @returns An array of StakeHistoryItem objects with randomized amounts and transaction hashes
 */
export function generateMockStakeHistory(
  count: number,
  offset: number,
  token = "OKS",
): StakeHistoryItem[] {
  const wallets = [
    "0x1a2B3c4D5e6F7890abCdEf1234567890AbCdEf12",
    "0xaBcDeF1234567890aBcDeF1234567890AbCdEf34",
    "0x9876543210FeDcBa9876543210FeDcBa98765432",
  ];

  return Array.from({ length: count }, (_, i) => {
    const index = offset + i;
    const isStake = Math.random() > 0.35;
    const amount = parseFloat((500 + Math.random() * 5000).toFixed(4));
    const rewards = isStake
      ? 0
      : parseFloat((amount * (0.02 + Math.random() * 0.08)).toFixed(4));

    return {
      id: `stake-${index}`,
      type: isStake ? ("stake" as const) : ("unstake" as const),
      amount,
      rewards,
      token,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      timestamp: new Date(Date.now() - index * 120000 - Math.random() * 300000),
    };
  });
}

// =================================================
//                BORROW MOCK
// =================================================

export interface BorrowMockData {
  tokenPair: string;
  imv: number;
  dailyInterest: number;
  protocolStatus: "active" | "paused";
  userCollateral: number;
  userBorrowed: number;
  userBalance: number;
}

/**
 * Generates randomized mock borrow protocol data for a given token,
 * including IMV ratio, daily interest, user collateral, and borrowed amount.
 *
 * @param token - The token symbol (defaults to "OKS")
 * @returns A BorrowMockData object with randomized borrowing metrics
 */
export function generateMockBorrowData(token = "OKS"): BorrowMockData {
  const imv = 0.05 + Math.random() * 0.15;
  const dailyInterest = 0.01 + Math.random() * 0.05;
  const userCollateral = 2000 + Math.random() * 8000;
  const userBorrowed = 500 + Math.random() * 3000;
  const userBalance = 1000 + Math.random() * 5000;

  return {
    tokenPair: `${token}/WBNB`,
    imv: parseFloat(imv.toFixed(4)),
    dailyInterest: parseFloat(dailyInterest.toFixed(4)),
    protocolStatus: Math.random() > 0.1 ? "active" : "paused",
    userCollateral: parseFloat(userCollateral.toFixed(4)),
    userBorrowed: parseFloat(userBorrowed.toFixed(4)),
    userBalance: parseFloat(userBalance.toFixed(4)),
  };
}

/**
 * Generates a paginated list of randomized mock loan history items (borrow, repay, roll).
 *
 * @param count - Number of history items to generate
 * @param offset - Starting index for pagination (used for unique IDs and timestamps)
 * @param token - The token symbol (defaults to "OKS")
 * @returns An array of LoanHistoryItem objects with randomized amounts, collateral, and fees
 */
export function generateMockLoanHistory(
  count: number,
  offset: number,
  token = "OKS",
): LoanHistoryItem[] {
  const types: LoanHistoryItem["type"][] = ["borrow", "repay", "roll"];

  return Array.from({ length: count }, (_, i) => {
    const index = offset + i;
    const type = types[index % 3]!;
    const amount = parseFloat((100 + Math.random() * 5000).toFixed(4));
    const collateral = parseFloat(
      (amount * (1.2 + Math.random() * 0.8)).toFixed(4),
    );
    const fees = parseFloat(
      (amount * (0.005 + Math.random() * 0.02)).toFixed(4),
    );

    return {
      id: `loan-${index}`,
      type,
      amount,
      collateral,
      fees,
      token,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      timestamp: new Date(Date.now() - index * 180000 - Math.random() * 600000),
    };
  });
}

/**
 * Calculates the collateral required for a borrow position.
 * Formula: borrowAmount / imv.
 *
 * @param borrowAmount - The amount being borrowed in quote token
 * @param imv - Intrinsic Market Value ratio (0-1)
 * @returns The required collateral amount, or 0 if inputs are invalid
 */
export function calculateCollateralRequired(
  borrowAmount: number,
  imv: number,
): number {
  if (borrowAmount <= 0 || imv <= 0) return 0;
  return parseFloat((borrowAmount / imv).toFixed(4));
}

/**
 * Calculates the total fees for a loan over a given duration.
 * Formula: borrowAmount * dailyRate * duration.
 *
 * @param borrowAmount - The amount being borrowed
 * @param duration - Loan duration in days
 * @param dailyRate - Daily interest rate as a decimal (e.g. 0.01 for 1%)
 * @returns The total fee amount, or 0 if any input is invalid
 */
export function calculateLoanFees(
  borrowAmount: number,
  duration: number,
  dailyRate: number,
): number {
  if (borrowAmount <= 0 || duration <= 0 || dailyRate <= 0) return 0;
  return parseFloat((borrowAmount * dailyRate * duration).toFixed(4));
}

/**
 * Generates randomized mock active loan data for a given token. Has an 80% chance
 * of returning an active loan and a 20% chance of returning an empty/no-loan state.
 *
 * @param token - The token symbol (defaults to "OKS")
 * @returns An ActiveLoanMockData object with randomized loan metrics or zeroed-out fields if no loan
 */
export function generateMockActiveLoan(token = "OKS"): ActiveLoanMockData {
  const hasLoan = Math.random() > 0.2;
  if (!hasLoan) {
    return {
      token,
      quoteToken: "WBNB",
      borrowedAmount: 0,
      collateralAmount: 0,
      ltv: 0,
      daysLeft: 0,
      expiresAt: 0,
      dailyInterest: 0,
      totalInterestAccrued: 0,
      imv: 0,
      isSelfRepaying: false,
      isExpired: false,
      hasActiveLoan: false,
    };
  }

  const borrowedAmount = parseFloat((0.5 + Math.random() * 5).toFixed(4));
  const collateralAmount = parseFloat((2000 + Math.random() * 8000).toFixed(4));
  const imv = parseFloat((0.05 + Math.random() * 0.15).toFixed(4));
  const ltv = parseFloat(
    ((borrowedAmount / (collateralAmount * imv)) * 100).toFixed(2),
  );
  const daysLeft = Math.floor(5 + Math.random() * 85);
  const expiresAt = Date.now() + daysLeft * 24 * 60 * 60 * 1000;
  const dailyInterest = parseFloat((0.01 + Math.random() * 0.05).toFixed(4));
  const totalInterestAccrued = parseFloat(
    (borrowedAmount * dailyInterest * (90 - daysLeft)).toFixed(4),
  );

  return {
    token,
    quoteToken: "WBNB",
    borrowedAmount,
    collateralAmount,
    ltv: Math.min(ltv, 95),
    daysLeft,
    expiresAt,
    dailyInterest,
    totalInterestAccrued: Math.max(totalInterestAccrued, 0),
    imv,
    isSelfRepaying: ltv > 1.5,
    isExpired: false,
    hasActiveLoan: true,
  };
}

/**
 * Calculates the new Loan-to-Value ratio after adding extra collateral.
 * Formula: (borrowedAmount / ((collateralAmount + extraCollateral) * imv)) * 100.
 *
 * @param borrowedAmount - The current borrowed amount
 * @param collateralAmount - The existing collateral amount
 * @param extraCollateral - Additional collateral being added
 * @param imv - Intrinsic Market Value ratio
 * @returns The new LTV as a percentage, or 0 if total collateral or IMV is invalid
 */
export function calculateNewLtv(
  borrowedAmount: number,
  collateralAmount: number,
  extraCollateral: number,
  imv: number,
): number {
  const totalCollateral = collateralAmount + extraCollateral;
  if (borrowedAmount <= 0 || totalCollateral <= 0 || imv <= 0) return 0;
  return parseFloat(((totalCollateral * imv) / borrowedAmount).toFixed(2));
}

/**
 * Calculates the fee for rolling (extending) a loan.
 * Formula: borrowedAmount * dailyInterest * durationDays.
 *
 * @param borrowedAmount - The current borrowed amount
 * @param dailyInterest - Daily interest rate as a decimal
 * @param durationDays - Number of days to extend the loan
 * @returns The roll fee amount, or 0 if borrowedAmount or durationDays is invalid
 */
export function calculateRollFee(
  borrowedAmount: number,
  dailyInterest: number,
  durationDays: number,
): number {
  if (borrowedAmount <= 0 || durationDays <= 0) return 0;
  return parseFloat((borrowedAmount * dailyInterest * durationDays).toFixed(4));
}

/**
 * Calculates the collateral returned when partially or fully repaying a loan.
 * Formula: collateralAmount * min(repayAmount / borrowedAmount, 1).
 *
 * @param repayAmount - The amount being repaid
 * @param borrowedAmount - The total borrowed amount
 * @param collateralAmount - The total collateral held
 * @returns The proportional collateral to return, or 0 if inputs are invalid
 */
export function calculateCollateralReturned(
  repayAmount: number,
  borrowedAmount: number,
  collateralAmount: number,
): number {
  if (borrowedAmount <= 0 || repayAmount <= 0) return 0;
  const ratio = Math.min(repayAmount / borrowedAmount, 1);
  return parseFloat((collateralAmount * ratio).toFixed(4));
}

// =================================================
//                PRESALE MOCK
// =================================================

/**
 * Generates randomized mock presale data for a token, including price, caps,
 * raised amounts, contributor count, end time, and user contribution.
 *
 * @param token - The token symbol (defaults to "OKS")
 * @returns A PresaleMockData object with randomized presale metrics
 */
export function generateMockPresaleData(token = "OKS"): PresaleMockData {
  const price = parseFloat((0.0001 + Math.random() * 0.0009).toFixed(6));
  const hardCap = parseFloat((10 + Math.random() * 40).toFixed(2));
  const softCap = parseFloat(
    (hardCap * (0.3 + Math.random() * 0.2)).toFixed(2),
  );
  const raised = parseFloat((Math.random() * hardCap).toFixed(4));
  const totalSupply = Math.floor(hardCap / price);
  const contributors = Math.floor(5 + Math.random() * 45);
  const endsAt =
    Date.now() + Math.floor((1 + Math.random() * 13) * 24 * 60 * 60 * 1000);
  const softCapReached = raised >= softCap;

  const statusRoll = Math.random();
  const status: PresaleMockData["status"] =
    statusRoll < 0.7 ? "active" : statusRoll < 0.85 ? "ended" : "finalized";

  const minContribution = 0.01;
  const maxContribution = parseFloat((2 + Math.random() * 3).toFixed(2));
  const userContribution =
    Math.random() > 0.4
      ? parseFloat((Math.random() * maxContribution).toFixed(4))
      : 0;
  const userTokens =
    userContribution > 0
      ? parseFloat((userContribution / price).toFixed(4))
      : 0;

  return {
    tokenName: token === "OKS" ? "Oikos" : token,
    tokenSymbol: token,
    tokenDescription: `${token} is a community-driven token launched on the Oikos platform.`,
    tokenLogoUrl: "",
    price,
    hardCap,
    softCap,
    totalSupply,
    raised,
    contributors,
    endsAt,
    status,
    softCapReached,
    minContribution,
    maxContribution,
    userContribution,
    userTokens,
    deployer: "0xDeAdBeEf00112233445566778899AaBbCcDdEeFf",
    isDeployer: Math.random() > 0.5,
  };
}

// =================================================
//                TRADE MOCK (AMM constant-product)
// =================================================
const RESERVE_BNB = 25;
const RESERVE_OKS = 1_340_000;
const BNB_USD = 650;

/**
 * Calculates the output amount for an AMM constant-product swap.
 * Uses the formula: reserveOut - (reserveIn * reserveOut) / (reserveIn + amount).
 *
 * @param amount - The input amount (BNB for buy, OKS for sell)
 * @param side - The trade side ("buy" or "sell")
 * @returns The output token amount, or 0 if amount is invalid
 */
export function calculateReceivingAmount(
  amount: number,
  side: TradeSide,
): number {
  if (amount <= 0) return 0;
  if (side === "buy") {
    return RESERVE_OKS - (RESERVE_BNB * RESERVE_OKS) / (RESERVE_BNB + amount);
  }
  return RESERVE_BNB - (RESERVE_BNB * RESERVE_OKS) / (RESERVE_OKS + amount);
}

/**
 * Calculates the price impact percentage of a trade against the AMM spot price.
 * Compares the effective price (received / amount) to the spot price.
 *
 * @param amount - The input amount for the trade
 * @param side - The trade side ("buy" or "sell")
 * @returns The price impact as a percentage (e.g. 2.5 for 2.5%), or 0 if amount is invalid
 */
export function calculatePriceImpact(amount: number, side: TradeSide): number {
  if (amount <= 0) return 0;
  const spotPrice =
    side === "buy" ? RESERVE_OKS / RESERVE_BNB : RESERVE_BNB / RESERVE_OKS;
  const received = calculateReceivingAmount(amount, side);
  const effectivePrice = received / amount;
  return Math.abs(1 - effectivePrice / spotPrice) * 100;
}

/**
 * Calculates the minimum tokens received after applying slippage tolerance.
 * Formula: receiving * (1 - slippagePct / 100).
 *
 * @param receiving - The expected output amount before slippage
 * @param slippagePct - The slippage tolerance as a percentage (e.g. 0.5 for 0.5%)
 * @returns The minimum acceptable output amount
 */
export function calculateMinReceived(
  receiving: number,
  slippagePct: number,
): number {
  return receiving * (1 - slippagePct / 100);
}

/**
 * Formats a number into a compact human-readable string with K/M suffixes.
 * Values >= 1 use 2 decimal places; values < 1 use 6 decimal places.
 *
 * @param value - The numeric value to format
 * @returns A compact formatted string (e.g. "1.25M", "50.00K", "3.14", or "0.000150")
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(2);
  if (value > 0) return value.toFixed(4);
  return "0.00";
}

/**
 * Returns a static mock network fee object with gwei, BNB, and USD values.
 *
 * @returns A NetworkFee object with fixed mock gas cost estimates
 */
export function getMockNetworkFee(): NetworkFee {
  return { gwei: 1.0, bnb: 0.00025, usd: 0.00025 * BNB_USD };
}

const TOKEN_POOL: { name: string; symbol: string; description: string }[] = [
  {
    name: "SolarFlare",
    symbol: "SFL",
    description: "Decentralized solar energy trading on the blockchain",
  },
  {
    name: "NexusDAO",
    symbol: "NXD",
    description: "Community-governed protocol for cross-chain governance",
  },
  {
    name: "AquaFi",
    symbol: "AQF",
    description: "Liquidity aggregator optimizing yields across DeFi pools",
  },
  {
    name: "VortexSwap",
    symbol: "VTX",
    description: "High-speed AMM with concentrated liquidity positions",
  },
  {
    name: "ZenithPay",
    symbol: "ZNP",
    description: "Instant crypto payments for merchants worldwide",
  },
  {
    name: "IronVault",
    symbol: "IRV",
    description: "Non-custodial asset management with multi-sig security",
  },
  {
    name: "PulseNet",
    symbol: "PLS",
    description: "Real-time oracle network for on-chain data feeds",
  },
  {
    name: "EmberChain",
    symbol: "EMB",
    description: "Layer-2 scaling solution with near-instant finality",
  },
  {
    name: "CrystalDEX",
    symbol: "CRX",
    description: "Transparent order-book DEX with zero front-running",
  },
  {
    name: "NovaLend",
    symbol: "NVL",
    description: "Algorithmic lending protocol with dynamic interest rates",
  },
  {
    name: "TitanStake",
    symbol: "TTN",
    description: "Liquid staking derivatives for proof-of-stake networks",
  },
  {
    name: "FrostBridge",
    symbol: "FRB",
    description: "Trustless cross-chain bridge with slashing protection",
  },
  {
    name: "BloomYield",
    symbol: "BLY",
    description: "Auto-compounding yield optimizer for LP tokens",
  },
  {
    name: "QuantumBit",
    symbol: "QBT",
    description: "Quantum-resistant cryptography for blockchain security",
  },
  {
    name: "DriftProtocol",
    symbol: "DRF",
    description: "Perpetual futures exchange with deep liquidity",
  },
  {
    name: "ArcanaNFT",
    symbol: "ARC",
    description: "Generative art and collectibles marketplace on-chain",
  },
  {
    name: "LunarPad",
    symbol: "LNR",
    description: "Decentralized launchpad for vetted token offerings",
  },
  {
    name: "CoralReef",
    symbol: "CRL",
    description: "Carbon-offset protocol rewarding eco-friendly validators",
  },
  {
    name: "ApexVault",
    symbol: "APX",
    description: "Institutional-grade custody with insurance coverage",
  },
  {
    name: "NebulaSwap",
    symbol: "NBL",
    description: "Gasless token swaps powered by meta-transactions",
  },
];

const STATUSES: TokenStatus[] = [
  "graduated",
  "inProgress",
  "finalized",
  "preparing",
];
const HEALTHS: TokenHealth[] = ["healthy", "warning", "critical"];

/**
 * Generates a paginated list of deterministic mock market tokens from a fixed pool.
 * Approximately 40% are presale tokens; the rest are graduated/finalized.
 *
 * @param count - Number of tokens to generate
 * @param offset - Starting index for pagination (determines token selection and metrics)
 * @returns An array of MarketToken objects with deterministic but varied market data
 */
export function generateMockMarketTokens(
  count: number,
  offset: number,
): MarketToken[] {
  return Array.from({ length: count }, (_, i) => {
    const index = offset + i;
    const pool = TOKEN_POOL[index % TOKEN_POOL.length]!;
    const isPresale = index % 5 >= 3; // ~40% presale
    const status = isPresale
      ? STATUSES[1 + (index % 3)]!
      : STATUSES[index % 2 === 0 ? 0 : 2]!;
    const health = HEALTHS[index % 3]!;

    const base: MarketToken = {
      id: `token-${index}`,
      name: pool.name,
      symbol: pool.symbol,
      description: pool.description,
      status,
      health,
      isPresale,
    };

    if (isPresale) {
      const hardCap = 50000 + ((index * 7331) % 450000);
      const raised = Math.floor(hardCap * (0.1 + ((index * 1733) % 80) / 100));
      return { ...base, raised, hardCap };
    }

    return {
      ...base,
      marketCap: 10000 + ((index * 4973) % 4990000),
      totalSupply: 100000 + ((index * 8171) % 9900000),
      circulatingSupply: 50000 + ((index * 6143) % 4950000),
      createdAt: new Date(
        Date.now() - (index * 86400000 * 3 + index * 3600000 * 7),
      ),
    };
  });
}

// =================================================
//                DIVIDEND MOCK
// =================================================

const DIVIDEND_TOKEN_POOL = [
  {
    symbol: "OKS",
    name: "Oikos",
    address: "0x1a2B3c4D5e6F7890abCdEf1234567890AbCdEf01",
  },
  {
    symbol: "SFL",
    name: "SolarFlare",
    address: "0x2b3C4d5E6f7890AbCdEf1234567890AbCdEf02",
  },
  {
    symbol: "NXD",
    name: "NexusDAO",
    address: "0x3c4D5e6F7890aBcDeF1234567890AbCdEf030000",
  },
  {
    symbol: "AQF",
    name: "AquaFi",
    address: "0x4d5E6f7890AbCdEf1234567890AbCdEf04000000",
  },
  {
    symbol: "VTX",
    name: "VortexSwap",
    address: "0x5e6F7890aBcDeF1234567890AbCdEf0500000000",
  },
];

// =================================================
//                STUDIO MOCK
// =================================================

const STUDIO_TOKEN_POOL: { name: string; symbol: string }[] = [
  { name: "SolarFlare", symbol: "SFL" },
  { name: "NexusDAO", symbol: "NXD" },
  { name: "AquaFi", symbol: "AQF" },
  { name: "VortexSwap", symbol: "VTX" },
  { name: "ZenithPay", symbol: "ZNP" },
  { name: "IronVault", symbol: "IRV" },
];

const STUDIO_STATUSES: StudioToken["status"][] = [
  "active",
  "presale",
  "paused",
];

/**
 * Generates randomized mock studio creator dashboard data, including a list
 * of tokens created by the user and aggregated statistics.
 *
 * @returns An object containing an array of StudioToken items and a StudioStats summary
 */
export function generateMockStudioData(): {
  tokens: StudioToken[];
  stats: StudioStats;
} {
  const count = 3 + Math.floor(Math.random() * 4);
  const tokens: StudioToken[] = STUDIO_TOKEN_POOL.slice(0, count).map(
    (pool, i) => {
      const status = i < 2 ? "active" : STUDIO_STATUSES[i % 3]!;
      const price = parseFloat((0.01 + Math.random() * 5).toFixed(4));
      const change24h = parseFloat((-15 + Math.random() * 30).toFixed(2));
      const volume24h = parseFloat((1000 + Math.random() * 49000).toFixed(2));
      const totalVolume = parseFloat(
        (50000 + Math.random() * 450000).toFixed(2),
      );
      const holders = Math.floor(10 + Math.random() * 490);
      const liquidity = parseFloat((5000 + Math.random() * 95000).toFixed(2));
      const earnings = parseFloat((10 + Math.random() * 2000).toFixed(2));
      const createdAt = new Date(
        Date.now() - Math.floor(Math.random() * 60) * 86400000,
      );

      return {
        id: `studio-${i}`,
        name: pool.name,
        symbol: pool.symbol,
        status,
        price,
        change24h,
        volume24h,
        totalVolume,
        holders,
        liquidity,
        earnings,
        createdAt,
      };
    },
  );

  const stats: StudioStats = {
    totalTokens: tokens.length,
    totalVolume: parseFloat(
      tokens.reduce((sum, tk) => sum + tk.totalVolume, 0).toFixed(2),
    ),
    totalHolders: tokens.reduce((sum, tk) => sum + tk.holders, 0),
    totalLiquidity: parseFloat(
      tokens.reduce((sum, tk) => sum + tk.liquidity, 0).toFixed(2),
    ),
    totalEarnings: parseFloat(
      tokens.reduce((sum, tk) => sum + tk.earnings, 0).toFixed(2),
    ),
  };

  return { tokens, stats };
}

const ACTIVITY_TYPES: StudioActivityItem["type"][] = [
  "trade",
  "stake",
  "lp_add",
  "lp_remove",
];
const ACTIVITY_WALLETS = [
  "0x1a2B...Ef12",
  "0xaBcD...Ef34",
  "0x9876...5432",
  "0xDeAd...EeFf",
  "0x1111...0000",
];

/**
 * Generates a list of randomized mock activity items (trade, stake, lp_add, lp_remove)
 * for a specific token in the studio view.
 *
 * @param token - The token symbol to associate with each activity
 * @param count - Number of activity items to generate (defaults to 10)
 * @returns An array of StudioActivityItem objects with randomized amounts and timestamps
 */
export function generateMockStudioActivity(
  token: string,
  count = 10,
): StudioActivityItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `activity-${i}`,
    type: ACTIVITY_TYPES[i % ACTIVITY_TYPES.length]!,
    token,
    amount: parseFloat((1 + Math.random() * 5000).toFixed(2)),
    wallet: ACTIVITY_WALLETS[i % ACTIVITY_WALLETS.length]!,
    timestamp: new Date(Date.now() - i * 300000 - Math.random() * 600000),
  }));
}

/**
 * Generates a randomized list of mock dividend tokens from the dividend token pool,
 * each with total distributed, unvested, and vested amounts.
 *
 * @returns An array of DividendToken objects (3 to 6 items) with randomized distribution data
 */
export function generateMockDividendTokens(): DividendToken[] {
  const count = 3 + Math.floor(Math.random() * 4);
  return DIVIDEND_TOKEN_POOL.slice(0, count).map((t, i) => {
    const totalDistributed = parseFloat(
      (100 + Math.random() * 49900).toFixed(2),
    );
    const unvested =
      i % 3 === 0 ? 0 : parseFloat((Math.random() * 500).toFixed(4));
    const vested =
      i % 2 === 0 ? 0 : parseFloat((Math.random() * 200).toFixed(4));
    return {
      tokenAddress: t.address,
      tokenSymbol: t.symbol,
      tokenName: t.name,
      totalDistributed,
      unvested,
      vested,
    };
  });
}

const VESTING_DURATION_MS = 6 * 30 * 24 * 60 * 60 * 1000;

/**
 * Generates randomized mock vesting schedule entries with staggered start dates,
 * a 6-month vesting duration, and calculated claimed/withdrawable/locked amounts.
 *
 * @param count - Number of vesting tranches to generate (defaults to 3)
 * @returns An array of VestingEntry objects with randomized vesting progress
 */
export function generateMockVestingEntries(count = 3): VestingEntry[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = 30 + i * 45 + Math.floor(Math.random() * 30);
    const startDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const unlockDate = new Date(startDate.getTime() + VESTING_DURATION_MS);
    const isFullyUnlocked = now >= unlockDate.getTime();

    const elapsedMs = Math.max(0, now - startDate.getTime());
    const vestedPercent = Math.min(
      100,
      (elapsedMs / VESTING_DURATION_MS) * 100,
    );

    const amount = parseFloat((50 + Math.random() * 500).toFixed(4));
    const vestedAmount = (amount * vestedPercent) / 100;
    const claimed = parseFloat((Math.random() * vestedAmount * 0.7).toFixed(4));
    const withdrawable = parseFloat(
      Math.max(0, vestedAmount - claimed).toFixed(4),
    );
    const stillLocked = parseFloat(
      Math.max(0, amount - vestedAmount).toFixed(4),
    );

    return {
      id: `tranche-${i}`,
      amount,
      claimed,
      startDate,
      unlockDate,
      vestedPercent: parseFloat(vestedPercent.toFixed(1)),
      withdrawable,
      stillLocked,
      isFullyUnlocked,
    };
  });
}

/**
 * Generates randomized mock detail data for a specific dividend token by symbol.
 * Includes distribution totals and associated vesting entries.
 *
 * @param symbol - The token symbol to look up (case-insensitive)
 * @returns A DividendTokenDetailData object with randomized data, or null if the symbol is not found
 */
export function generateMockDividendTokenDetail(
  symbol: string,
): DividendTokenDetailData | null {
  const tokenData = DIVIDEND_TOKEN_POOL.find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (!tokenData) return null;

  const totalDistributed = parseFloat((100 + Math.random() * 49900).toFixed(2));
  const unvested = parseFloat((Math.random() * 500).toFixed(4));
  const vested = parseFloat((Math.random() * 200).toFixed(4));

  return {
    tokenAddress: tokenData.address,
    tokenSymbol: tokenData.symbol,
    tokenName: tokenData.name,
    totalDistributed,
    unvested,
    vested,
    vestingEntries: generateMockVestingEntries(
      2 + Math.floor(Math.random() * 3),
    ),
  };
}

// =================================================
//                SWAP MOCK
// =================================================

const SWAP_TOKEN_DATA: {
  symbol: string;
  name: string;
  price: number;
  iconUrl: string;
}[] = [
  {
    symbol: "BNB",
    name: "BNB",
    price: 630,
    iconUrl:
      "https://assets-cdn.trustwallet.com/blockchains/binance/info/logo.png",
  },
  {
    symbol: "WBNB",
    name: "WBNB",
    price: 630,
    iconUrl:
      "https://assets-cdn.trustwallet.com/blockchains/binance/info/logo.png",
  },
  { symbol: "OKS", name: "Oikos", price: 0.15, iconUrl: "" },
  { symbol: "SFL", name: "SolarFlare", price: 1.25, iconUrl: "" },
  { symbol: "NXD", name: "NexusDAO", price: 0.48, iconUrl: "" },
  { symbol: "AQF", name: "AquaFi", price: 2.1, iconUrl: "" },
  { symbol: "VTX", name: "VortexSwap", price: 0.72, iconUrl: "" },
  { symbol: "USDT", name: "USDT", price: 1.0, iconUrl: "" },
];

/**
 * Generates mock swap token list with fixed prices and randomized user balances
 * from the predefined swap token data pool.
 *
 * @returns An array of SwapToken objects with randomized balances
 */
export function generateMockSwapTokens(): SwapToken[] {
  return SWAP_TOKEN_DATA.map((t) => ({
    symbol: t.symbol,
    name: t.name,
    iconUrl: t.iconUrl,
    balance: parseFloat((100 + Math.random() * 9900).toFixed(4)),
    price: t.price,
  }));
}

/**
 * Calculates the output amount for a simple price-ratio token swap.
 * Formula: (fromAmount * fromPrice) / toPrice.
 *
 * @param fromAmount - The input token amount
 * @param fromPrice - The USD price of the input token
 * @param toPrice - The USD price of the output token
 * @returns The output token amount, or 0 if any input is invalid
 */
export function calculateSwapOutput(
  fromAmount: number,
  fromPrice: number,
  toPrice: number,
): number {
  if (fromAmount <= 0 || fromPrice <= 0 || toPrice <= 0) return 0;
  return (fromAmount * fromPrice) / toPrice;
}

/**
 * Generates a paginated list of randomized mock recent swap transactions.
 *
 * @param count - Number of swap items to generate
 * @param offset - Starting index for pagination (determines token pair selection and timestamps)
 * @returns An array of RecentSwap objects with randomized amounts and timestamps
 */
export function generateMockRecentSwaps(
  count: number,
  offset: number,
): RecentSwap[] {
  const symbols = SWAP_TOKEN_DATA.map((t) => t.symbol);
  return Array.from({ length: count }, (_, i) => {
    const index = offset + i;
    const fromIdx = index % symbols.length;
    const toIdx = (index + 2) % symbols.length;
    const fromAmount = parseFloat((0.5 + Math.random() * 100).toFixed(4));
    const fromPrice = SWAP_TOKEN_DATA[fromIdx]!.price;
    const toPrice = SWAP_TOKEN_DATA[toIdx]!.price;
    const toAmount = (fromAmount * fromPrice) / toPrice;
    return {
      id: `swap-${index}`,
      fromToken: symbols[fromIdx]!,
      toToken: symbols[toIdx]!,
      fromAmount,
      toAmount: parseFloat(toAmount.toFixed(4)),
      timestamp: new Date(Date.now() - index * 120000 - Math.random() * 300000),
    };
  });
}

/**
 * Generates a paginated list of randomized mock dividend claim history items (lock/withdraw).
 *
 * @param count - Number of history items to generate
 * @param offset - Starting index for pagination (used for unique IDs and timestamps)
 * @returns An array of DividendClaimHistory objects with randomized amounts and transaction hashes
 */
export function generateMockDividendHistory(
  count: number,
  offset: number,
): DividendClaimHistory[] {
  const tokens = ["OKS", "SFL", "NXD"];
  return Array.from({ length: count }, (_, i) => {
    const index = offset + i;
    const type: DividendClaimHistory["type"] =
      Math.random() > 0.5 ? "lock" : "withdraw";
    const amount = parseFloat((1 + Math.random() * 499).toFixed(4));
    return {
      id: `div-${index}`,
      type,
      token: tokens[index % tokens.length]!,
      amount,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      timestamp: new Date(Date.now() - index * 180000 - Math.random() * 600000),
    };
  });
}

/**
 * Returns static mock price data for the price table widget,
 * including OKS, BNB, ETH, BTC, and USDT with fixed values.
 *
 * @returns An array of PriceTableToken objects with hardcoded price and market data
 */
export function generateMockPriceTableTokens(): PriceTableToken[] {
  return [
    { rank: 1, name: "Oikos", symbol: "OKS", token: "OKS", price: "$0.1800", change24h: 0.16, fdv: "$801.57K" },
    { rank: 2, name: "BNB", symbol: "BNB", token: "BNB", price: "$630.09", change24h: 7.19, fdv: "$94.5B" },
    { rank: 3, name: "Ethereum", symbol: "ETH", token: "ETH", price: "$2,521.30", change24h: -1.42, fdv: "$303.2B" },
    { rank: 4, name: "Bitcoin", symbol: "BTC", token: "BTC", price: "$97,840.00", change24h: 3.25, fdv: "$1.94T" },
    { rank: 5, name: "Tether", symbol: "USDT", token: "USDT", price: "$1.0000", change24h: 0.01, fdv: "$144.1B" },
  ];
}

/**
 * Returns a formatted display string for a specific StudioToken statistic.
 * Supports "price", "volume24h", "holders", and "liquidity" keys.
 *
 * @param token - The StudioToken to extract the stat from
 * @param key - The stat key to format ("price", "volume24h", "holders", or "liquidity")
 * @returns A formatted string (e.g. "$1.2500", "$50.00K"), or empty string for unknown keys
 */
export function getStudioTokenStatValue(
  token: StudioToken,
  key: string,
): string {
  switch (key) {
    case "price":
      return `$${token.price.toFixed(4)}`;
    case "volume24h":
      return `$${formatCompactNumber(token.volume24h)}`;
    case "holders":
      return String(token.holders);
    case "liquidity":
      return `$${formatCompactNumber(token.liquidity)}`;
    default:
      return "";
  }
}
