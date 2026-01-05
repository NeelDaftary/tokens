import type {
  DemandSourceConfig,
  DemandDataPoint,
  DemandSourceSeries,
  DemandComputationResult,
  SellPressureConfig,
  SellPressureDataPoint,
  SellPressureGroupSeries,
  SellPressureComputationResult,
  NetPressureDataPoint,
  NetPressureComputationResult,
} from "@/types/demand";
import { SELL_PRESSURE_PRESETS } from "@/types/demand";

/**
 * Compute demand series for all enabled sources
 */
export function computeDemandSeries(
  sources: DemandSourceConfig[],
  horizonMonths: number,
  totalSupply: number,
  tokenPrice: number
): DemandComputationResult {
  const bySource: DemandSourceSeries[] = [];

  sources.forEach((source) => {
    if (!source.enabled) return;

    const series = calculateSourceDemand(source, horizonMonths, totalSupply, tokenPrice);
    bySource.push({
      name: getSourceLabel(source.type),
      type: source.type,
      series,
    });
  });

  // Compute total series
  const totalSeries: DemandDataPoint[] = [];
  for (let month = 0; month <= horizonMonths; month++) {
    const tokensSum = bySource.reduce((acc, src) => {
      const dataPoint = src.series.find((d) => d.month === month);
      return acc + (dataPoint?.tokens || 0);
    }, 0);
    const usdSum = bySource.reduce((acc, src) => {
      const dataPoint = src.series.find((d) => d.month === month);
      return acc + (dataPoint?.usd || 0);
    }, 0);
    totalSeries.push({ month, tokens: tokensSum, usd: usdSum });
  }

  return { bySource, totalSeries };
}

/**
 * Calculate demand for a single source
 */
function calculateSourceDemand(
  source: DemandSourceConfig,
  horizonMonths: number,
  totalSupply: number,
  tokenPrice: number
): DemandDataPoint[] {
  const series: DemandDataPoint[] = [];

  for (let month = 0; month <= horizonMonths; month++) {
    let tokens = 0;
    let usd = 0;

    switch (source.type) {
      case "buybacks":
        if (source.mode === "simple") {
          const config = source.config as any;
          usd = config.monthlyBuybackUsd || 0;
          tokens = tokenPrice > 0 ? usd / tokenPrice : 0;
        }
        break;

      case "staking":
        if (source.mode === "simple") {
          const config = source.config as any;
          const stakingRatio = (config.stakingRatio || 0) / 100;
          const apy = (config.apy || 0) / 100;
          // Demand from staking rewards (new tokens needed to pay rewards)
          tokens = totalSupply * stakingRatio * (apy / 12);
          usd = tokens * tokenPrice;
        }
        break;

      case "locking":
        if (source.mode === "simple") {
          const config = source.config as any;
          const lockedPct = (config.lockedSupplyPct || 0) / 100;
          // Demand from locked supply (removes from circulation)
          tokens = totalSupply * lockedPct / Math.max(1, config.avgLockDuration || 12);
          usd = tokens * tokenPrice;
        }
        break;

      case "token_gated":
        if (source.mode === "simple") {
          const config = source.config as any;
          tokens = (config.expectedUsers || 0) * (config.costPerUser || 0);
          usd = tokens * tokenPrice;
        }
        break;

      case "payment":
        if (source.mode === "simple") {
          const config = source.config as any;
          usd = config.monthlyVolume || 0;
          tokens = tokenPrice > 0 ? usd / tokenPrice : 0;
        }
        break;

      case "collateral":
        if (source.mode === "simple") {
          const config = source.config as any;
          const tvl = config.projectedTvl || 0;
          const ratio = (config.collateralizationRatio || 100) / 100;
          usd = tvl * ratio;
          tokens = tokenPrice > 0 ? usd / tokenPrice : 0;
        }
        break;

      case "fee_discounts":
        if (source.mode === "simple") {
          const config = source.config as any;
          const feeVolume = config.monthlyFeeVolume || 0;
          const discountRate = (config.discountRate || 0) / 100;
          // Users need to hold tokens to get discounts
          usd = feeVolume * discountRate * 10; // Multiplier for holding requirement
          tokens = tokenPrice > 0 ? usd / tokenPrice : 0;
        }
        break;

      case "bonding_curve":
        if (source.mode === "simple") {
          const config = source.config as any;
          // Liquidity locked in bonding curve
          usd = config.initialLiquidity || 0;
          tokens = tokenPrice > 0 ? usd / tokenPrice : 0;
        }
        break;

      case "gas":
        if (source.mode === "simple") {
          const config = source.config as any;
          const txCount = config.transactionsPerMonth || 0;
          const avgGasInTokens = 0.001; // Example: avg gas per tx
          tokens = txCount * avgGasInTokens;
          usd = tokens * tokenPrice;
        }
        break;
    }

    series.push({ month, tokens, usd });
  }

  return series;
}

