import type { OHLCVBar, ChartPeriod, LiquidityBar, LiquidityData, LiquidityDetail, MarketToken, TokenStatus, TokenHealth, TradeSide, NetworkFee, StakeMockData } from "@/types/interfaces";
import type { UTCTimestamp } from "lightweight-charts";

/**
 * Returns the number of days for a given chart period.
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
 * Returns the number of minutes for a given chart interval string.
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
 * Generates mock OHLCV data for a given period and interval.
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

export const LIQUIDITY_CHART_MARGIN = { top: 10, right: 10, bottom: 30, left: 10 };

export function generateMockLiquidity(): LiquidityData {
  const spotBnb = 0.0002 + Math.random() * 0.0003;
  const spotPrice = spotBnb * (580 + Math.random() * 80);
  const liquidityRatio = 1.0 + Math.random() * 1.5;
  const circulatingSupply = Math.floor(140000 + Math.random() * 60000);
  const imvPrice = spotPrice * (0.3 + Math.random() * 0.3);

  const boundary = spotBnb + 0.0001 + Math.random() * 0.0002;
  const bars: LiquidityBar[] = [
    { name: "Floor", from: spotBnb * 0.8, to: spotBnb * 0.85, height: 0.7 + Math.random() * 0.3, fill: "#f5c843", amount0: Math.random() * 0.01, amount1: 15 + Math.random() * 15 },
    { name: "Anchor", from: spotBnb * 0.85, to: boundary, height: 0.1 + Math.random() * 0.2, fill: "#d4a84b", amount0: 5000 + Math.random() * 8000, amount1: 2 + Math.random() * 5 },
    { name: "Discovery", from: boundary + 0.0001, to: 0.0012, height: 0.2 + Math.random() * 0.2, fill: "#86efac", amount0: 300000 + Math.random() * 300000, amount1: 0 },
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

  const floorTickLower = { price: imvPrice / spotPrice * spotBnb * 0.99, usd: imvPrice * 0.99, tick: -89820 + Math.floor(Math.random() * 200) };
  const floorTickUpper = { price: imvPrice / spotPrice * spotBnb * 1.01, usd: imvPrice * 1.01, tick: -89760 + Math.floor(Math.random() * 200) };
  const anchorTickLower = { price: spotBnb * 0.98, usd: spotPrice * 0.98, tick: -89760 + Math.floor(Math.random() * 200) };
  const anchorTickUpper = { price: spotBnb * 1.5, usd: spotPrice * 1.5, tick: -77280 + Math.floor(Math.random() * 200) };
  const discoveryTickLower = { price: spotBnb * 1.5, usd: spotPrice * 1.5, tick: -76860 + Math.floor(Math.random() * 200) };
  const discoveryTickUpper = { price: spotBnb * 3.5, usd: spotPrice * 3.5, tick: -68100 + Math.floor(Math.random() * 200) };

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
      floor: tickFmt(floorTickLower.price, floorTickLower.usd, floorTickLower.tick),
      anchor: tickFmt(anchorTickLower.price, anchorTickLower.usd, anchorTickLower.tick),
      discovery: tickFmt(discoveryTickLower.price, discoveryTickLower.usd, discoveryTickLower.tick),
    },
    {
      label: "tickUpper",
      floor: tickFmt(floorTickUpper.price, floorTickUpper.usd, floorTickUpper.tick),
      anchor: tickFmt(anchorTickUpper.price, anchorTickUpper.usd, anchorTickUpper.tick),
      discovery: tickFmt(discoveryTickUpper.price, discoveryTickUpper.usd, discoveryTickUpper.tick),
    },
  ];

  return { spotPrice, spotBnb, liquidityRatio, circulatingSupply, imvPrice, bars, details };
}

// =================================================
//                STAKING MOCK
// =================================================
const COOLDOWN_DAYS = 3;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

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

export function formatStakeNumber(value: number, decimals = 4): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(decimals);
}

// =================================================
//                TRADE MOCK (AMM constant-product)
// =================================================
const RESERVE_BNB = 25;
const RESERVE_OKS = 1_340_000;
const BNB_USD = 650;

export function calculateReceivingAmount(amount: number, side: TradeSide): number {
  if (amount <= 0) return 0;
  if (side === "buy") {
    return RESERVE_OKS - (RESERVE_BNB * RESERVE_OKS) / (RESERVE_BNB + amount);
  }
  return RESERVE_BNB - (RESERVE_BNB * RESERVE_OKS) / (RESERVE_OKS + amount);
}

export function calculatePriceImpact(amount: number, side: TradeSide): number {
  if (amount <= 0) return 0;
  const spotPrice = side === "buy" ? RESERVE_OKS / RESERVE_BNB : RESERVE_BNB / RESERVE_OKS;
  const received = calculateReceivingAmount(amount, side);
  const effectivePrice = received / amount;
  return Math.abs(1 - effectivePrice / spotPrice) * 100;
}

export function calculateMinReceived(receiving: number, slippagePct: number): number {
  return receiving * (1 - slippagePct / 100);
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(6);
}

export function getMockNetworkFee(): NetworkFee {
  return { gwei: 1.0, bnb: 0.00025, usd: 0.00025 * BNB_USD };
}

const TOKEN_POOL: { name: string; symbol: string; description: string }[] = [
  { name: "SolarFlare", symbol: "SFL", description: "Decentralized solar energy trading on the blockchain" },
  { name: "NexusDAO", symbol: "NXD", description: "Community-governed protocol for cross-chain governance" },
  { name: "AquaFi", symbol: "AQF", description: "Liquidity aggregator optimizing yields across DeFi pools" },
  { name: "VortexSwap", symbol: "VTX", description: "High-speed AMM with concentrated liquidity positions" },
  { name: "ZenithPay", symbol: "ZNP", description: "Instant crypto payments for merchants worldwide" },
  { name: "IronVault", symbol: "IRV", description: "Non-custodial asset management with multi-sig security" },
  { name: "PulseNet", symbol: "PLS", description: "Real-time oracle network for on-chain data feeds" },
  { name: "EmberChain", symbol: "EMB", description: "Layer-2 scaling solution with near-instant finality" },
  { name: "CrystalDEX", symbol: "CRX", description: "Transparent order-book DEX with zero front-running" },
  { name: "NovaLend", symbol: "NVL", description: "Algorithmic lending protocol with dynamic interest rates" },
  { name: "TitanStake", symbol: "TTN", description: "Liquid staking derivatives for proof-of-stake networks" },
  { name: "FrostBridge", symbol: "FRB", description: "Trustless cross-chain bridge with slashing protection" },
  { name: "BloomYield", symbol: "BLY", description: "Auto-compounding yield optimizer for LP tokens" },
  { name: "QuantumBit", symbol: "QBT", description: "Quantum-resistant cryptography for blockchain security" },
  { name: "DriftProtocol", symbol: "DRF", description: "Perpetual futures exchange with deep liquidity" },
  { name: "ArcanaNFT", symbol: "ARC", description: "Generative art and collectibles marketplace on-chain" },
  { name: "LunarPad", symbol: "LNR", description: "Decentralized launchpad for vetted token offerings" },
  { name: "CoralReef", symbol: "CRL", description: "Carbon-offset protocol rewarding eco-friendly validators" },
  { name: "ApexVault", symbol: "APX", description: "Institutional-grade custody with insurance coverage" },
  { name: "NebulaSwap", symbol: "NBL", description: "Gasless token swaps powered by meta-transactions" },
];

const STATUSES: TokenStatus[] = ["graduated", "inProgress", "finalized", "preparing"];
const HEALTHS: TokenHealth[] = ["healthy", "warning", "critical"];

export function generateMockMarketTokens(count: number, offset: number): MarketToken[] {
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
      const hardCap = 50000 + (index * 7331) % 450000;
      const raised = Math.floor(hardCap * (0.1 + ((index * 1733) % 80) / 100));
      return { ...base, raised, hardCap };
    }

    return {
      ...base,
      marketCap: 10000 + (index * 4973) % 4990000,
      totalSupply: 100000 + (index * 8171) % 9900000,
      circulatingSupply: 50000 + (index * 6143) % 4950000,
      createdAt: new Date(Date.now() - ((index * 86400000 * 3) + (index * 3600000 * 7))),
    };
  });
}
