/**
 * Bonding Curve / AMM Base-Pair Sink Demand Driver (launchpad sink)
 * 
 * Purpose: Native token becomes default pair for new assets; liquidity seeding locks/stickies
 * native token in pools → powerful sink.
 * 
 * Core calculations (v0, no decay):
 * - ΔLocked[t] = N_launch[t] * L_seed_native * l_lock
 * 
 * Outputs:
 * - hold_tokens[t] += ΔLocked[t]
 * - buy_tokens[t] += m * ΔLocked[t]
 * 
 * Optional decay/unlock:
 * - λ = ln(2)/unlock_half_life
 * - Locked[t] = Locked[t-1]*exp(-λ) + ΔLocked[t]
 * - Output hold_tokens[t] += Locked[t] (net locked)
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import { saturatingAdoptionCurve, getAdoptionSpeedK } from "./shared";
import type { BondingCurveSimple } from "@/types/demand";

export interface BondingCurveConfig {
  /** Launches per month (constant or from adoption curve) */
  launchesPerMonth?: number;
  launchPeak?: number; // If using adoption curve
  adoptionSpeed?: "slow" | "medium" | "fast";
  
  /** Average native tokens seeded per launch */
  seedNativePerLaunch: number;
  
  /** Stickiness/locked fraction (0-1) */
  stickiness: number;
  
  // Optional decay/unlock
  enableDecay: boolean;
  unlockHalfLifeMonths?: number;
  
  /** Market buy share (0-1), default 0.7 */
  marketBuyShare: number;
}

/**
 * Calculate launches per month (constant or from adoption curve)
 */
function calculateLaunchesPerMonth(
  config: BondingCurveConfig,
  t: number,
  horizonMonths: number
): number {
  if (config.launchesPerMonth !== undefined) {
    return config.launchesPerMonth;
  } else if (config.launchPeak !== undefined && config.adoptionSpeed) {
    // Use adoption curve
    const k = getAdoptionSpeedK(config.adoptionSpeed);
    return saturatingAdoptionCurve(config.launchPeak, k, t);
  }
  return 0;
}

/**
 * Compute Bonding Curve demand driver outputs
 */
export function computeBondingCurveDriver(
  config: BondingCurveConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const L_seed = config.seedNativePerLaunch;
  const l_lock = config.stickiness;
  const m = config.marketBuyShare;
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];
  
  // State tracking for decay (if enabled)
  let Locked = 0; // Cumulative locked tokens
  let lambda = 0;
  
  if (config.enableDecay && config.unlockHalfLifeMonths) {
    lambda = Math.LN2 / config.unlockHalfLifeMonths;
  }
  
  for (let t = 0; t < T; t++) {
    // Calculate launches per month
    const N_launch_t = calculateLaunchesPerMonth(config, t, horizonMonths);
    
    // Calculate new locked this period
    const deltaLocked = N_launch_t * L_seed * l_lock;
    
    // Update locked state
    if (config.enableDecay && lambda > 0) {
      // With decay: Locked[t] = Locked[t-1]*exp(-λ) + ΔLocked[t]
      Locked = Locked * Math.exp(-lambda) + deltaLocked;
    } else {
      // v0 (no decay): accumulate
      Locked = Locked + deltaLocked;
    }
    
    // Core outputs
    if (config.enableDecay) {
      hold_tokens.push(Locked); // Net locked (with decay)
    } else {
      hold_tokens.push(deltaLocked); // New locked this period
    }
    buy_tokens.push(m * deltaLocked); // Only new locks create buy pressure
    spend_tokens.push(0); // Bonding curve doesn't create spend pressure
    burn_tokens.push(0); // Bonding curve doesn't burn tokens
    sell_tokens.push(0); // Bonding curve doesn't create sell pressure
    
    // Debug info
    debug.push({
      launches: N_launch_t,
      seedNativePerLaunch: L_seed,
      stickiness: l_lock,
      deltaLocked,
      locked: config.enableDecay ? Locked : null,
      unlockHalfLife: config.enableDecay ? config.unlockHalfLifeMonths : null,
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
 * Convert BondingCurveSimple config to BondingCurveConfig
 */
export function convertBondingCurveConfig(simple: BondingCurveSimple): BondingCurveConfig {
  return {
    launchesPerMonth: simple.launchesPerMonth,
    launchPeak: simple.launchPeak,
    adoptionSpeed: simple.adoptionSpeed,
    seedNativePerLaunch: simple.seedNativePerLaunch || 0,
    stickiness: (simple.stickiness || 0) / 100, // Convert % to decimal
    enableDecay: simple.enableDecay ?? false,
    unlockHalfLifeMonths: simple.unlockHalfLifeMonths,
    marketBuyShare: (simple.marketBuyShare ?? 70) / 100, // Default 70%, convert to decimal
  };
}
