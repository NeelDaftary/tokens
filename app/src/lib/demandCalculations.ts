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
import { SELL_PRESSURE_PRESETS, BuybacksSimple } from "@/types/demand";
import { computeBuybacksDriver, convertBuybacksConfig } from "./demandDrivers/buybacks";
import { computeStakingDriver, convertStakingConfig } from "./demandDrivers/staking";
import { computeLockingDriver, convertLockingConfig } from "./demandDrivers/locking";
import { computeFeeDiscountsDriver, convertFeeDiscountsConfig } from "./demandDrivers/feeDiscounts";
import { computePaymentDriver, convertPaymentConfig } from "./demandDrivers/payment";
import { computeCollateralDriver, convertCollateralConfig } from "./demandDrivers/collateral";
import { computeTokenGatedDriver, convertTokenGatedConfig } from "./demandDrivers/tokenGated";
import { computeGasDriver, convertGasConfig } from "./demandDrivers/gas";
import { computeBondingCurveDriver, convertBondingCurveConfig } from "./demandDrivers/bondingCurve";
import { createConstantPriceSeries, createConstantSupplySeries, type GlobalInputs } from "./demandDrivers/shared";

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

    // Aggregating breakdown
    const buySum = bySource.reduce((acc, src) => (acc + (src.series.find((d) => d.month === month)?.buy_tokens || 0)), 0);
    const holdSum = bySource.reduce((acc, src) => (acc + (src.series.find((d) => d.month === month)?.hold_tokens || 0)), 0);
    const spendSum = bySource.reduce((acc, src) => (acc + (src.series.find((d) => d.month === month)?.spend_tokens || 0)), 0);
    const burnSum = bySource.reduce((acc, src) => (acc + (src.series.find((d) => d.month === month)?.burn_tokens || 0)), 0);
    const sellSum = bySource.reduce((acc, src) => (acc + (src.series.find((d) => d.month === month)?.sell_tokens || 0)), 0);

    totalSeries.push({
      month,
      tokens: tokensSum,
      usd: usdSum,
      buy_tokens: buySum,
      hold_tokens: holdSum,
      spend_tokens: spendSum,
      burn_tokens: burnSum,
      sell_tokens: sellSum
    });
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

  // Handle buybacks using the new driver system
  if (source.type === "buybacks" && source.mode === "simple") {
    const simpleConfig = source.config as BuybacksSimple;
    const config = convertBuybacksConfig(simpleConfig);
    
    // Create global inputs (constant price and supply for now)
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
    };
    
    // Compute buybacks driver outputs
    const outputs = computeBuybacksDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const buy = outputs.buy_tokens[month] || 0;
      const burn = outputs.burn_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      
      // Total tokens = buy tokens (they're bought from market)
      // USD = buy tokens * price
      const tokens = buy;
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: buy,
        burn_tokens: burn,
        hold_tokens: hold,
        spend_tokens: outputs.spend_tokens[month] || 0,
        sell_tokens: outputs.sell_tokens[month] || 0,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Handle staking using the new driver system
  if (source.type === "staking" && source.mode === "simple") {
    const simpleConfig = source.config as any; // StakingSimple
    const config = convertStakingConfig(simpleConfig);
    
    // Create global inputs (constant price and supply for now)
    // Note: For staking, we need circulating supply which may change over time
    // For now, use constant supply, but this should be updated when supply model is available
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
      // FeesUSD would come from other modules or user inputs
      FeesUSD: undefined, // Will be used if revenue_share mechanism is selected
    };
    
    // Compute staking driver outputs
    const outputs = computeStakingDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const buy = outputs.buy_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      const sell = outputs.sell_tokens[month] || 0;
      
      // Total tokens = hold tokens (staking demand)
      // USD = hold tokens * price (value locked)
      const tokens = hold; // Primary metric is tokens staked
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: buy,
        hold_tokens: hold,
        spend_tokens: outputs.spend_tokens[month] || 0,
        burn_tokens: outputs.burn_tokens[month] || 0,
        sell_tokens: sell,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Handle locking using the new driver system
  if (source.type === "locking" && source.mode === "simple") {
    const simpleConfig = source.config as any; // LockingSimple
    const config = convertLockingConfig(simpleConfig);
    
    // Create global inputs
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
    };
    
    // Compute locking driver outputs
    const outputs = computeLockingDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const buy = outputs.buy_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      
      // Total tokens = net locked tokens
      const tokens = Math.abs(hold); // Use absolute value for display
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: buy,
        hold_tokens: hold,
        spend_tokens: outputs.spend_tokens[month] || 0,
        burn_tokens: outputs.burn_tokens[month] || 0,
        sell_tokens: outputs.sell_tokens[month] || 0,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Handle fee_discounts using the new driver system
  if (source.type === "fee_discounts" && source.mode === "simple") {
    const simpleConfig = source.config as any; // FeeDiscountsSimple
    const config = convertFeeDiscountsConfig(simpleConfig);
    
    // Create global inputs
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
    };
    
    // Compute fee discounts driver outputs
    const outputs = computeFeeDiscountsDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const buy = outputs.buy_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      
      // Total tokens = hold requirement
      const tokens = hold;
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: buy,
        hold_tokens: hold,
        spend_tokens: outputs.spend_tokens[month] || 0,
        burn_tokens: outputs.burn_tokens[month] || 0,
        sell_tokens: outputs.sell_tokens[month] || 0,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Handle payment using the new driver system
  if (source.type === "payment" && source.mode === "simple") {
    const simpleConfig = source.config as any; // PaymentSimple
    const config = convertPaymentConfig(simpleConfig);
    
    // Create global inputs
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
      FeesUSD: undefined, // Will be used if pay-fees-in-token is enabled
    };
    
    // Compute payment driver outputs
    const outputs = computePaymentDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const spend = outputs.spend_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      
      // Total tokens = spend tokens (primary metric)
      const tokens = spend;
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: outputs.buy_tokens[month] || 0,
        hold_tokens: hold,
        spend_tokens: spend,
        burn_tokens: outputs.burn_tokens[month] || 0,
        sell_tokens: outputs.sell_tokens[month] || 0,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Handle collateral using the new driver system
  if (source.type === "collateral" && source.mode === "simple") {
    const simpleConfig = source.config as any; // CollateralSimple
    const config = convertCollateralConfig(simpleConfig);
    
    // Create global inputs
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
    };
    
    // Compute collateral driver outputs
    const outputs = computeCollateralDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const buy = outputs.buy_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      
      // Total tokens = collateral tokens locked
      const tokens = hold;
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: buy,
        hold_tokens: hold,
        spend_tokens: outputs.spend_tokens[month] || 0,
        burn_tokens: outputs.burn_tokens[month] || 0,
        sell_tokens: outputs.sell_tokens[month] || 0,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Handle token_gated using the new driver system
  if (source.type === "token_gated" && source.mode === "simple") {
    const simpleConfig = source.config as any; // TokenGatedSimple
    const config = convertTokenGatedConfig(simpleConfig);
    
    // Create global inputs
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
    };
    
    // Compute token-gated driver outputs
    const outputs = computeTokenGatedDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const buy = outputs.buy_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      
      // Total tokens = hold requirement
      const tokens = hold;
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: buy,
        hold_tokens: hold,
        spend_tokens: outputs.spend_tokens[month] || 0,
        burn_tokens: outputs.burn_tokens[month] || 0,
        sell_tokens: outputs.sell_tokens[month] || 0,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Handle gas using the new driver system
  if (source.type === "gas" && source.mode === "simple") {
    const simpleConfig = source.config as any; // GasSimple
    const config = convertGasConfig(simpleConfig);
    
    // Create global inputs
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
    };
    
    // Compute gas driver outputs
    const outputs = computeGasDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const spend = outputs.spend_tokens[month] || 0;
      const burn = outputs.burn_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      
      // Total tokens = spend tokens (primary metric)
      const tokens = spend;
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: outputs.buy_tokens[month] || 0,
        hold_tokens: hold,
        spend_tokens: spend,
        burn_tokens: burn,
        sell_tokens: outputs.sell_tokens[month] || 0,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Handle bonding_curve using the new driver system
  if (source.type === "bonding_curve" && source.mode === "simple") {
    const simpleConfig = source.config as any; // BondingCurveSimple
    const config = convertBondingCurveConfig(simpleConfig);
    
    // Create global inputs
    const inputs: GlobalInputs = {
      P: createConstantPriceSeries(tokenPrice, horizonMonths),
      S_circ: createConstantSupplySeries(totalSupply, horizonMonths),
    };
    
    // Compute bonding curve driver outputs
    const outputs = computeBondingCurveDriver(config, inputs, horizonMonths);
    
    // Convert driver outputs to DemandDataPoint format
    for (let month = 0; month <= horizonMonths; month++) {
      const buy = outputs.buy_tokens[month] || 0;
      const hold = outputs.hold_tokens[month] || 0;
      
      // Total tokens = locked tokens
      const tokens = hold;
      const usd = tokens * (inputs.P[month] || tokenPrice);
      
      series.push({
        month,
        tokens,
        usd,
        buy_tokens: buy,
        hold_tokens: hold,
        spend_tokens: outputs.spend_tokens[month] || 0,
        burn_tokens: outputs.burn_tokens[month] || 0,
        sell_tokens: outputs.sell_tokens[month] || 0,
        debug: outputs.debug[month],
      });
    }
    
    return series;
  }

  // Other demand sources (legacy implementation)
  for (let month = 0; month <= horizonMonths; month++) {
    let tokens = 0;
    let usd = 0;

    switch (source.type) {

      // Staking is now handled above using the new driver system
      case "staking":
        // Legacy code removed - now uses computeStakingDriver above
        break;

      // Locking is now handled above using the new driver system
      case "locking":
        // Legacy code removed - now uses computeLockingDriver above
        break;

      // Token gated is now handled above using the new driver system
      case "token_gated":
        // Legacy code removed - now uses computeTokenGatedDriver above
        break;

      // Payment is now handled above using the new driver system
      case "payment":
        // Legacy code removed - now uses computePaymentDriver above
        break;

      // Collateral is now handled above using the new driver system
      case "collateral":
        // Legacy code removed - now uses computeCollateralDriver above
        break;

      // Fee discounts is now handled above using the new driver system
      case "fee_discounts":
        // Legacy code removed - now uses computeFeeDiscountsDriver above
        break;

      // Bonding curve is now handled above using the new driver system
      case "bonding_curve":
        // Legacy code removed - now uses computeBondingCurveDriver above
        break;

      // Gas is now handled above using the new driver system
      case "gas":
        // Legacy code removed - now uses computeGasDriver above
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


// Note: Revenue model helpers moved to demandDrivers/buybacks.ts
