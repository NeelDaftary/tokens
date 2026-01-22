/**
 * Staking Demand Driver
 * 
 * Purpose: Model staking as:
 * - Sink/hold demand that saturates over time
 * - Plus sell pressure if rewards are emitted
 * - Optionally fee-based yield if revenue share is used
 * 
 * Core calculations:
 * - f_target[t] = f_max * (1 - exp(-k*t))
 * - S_target[t] = f_target[t] * S_circ[t]
 * - ΔS = max(0, S_target[t] - S_staked[t-1])
 * 
 * Outputs:
 * - hold_tokens[t] += ΔS
 * - buy_tokens[t] += m * ΔS
 * 
 * State: S_staked[t] = S_staked[t-1] + ΔS
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import { saturatingAdoptionCurve, getAdoptionSpeedK } from "./shared";
import type { StakingSimple } from "@/types/demand";

export interface StakingConfig {
  /** Max fraction of circulating that becomes staked (0-1) */
  f_max: number;
  
  /** Adoption speed preset → k */
  adoptionSpeed: "slow" | "medium" | "fast";
  
  /** Market buy share (0-1), default 0.5 */
  marketBuyShare: number;
  
  /** Value return mechanism */
  rewardMechanism: "emissions" | "revenue_share";
  
  // Emissions branch
  emissionSchedule?: "low" | "medium" | "high" | "custom";
  inflationRate?: number; // Annual inflation rate (as decimal, e.g., 0.05 for 5%)
  sellFrac?: number; // Fraction of rewards sold (0-1), default 0.7
  
  // Revenue share branch
  revenueSharePct?: number; // % of protocol fees allocated to stakers (0-1)
}

/**
 * Get emission rate from schedule preset
 * Returns annual inflation rate as decimal
 */
function getEmissionRate(schedule: "low" | "medium" | "high"): number {
  switch (schedule) {
    case "low":
      return 0.02; // 2% annual
    case "medium":
      return 0.05; // 5% annual
    case "high":
      return 0.10; // 10% annual
    default:
      return 0.05;
  }
}

/**
 * Calculate monthly emission amount based on staked tokens
 * E[t] = (inflation_rate / 12) * S_staked[t]
 * 
 * Note: Emissions are distributed to stakers, so they should be calculated
 * based on the staked amount, not circulating supply.
 */
function calculateEmissions(
  inflationRate: number,
  S_staked: number
): number {
  const monthlyRate = inflationRate / 12;
  return monthlyRate * S_staked;
}

/**
 * Annualize a monthly rate
 * APY = (1 + monthly_rate)^12 - 1
 */
function annualize(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1;
}

/**
 * Compute Staking demand driver outputs
 */
export function computeStakingDriver(
  config: StakingConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const k = getAdoptionSpeedK(config.adoptionSpeed);
  const m = config.marketBuyShare;
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];
  
  // State tracking
  let S_staked = 0; // Cumulative staked tokens
  
  // Get emission parameters if using emissions
  let inflationRate: number | null = null;
  let sellFrac = config.sellFrac ?? 0.7;
  
  if (config.rewardMechanism === "emissions") {
    if (config.emissionSchedule === "custom" && config.inflationRate !== undefined) {
      inflationRate = config.inflationRate;
    } else if (config.emissionSchedule && config.emissionSchedule !== "custom") {
      inflationRate = getEmissionRate(config.emissionSchedule);
    } else {
      // Default to medium if not specified
      inflationRate = getEmissionRate("medium");
    }
  }
  
  for (let t = 0; t < T; t++) {
    // Get circulating supply at time t
    const S_circ_t = inputs.S_circ[t] || inputs.S_circ[0] || 0;
    const P_t = inputs.P[t] || inputs.P[0] || 1;
    
    // Calculate target staking fraction using saturating adoption curve
    const f_target = saturatingAdoptionCurve(config.f_max, k, t);
    
    // Calculate target staked amount
    const S_target = f_target * S_circ_t;
    
    // Calculate delta (new staking this period)
    const deltaS = Math.max(0, S_target - S_staked);
    
    // Update state
    S_staked = S_staked + deltaS;
    
    // Core outputs
    hold_tokens.push(deltaS); // All new staking reduces liquid float
    buy_tokens.push(m * deltaS); // Only m fraction bought from market
    spend_tokens.push(0); // Staking doesn't create spend pressure
    burn_tokens.push(0); // Staking doesn't burn tokens
    
    // Handle reward mechanism
    let sellThisPeriod = 0;
    let emissionThisPeriod = 0;
    let apyFee = 0;
    
    if (config.rewardMechanism === "emissions" && inflationRate !== null) {
      // Emissions branch: mint tokens and distribute to stakers
      // Emissions are based on staked tokens, not circulating supply
      // This ensures sell pressure is derived from actual staking parameters
      emissionThisPeriod = calculateEmissions(inflationRate, S_staked);
      
      // Stakers sell a fraction of rewards
      sellThisPeriod = sellFrac * emissionThisPeriod;
      
      // Note: Supply model should handle S_circ[t] += E[t]
      // We don't modify S_circ here, just track emissions
    } else if (config.rewardMechanism === "revenue_share" && config.revenueSharePct !== undefined) {
      // Revenue share branch: distribute fees to stakers
      const FeesUSD_t = inputs.FeesUSD?.[t] || inputs.FeesUSD?.[0] || 0;
      const RevShareUSD_t = config.revenueSharePct * FeesUSD_t;
      
      // Calculate fee-based APY
      if (S_staked > 0 && P_t > 0) {
        const monthlyYieldRate = RevShareUSD_t / (S_staked * P_t);
        apyFee = annualize(monthlyYieldRate);
      }
      
      // Revenue share doesn't create sell pressure (fees paid in tokens or held)
      // But we track it in debug for UI display
    }
    
    sell_tokens.push(sellThisPeriod);
    
    // Debug info
    debug.push({
      f_target,
      S_target,
      S_staked,
      deltaS,
      emission: emissionThisPeriod,
      sellFrac: config.rewardMechanism === "emissions" ? sellFrac : null,
      apyFee: config.rewardMechanism === "revenue_share" ? apyFee : null,
      revenueShareUSD: config.rewardMechanism === "revenue_share" 
        ? (config.revenueSharePct || 0) * (inputs.FeesUSD?.[t] || inputs.FeesUSD?.[0] || 0)
        : null,
    });
  }
  
  return {
    buy_tokens,
    hold_tokens,
    spend_tokens,
    burn_tokens,
    sell_tokens,
    debug,
  };
}

/**
 * Convert StakingSimple config to StakingConfig
 */
export function convertStakingConfig(simple: StakingSimple): StakingConfig {
  return {
    f_max: (simple.f_max || 0) / 100, // Convert % to decimal
    adoptionSpeed: simple.adoptionSpeed || "medium",
    marketBuyShare: (simple.marketBuyShare ?? 50) / 100, // Default 50%, convert to decimal
    rewardMechanism: simple.rewardMechanism || "emissions",
    emissionSchedule: simple.emissionSchedule || "medium",
    inflationRate: simple.inflationRate !== undefined ? simple.inflationRate / 100 : undefined,
    sellFrac: (simple.sellFrac ?? 70) / 100, // Default 70%, convert to decimal
    revenueSharePct: simple.revenueSharePct !== undefined ? simple.revenueSharePct / 100 : undefined,
  };
}
