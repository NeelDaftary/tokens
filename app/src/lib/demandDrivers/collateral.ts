/**
 * Collateral in DeFi Demand Driver (with market-cap ceiling)
 * 
 * Purpose: Tokens get locked as collateral when users borrow. Demand scales with borrow
 * but must be capped realistically.
 * 
 * Core calculations:
 * - NeedUSD[t] = BorrowUSD[t] * CR
 * - McapUSD[t] = P[t] * S_circ[t]
 * - CeilingUSD[t] = c_mcap * McapUSD[t]
 * - PostedUSD[t] = min(NeedUSD[t], CeilingUSD[t])
 * - CollatTokens[t] = PostedUSD[t] / P[t]
 * 
 * Outputs:
 * - hold_tokens[t] += CollatTokens[t]
 * - buy_tokens[t] += m * max(0, CollatTokens[t] - CollatTokens[t-1])
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import { saturatingAdoptionCurve, getAdoptionSpeedK } from "./shared";
import type { CollateralSimple } from "@/types/demand";

export interface CollateralConfig {
  /** Borrow USD (constant or from adoption curve) */
  borrowUSD?: number;
  borrowTarget?: number; // If using adoption curve
  adoptionSpeed?: "slow" | "medium" | "fast";
  
  /** Collateral ratio (e.g., 1.5 = 150%) */
  collateralRatio: number;
  
  /** Market cap ceiling as fraction (e.g., 0.05 = 5%) */
  mcapCeilingPct: number;
  
  /** Market buy share (0-1), default 0.5 */
  marketBuyShare: number;
}

/**
 * Calculate borrow USD (constant or from adoption curve)
 */
function calculateBorrowUSD(
  config: CollateralConfig,
  t: number,
  horizonMonths: number
): number {
  if (config.borrowUSD !== undefined) {
    return config.borrowUSD;
  } else if (config.borrowTarget !== undefined && config.adoptionSpeed) {
    // Use adoption curve
    const k = getAdoptionSpeedK(config.adoptionSpeed);
    return saturatingAdoptionCurve(config.borrowTarget, k, t);
  }
  return 0;
}

/**
 * Compute Collateral demand driver outputs
 */
export function computeCollateralDriver(
  config: CollateralConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const CR = config.collateralRatio;
  const c_mcap = config.mcapCeilingPct;
  const m = config.marketBuyShare;
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];
  
  // State tracking for buy pressure (only on increases)
  let previousCollatTokens = 0;
  
  for (let t = 0; t < T; t++) {
    // Get price and circulating supply at time t
    const P_t = inputs.P[t] || inputs.P[0] || 1;
    const S_circ_t = inputs.S_circ[t] || inputs.S_circ[0] || 0;
    
    // Calculate borrow USD
    const BorrowUSD_t = calculateBorrowUSD(config, t, horizonMonths);
    
    // Calculate need USD
    const NeedUSD_t = BorrowUSD_t * CR;
    
    // Calculate market cap
    const McapUSD_t = P_t * S_circ_t;
    
    // Calculate ceiling
    const CeilingUSD_t = c_mcap * McapUSD_t;
    
    // Calculate posted USD (capped by ceiling)
    const PostedUSD_t = Math.min(NeedUSD_t, CeilingUSD_t);
    
    // Calculate collateral tokens
    const CollatTokens_t = P_t > 0 ? PostedUSD_t / P_t : 0;
    
    // Calculate change in collateral
    const deltaCollatTokens = Math.max(0, CollatTokens_t - previousCollatTokens);
    
    // Core outputs
    hold_tokens.push(CollatTokens_t);
    buy_tokens.push(m * deltaCollatTokens); // Only increases create buy pressure
    spend_tokens.push(0); // Collateral doesn't create spend pressure
    burn_tokens.push(0); // Collateral doesn't burn tokens
    sell_tokens.push(0); // Collateral doesn't create sell pressure (unlocks are just releases)
    
    // Update state
    previousCollatTokens = CollatTokens_t;
    
    // Debug info
    debug.push({
      borrowUSD: BorrowUSD_t,
      needUSD: NeedUSD_t,
      mcapUSD: McapUSD_t,
      ceilingUSD: CeilingUSD_t,
      postedUSD: PostedUSD_t,
      collatTokens: CollatTokens_t,
      deltaCollatTokens,
      collateralRatio: CR,
      mcapCeilingPct: c_mcap,
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
 * Convert CollateralSimple config to CollateralConfig
 */
export function convertCollateralConfig(simple: CollateralSimple): CollateralConfig {
  return {
    borrowUSD: simple.borrowUSD,
    borrowTarget: simple.borrowTarget,
    adoptionSpeed: simple.adoptionSpeed,
    collateralRatio: simple.collateralRatio || 1.5,
    mcapCeilingPct: (simple.mcapCeilingPct ?? 5) / 100, // Default 5%, convert to decimal
    marketBuyShare: (simple.marketBuyShare ?? 50) / 100, // Default 50%, convert to decimal
  };
}
