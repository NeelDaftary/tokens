/**
 * Token Buybacks Demand Driver
 * 
 * Purpose: Convert protocol revenue into token buy pressure (and optionally burn / treasury sink)
 * 
 * Revenue Models:
 * (A) Target end revenue with tail stagnation
 * (B) Initial + growth
 * (C) Ramp → Peak → Stabilize
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import { getAdoptionSpeedK, lerp } from "./shared";
import type { BuybacksSimple } from "@/types/demand";

export interface BuybacksConfig {
  /** Revenue model type */
  revenueModel: "target_end" | "initial_growth" | "ramp_peak";
  
  /** Buyback share (0-1) - % of revenue used for buybacks */
  buybackShare: number;
  
  /** Burn share (0-1, default 1.0) - % of buybacks burned vs treasury */
  burnShare?: number;
  
  // Model A: Target End Revenue
  targetEndRevenue?: number;
  adoptionSpeed?: "slow" | "medium" | "fast";
  
  // Model B: Initial + Growth
  initialRevenue?: number;
  growthRate?: number; // monthly growth rate (as decimal, e.g., 0.1 for 10%)
  
  // Model C: Ramp → Peak → Stabilize
  peakRevenue?: number;
  floorRevenue?: number;
  curveShape?: number; // 0..1
}

/**
 * Calculate revenue trajectory for Token Buybacks
 */
export function calculateBuybacksRevenue(
  config: BuybacksConfig,
  t: number,
  T: number
): number {
  switch (config.revenueModel) {
    case "target_end":
      return calculateTargetEndRevenue(config, t, T);
    case "initial_growth":
      return calculateInitialGrowthRevenue(config, t, T);
    case "ramp_peak":
      return calculateRampPeakRevenue(config, t, T);
    default:
      return 0;
  }
}

/**
 * Model A: Target End Revenue with tail stagnation
 * 
 * Set R_start = 0.1 * R_end unless user overrides
 * Logistic to flatten near end:
 * R[t] = R_start + (R_end - R_start)/(1 + exp(-k*(t - t_mid)))
 * t_mid = 0.45*T, k from speed preset
 */
function calculateTargetEndRevenue(
  config: BuybacksConfig,
  t: number,
  T: number
): number {
  const R_end = config.targetEndRevenue || 0;
  if (R_end === 0) return 0;

  const R_start = 0.1 * R_end;
  const k = getAdoptionSpeedK(config.adoptionSpeed || "medium");
  const t_mid = 0.45 * T;

  // Logistic curve
  const logistic = 1 / (1 + Math.exp(-k * (t - t_mid)));
  return R_start + (R_end - R_start) * logistic;
}

/**
 * Model B: Initial + Growth
 * 
 * R_raw[t] = R0*(1+g)^t
 * Optional "tail flatten" toggle: R[t] = min(R_raw[t], R_raw[T-1]) (ultra-simple clamp)
 */
function calculateInitialGrowthRevenue(
  config: BuybacksConfig,
  t: number,
  T: number
): number {
  const R0 = config.initialRevenue || 0;
  const g = config.growthRate || 0; // Already as decimal

  if (R0 === 0) return 0;

  const R_raw = R0 * Math.pow(1 + g, t);
  
  // Simple tail flatten: clamp to final value
  const R_final = R0 * Math.pow(1 + g, T - 1);
  return Math.min(R_raw, R_final);
}

/**
 * Model C: Ramp → Peak → Stabilize
 * 
 * Inputs: R_peak, R_floor, shape (0..1)
 * Map shape → t_peak and half_life:
 * - t_peak = round(T * lerp(0.75, 0.35, shape))
 * - half_life = lerp(12, 3, shape)
 * 
 * Rise logistic to R_peak, then exponential decay to R_floor
 */
function calculateRampPeakRevenue(
  config: BuybacksConfig,
  t: number,
  T: number
): number {
  const R_peak = config.peakRevenue || 0;
  const R_floor = config.floorRevenue || 0;
  const shape = config.curveShape ?? 0.5;

  if (R_peak === 0) return R_floor;

  const t_peak = Math.round(T * lerp(0.75, 0.35, shape));
  const half_life = lerp(12, 3, shape);
  const lambda = Math.LN2 / half_life;

  if (t <= t_peak) {
    // Rise logistic to peak
    // Use sigmoid that reaches ~99% of R_peak at t_peak
    const progress = t_peak > 0 ? t / t_peak : 1;
    // Sigmoid: 1 / (1 + exp(-10 * (progress - 0.5)))
    const s = 1 / (1 + Math.exp(-10 * (progress - 0.5)));
    return R_floor + (R_peak - R_floor) * s;
  } else {
    // Exponential decay to floor
    const delta_t = t - t_peak;
    const decay = Math.exp(-lambda * delta_t);
    return R_floor + (R_peak - R_floor) * decay;
  }
}

/**
 * Compute Token Buybacks demand driver outputs
 * 
 * Core calculations:
 * BB_usd[t] = s_bb * R[t]
 * bb_tokens[t] = BB_usd[t] / P[t]
 * 
 * Outputs:
 * - buy_tokens[t] += bb_tokens[t]
 * - burn_tokens[t] += burn_share * bb_tokens[t]
 * - hold_tokens[t] += (1-burn_share)*bb_tokens[t] (if treasury treated as out of float)
 */
export function computeBuybacksDriver(
  config: BuybacksConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const burnShare = config.burnShare ?? 1.0; // Default: all burned
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];

  for (let t = 0; t < T; t++) {
    // Get price at time t
    const P_t = inputs.P[t] || inputs.P[0] || 1; // Fallback to first price or $1
    
    // Calculate revenue at time t
    // Pass T (total count) to revenue functions, not horizonMonths
    const R_t = calculateBuybacksRevenue(config, t, T);
    
    // Calculate buyback USD
    const BB_usd = config.buybackShare * R_t;
    
    // Calculate tokens bought
    const bb_tokens = P_t > 0 ? BB_usd / P_t : 0;
    
    // Calculate burn vs hold split
    const burn_amount = bb_tokens * burnShare;
    const hold_amount = bb_tokens * (1 - burnShare);
    
    // Set outputs
    buy_tokens.push(bb_tokens);
    burn_tokens.push(burn_amount);
    hold_tokens.push(hold_amount);
    spend_tokens.push(0); // Buybacks don't create spend pressure
    sell_tokens.push(0); // Buybacks don't create sell pressure
    
    // Debug info
    debug.push({
      revenue: R_t,
      buyback_usd: BB_usd,
      buyback_tokens: bb_tokens,
      burn_share: burnShare,
      price: P_t,
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
 * Convert BuybacksSimple config to BuybacksConfig
 */
export function convertBuybacksConfig(simple: BuybacksSimple): BuybacksConfig {
  return {
    revenueModel: simple.revenueModel || "target_end",
    buybackShare: (simple.buybackShare || 0) / 100, // Convert % to decimal
    burnShare: (simple.burnShare || 100) / 100, // Convert % to decimal, default 100%
    targetEndRevenue: simple.targetEndRevenue,
    adoptionSpeed: simple.adoptionSpeed || "medium",
    initialRevenue: simple.initialRevenue,
    growthRate: (simple.growthRate || 0) / 100, // Convert % to decimal
    peakRevenue: simple.peakRevenue,
    floorRevenue: simple.floorRevenue,
    curveShape: simple.curveShape ?? 0.5,
  };
}
