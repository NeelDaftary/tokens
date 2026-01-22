/**
 * Locking for Yield Demand Driver (ve / escrow)
 * 
 * Purpose: A stronger "float sink" than staking because tokens are time-locked,
 * often with duration-based rewards.
 * 
 * Core calculations:
 * - f_lock_target[t] = f_lock_max * (1 - exp(-k*t))
 * - S_lock_target[t] = f_lock_target[t] * S_circ[t]
 * - ΔLock = max(0, S_lock_target[t] - S_locked[t-1])
 * 
 * Optional unlock approximation (leaky bucket):
 * - Unlock[t] ≈ S_locked[t-1] / D_months
 * - S_locked[t] = S_locked[t-1] + ΔLock - Unlock[t]
 * 
 * Outputs:
 * - hold_tokens[t] += net locked (ΔLock - Unlock[t] if unlock enabled, else ΔLock)
 * - buy_tokens[t] += m * ΔLock
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import { saturatingAdoptionCurve, getAdoptionSpeedK } from "./shared";
import type { LockingSimple } from "@/types/demand";

export interface LockingConfig {
  /** Max fraction of circulating that becomes locked (0-1) */
  f_lock_max: number;
  
  /** Adoption speed preset → k */
  adoptionSpeed: "slow" | "medium" | "fast";
  
  /** Lock duration in months */
  lockDurationMonths: number;
  
  /** Market buy share (0-1), default 0.5 */
  marketBuyShare: number;
  
  /** Enable unlock approximation (leaky bucket effect) */
  enableUnlockApproximation: boolean;
}

/**
 * Get lock duration from preset
 */
function getLockDuration(preset: "short" | "medium" | "long"): number {
  switch (preset) {
    case "short":
      return 3; // 3 months
    case "medium":
      return 12; // 12 months
    case "long":
      return 36; // 36 months
    default:
      return 12;
  }
}

/**
 * Compute Locking demand driver outputs
 */
export function computeLockingDriver(
  config: LockingConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const k = getAdoptionSpeedK(config.adoptionSpeed);
  const m = config.marketBuyShare;
  const D_months = config.lockDurationMonths;
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];
  
  // State tracking
  let S_locked = 0; // Cumulative locked tokens
  
  for (let t = 0; t < T; t++) {
    // Get circulating supply at time t
    const S_circ_t = inputs.S_circ[t] || inputs.S_circ[0] || 0;
    
    // Calculate target locking fraction using saturating adoption curve
    const f_lock_target = saturatingAdoptionCurve(config.f_lock_max, k, t);
    
    // Calculate target locked amount
    const S_lock_target = f_lock_target * S_circ_t;
    
    // Calculate delta (new locking this period)
    const deltaLock = Math.max(0, S_lock_target - S_locked);
    
    // Calculate unlock if approximation enabled
    let unlockThisPeriod = 0;
    if (config.enableUnlockApproximation && D_months > 0) {
      // Leaky bucket: approximate unlock as S_locked[t-1] / D_months
      unlockThisPeriod = S_locked / D_months;
    }
    
    // Update state
    S_locked = S_locked + deltaLock - unlockThisPeriod;
    S_locked = Math.max(0, S_locked); // Ensure non-negative
    
    // Calculate net locked change
    const netLocked = deltaLock - unlockThisPeriod;
    
    // Core outputs
    hold_tokens.push(Math.max(0, netLocked)); // Net locked (can be negative if unlocks > new locks)
    buy_tokens.push(m * deltaLock); // Only new locks create buy pressure
    spend_tokens.push(0); // Locking doesn't create spend pressure
    burn_tokens.push(0); // Locking doesn't burn tokens
    sell_tokens.push(0); // Locking doesn't create sell pressure (unlocks are just releases)
    
    // Debug info
    debug.push({
      f_lock_target,
      S_lock_target,
      S_locked,
      deltaLock,
      unlock: unlockThisPeriod,
      netLocked,
      lockDurationMonths: D_months,
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
 * Convert LockingSimple config to LockingConfig
 */
export function convertLockingConfig(simple: LockingSimple): LockingConfig {
  // Determine lock duration
  let lockDurationMonths = 12; // Default
  if (simple.lockDurationMonths !== undefined) {
    lockDurationMonths = simple.lockDurationMonths;
  } else if (simple.lockDurationPreset) {
    lockDurationMonths = getLockDuration(simple.lockDurationPreset);
  }
  
  return {
    f_lock_max: (simple.f_lock_max || 0) / 100, // Convert % to decimal
    adoptionSpeed: simple.adoptionSpeed || "medium",
    lockDurationMonths,
    marketBuyShare: (simple.marketBuyShare ?? 50) / 100, // Default 50%, convert to decimal
    enableUnlockApproximation: simple.enableUnlockApproximation ?? false,
  };
}