/**
 * Convert period demand to cumulative
 */
export function convertToCumulative(series: DemandDataPoint[]): DemandDataPoint[] {
  const cumulative: DemandDataPoint[] = [];
  let tokensAcc = 0;
  let usdAcc = 0;

  series.forEach((point) => {
    tokensAcc += point.tokens;
    usdAcc += point.usd;
    cumulative.push({
      month: point.month,
      tokens: tokensAcc,
      usd: usdAcc,
    });
  });

  return cumulative;
}

/**
 * Get display label for source type
 */
function getSourceLabel(type: string): string {
  const labels: Record<string, string> = {
    buybacks: "Token Buybacks",
    staking: "Staking",
    locking: "Locking for Yield",
    token_gated: "Token Gated Features",
    payment: "Payment Token",
    collateral: "Collateral in DeFi",
    fee_discounts: "Fee Discounts",
    bonding_curve: "Bonding Curve",
    gas: "Gas Token",
  };
  return labels[type] || type;
}

// ========== Sell Pressure Calculations ==========

/**
 * Calculate profit multiplier based on cost basis and current price
 */
function calculateProfitMultiplier(costBasis: number, currentPrice: number): number {
  if (costBasis <= 0) return 1.0; // No multiplier for zero cost basis
  
  const profitMultiple = currentPrice / costBasis;
  
  if (profitMultiple < 1) return 0.5; // Less likely to sell at loss
  if (profitMultiple < 5) return 1.0; // Normal selling
  if (profitMultiple < 20) return 1.5; // Increased selling
  if (profitMultiple < 100) return 2.0; // Aggressive profit taking
  return 3.0; // Extreme profit taking
}

/**
 * Calculate price-dependent factor
 */
function calculatePriceDependentFactor(
  currentMonthPrice: number,
  previousMonthPrice: number,
  sensitivity: number = 0.2
): number {
  if (previousMonthPrice <= 0) return 1.0;
  
  const priceChangeRatio = (currentMonthPrice - previousMonthPrice) / previousMonthPrice;
  
  // If price increasing > 10%: increase sell pressure by 20%
  if (priceChangeRatio > 0.1) {
    return 1 + (sensitivity * 1);
  }
  
  // If price decreasing > 10%: decrease sell pressure by 20%
  if (priceChangeRatio < -0.1) {
    return 1 - (sensitivity * 1);
  }
  
  return 1.0; // Neutral
}

type UnlockScheduleByGroup = {
  name: string;
  series: { month: number; unlocked: number; cumulative: number }[];
}[];

/**
 * Compute sell pressure series for all groups
 */
