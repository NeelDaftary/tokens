/**
 * Token-Gated Features Demand Driver
 * 
 * Purpose: Users must hold ≥ X tokens to access features. Simple stock demand.
 * 
 * Core calculations:
 * - GateHold[t] = U_gate[t] * H_gate
 * 
 * Outputs:
 * - hold_tokens[t] += GateHold[t]
 * - buy_tokens[t] += m * max(0, GateHold[t] - GateHold[t-1])
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import { saturatingAdoptionCurve, getAdoptionSpeedK } from "./shared";
import type { TokenGatedSimple } from "@/types/demand";

export interface TokenGatedConfig {
  /** Gated users (constant or from adoption curve) */
  gatedUsers?: number;
  adoptionSpeed?: "slow" | "medium" | "fast";
  maxGatedUsers?: number;
  
  /** Tokens required per user */
  tokensRequired: number;
  
  /** Market buy share (0-1), default 0.5 */
  marketBuyShare: number;
}

/**
 * Calculate gated users (constant or from adoption curve)
 */
function calculateGatedUsers(
  config: TokenGatedConfig,
  t: number,
  horizonMonths: number
): number {
  if (config.gatedUsers !== undefined) {
    return config.gatedUsers;
  } else if (config.maxGatedUsers !== undefined && config.adoptionSpeed) {
    // Use adoption curve
    const k = getAdoptionSpeedK(config.adoptionSpeed);
    return saturatingAdoptionCurve(config.maxGatedUsers, k, t);
  }
  return 0;
}

/**
 * Compute Token-Gated Features demand driver outputs
 */
export function computeTokenGatedDriver(
  config: TokenGatedConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const H_gate = config.tokensRequired;
  const m = config.marketBuyShare;
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];
  
  // State tracking for buy pressure (only on increases)
  let previousGateHold = 0;
  
  for (let t = 0; t < T; t++) {
    // Calculate gated users
    const U_gate_t = calculateGatedUsers(config, t, horizonMonths);
    
    // Calculate hold requirement
    const GateHold_t = U_gate_t * H_gate;
    
    // Calculate change in hold requirement
    const deltaGateHold = Math.max(0, GateHold_t - previousGateHold);
    
    // Core outputs
    hold_tokens.push(GateHold_t);
    buy_tokens.push(m * deltaGateHold); // Only increases create buy pressure
    spend_tokens.push(0); // Token gating doesn't create spend pressure
    burn_tokens.push(0); // Token gating doesn't burn tokens
    sell_tokens.push(0); // Token gating doesn't create sell pressure
    
    // Update state
    previousGateHold = GateHold_t;
    
    // Debug info
    debug.push({
      gatedUsers: U_gate_t,
      tokensRequired: H_gate,
      gateHold: GateHold_t,
      deltaGateHold,
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
 * Convert TokenGatedSimple config to TokenGatedConfig
 */
export function convertTokenGatedConfig(simple: TokenGatedSimple): TokenGatedConfig {
  return {
    gatedUsers: simple.gatedUsers,
    adoptionSpeed: simple.adoptionSpeed,
    maxGatedUsers: simple.maxGatedUsers,
    tokensRequired: simple.tokensRequired || 0,
    marketBuyShare: (simple.marketBuyShare ?? 50) / 100, // Default 50%, convert to decimal
  };
}