export function computeSellPressureSeries(
  configs: SellPressureConfig[],
  unlockSchedule: UnlockScheduleByGroup,
  currentPrice: number,
  horizonMonths: number,
  priceTrajectory?: number[] // Optional: price per month for price-dependent selling
): SellPressureComputationResult {
  const byGroup: SellPressureGroupSeries[] = [];
  let totalSellPressure = 0;
  let peakSellMonth = 0;
  let peakSellAmount = 0;

  configs.forEach((config) => {
    if (!config.enabled) return;

    // Find unlock schedule for this group
    const groupUnlocks = unlockSchedule.find((u) => u.name === config.groupName);
    if (!groupUnlocks) return;

    const series: SellPressureDataPoint[] = [];

    for (let month = 0; month <= horizonMonths; month++) {
      const unlockData = groupUnlocks.series[month];
      if (!unlockData) {
        series.push({ month, tokens: 0, usd: 0 });
        continue;
      }

      // Get monthly unlocked tokens (not cumulative)
      const monthlyUnlocked = unlockData.unlocked;

      // Get base sell percentage from preset
      const preset = SELL_PRESSURE_PRESETS[config.preset];
      let baseSellPct = config.customSellPct ?? preset.defaultRate;

      // Apply profit multiplier if enabled
      if (config.useProfitMultiplier && config.costBasisUsd > 0) {
        const profitMultiplier = calculateProfitMultiplier(
          config.costBasisUsd,
          currentPrice
        );
        baseSellPct *= profitMultiplier;
      }

      // Apply price-dependent factor if enabled
      if (config.usePriceDependent && priceTrajectory && month > 0) {
        const priceFactor = calculatePriceDependentFactor(
          priceTrajectory[month] || currentPrice,
          priceTrajectory[month - 1] || currentPrice
        );
        baseSellPct *= priceFactor;
      }

      // Clamp to reasonable bounds (0-100%)
      baseSellPct = Math.max(0, Math.min(1, baseSellPct));

      // Calculate tokens sold
      const tokensSold = monthlyUnlocked * baseSellPct;
      const usdValue = tokensSold * currentPrice;

      series.push({ month, tokens: tokensSold, usd: usdValue });

      totalSellPressure += tokensSold;

      if (tokensSold > peakSellAmount) {
        peakSellAmount = tokensSold;
        peakSellMonth = month;
      }
    }

    byGroup.push({
      groupId: config.groupId,
      groupName: config.groupName,
      series,
    });
  });

  // Compute total series
  const totalSeries: SellPressureDataPoint[] = [];
  for (let month = 0; month <= horizonMonths; month++) {
    const tokensSum = byGroup.reduce((acc, group) => {
      const dataPoint = group.series.find((d) => d.month === month);
      return acc + (dataPoint?.tokens || 0);
    }, 0);
    const usdSum = byGroup.reduce((acc, group) => {
      const dataPoint = group.series.find((d) => d.month === month);
      return acc + (dataPoint?.usd || 0);
    }, 0);
    totalSeries.push({ month, tokens: tokensSum, usd: usdSum });
  }

  const avgMonthlySell = totalSellPressure / (horizonMonths + 1);

  return {
    byGroup,
    totalSeries,
    metadata: {
      totalSellPressure,
      peakSellMonth,
      avgMonthlySell,
    },
  };
}

/**
 * Compute net pressure (demand - sell pressure)
 */
export function computeNetPressure(
  demandSeries: DemandDataPoint[],
  sellPressureSeries: SellPressureDataPoint[],
  horizonMonths: number
): NetPressureComputationResult {
  const series: NetPressureDataPoint[] = [];
  let totalDemand = 0;
  let totalSellPressure = 0;
  let equilibriumMonth: number | null = null;
  let cumulativeDemand = 0;
  let cumulativeSell = 0;

  for (let month = 0; month <= horizonMonths; month++) {
    const demand = demandSeries[month]?.tokens || 0;
    const sell = sellPressureSeries[month]?.tokens || 0;
    const net = demand - sell;

    totalDemand += demand;
    totalSellPressure += sell;
    cumulativeDemand += demand;
    cumulativeSell += sell;

    // Check for equilibrium (cumulative demand equals cumulative sell)
    if (
      equilibriumMonth === null &&
      cumulativeDemand > 0 &&
      Math.abs(cumulativeDemand - cumulativeSell) < cumulativeDemand * 0.05
    ) {
      equilibriumMonth = month;
    }

    let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
    if (net > demand * 0.1) sentiment = "bullish"; // Net demand > 10% of gross demand
    else if (net < -sell * 0.1) sentiment = "bearish"; // Net sell > 10% of gross sell

    series.push({
      month,
      demand,
      sellPressure: sell,
      net,
      sentiment,
    });
  }

  const netPressure = totalDemand - totalSellPressure;
  const demandSellRatio = totalSellPressure > 0 ? totalDemand / totalSellPressure : Infinity;

  return {
    series,
    metadata: {
      totalDemand,
      totalSellPressure,
      netPressure,
      demandSellRatio,
      equilibriumMonth,
    },
  };
}

