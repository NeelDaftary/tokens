/**
 * Gas Token Demand Driver
 * 
 * Purpose: Token spent to pay transaction fees (chain throughput driven).
 * 
 * Core calculations:
 * - GasSpend[t] = tx_count[t] * fee_native_per_tx
 * 
 * Outputs:
 * - spend_tokens[t] += GasSpend[t]
 * - burn_tokens[t] += burn_frac * GasSpend[t]
 * - Optional wallet buffer: hold_tokens[t] += (B/30)*GasSpend[t]
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import { saturatingAdoptionCurve, getAdoptionSpeedK } from "./shared";
import type { GasSimple } from "@/types/demand";

export interface GasConfig {
  /** Transaction count (constant or from adoption curve) */
  txCount?: number;
  txPeak?: number; // If using adoption curve
  adoptionSpeed?: "slow" | "medium" | "fast";
  
  /** Fee per transaction (native tokens) */
  feeNativePerTx: number;
  
  /** Burn fraction (0-1) */
  burnFrac: number;
  
  // Optional wallet buffer
  enableWalletBuffer: boolean;
  bufferDays?: number;
}

/**
 * Get fee per transaction from preset
 */
function getFeeFromPreset(preset: "low" | "medium" | "high"): number {
  switch (preset) {
    case "low":
      return 0.001; // 0.001 tokens per tx
    case "medium":
      return 0.01; // 0.01 tokens per tx
    case "high":
      return 0.1; // 0.1 tokens per tx
    default:
      return 0.01;
  }
}

/**
 * Calculate transaction count (constant or from adoption curve)
 */
function calculateTxCount(
  config: GasConfig,
  t: number,
  horizonMonths: number
): number {
  if (config.txCount !== undefined) {
    return config.txCount;
  } else if (config.txPeak !== undefined && config.adoptionSpeed) {
    // Use adoption curve
    const k = getAdoptionSpeedK(config.adoptionSpeed);
    return saturatingAdoptionCurve(config.txPeak, k, t);
  }
  return 0;
}

/**
 * Compute Gas Token demand driver outputs
 */
export function computeGasDriver(
  config: GasConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const feePerTx = config.feeNativePerTx;
  const burnFrac = config.burnFrac;
  const B = config.bufferDays || 7;
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];
  
  for (let t = 0; t < T; t++) {
    // Calculate transaction count
    const txCount_t = calculateTxCount(config, t, horizonMonths);
    
    // Calculate gas spend
    const GasSpend_t = txCount_t * feePerTx;
    
    // Core outputs
    spend_tokens.push(GasSpend_t);
    burn_tokens.push(burnFrac * GasSpend_t);
    buy_tokens.push(0); // Gas doesn't create buy pressure (users acquire separately)
    sell_tokens.push(0); // Gas doesn't create sell pressure
    
    // Optional wallet buffer
    let inventoryTokens = 0;
    if (config.enableWalletBuffer) {
      inventoryTokens = (B / 30) * GasSpend_t;
    }
    hold_tokens.push(inventoryTokens);
    
    // Debug info
    debug.push({
      txCount: txCount_t,
      feePerTx,
      gasSpend: GasSpend_t,
      burnFrac,
      burned: burnFrac * GasSpend_t,
      inventoryTokens,
      bufferDays: config.enableWalletBuffer ? B : null,
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
 * Convert GasSimple config to GasConfig
 */
export function convertGasConfig(simple: GasSimple): GasConfig {
  // Determine fee per transaction
  let feeNativePerTx = 0.01; // Default
  if (simple.feeNativePerTx !== undefined) {
    feeNativePerTx = simple.feeNativePerTx;
  } else if (simple.feePreset) {
    feeNativePerTx = getFeeFromPreset(simple.feePreset);
  }
  
  return {
    txCount: simple.txCount,
    txPeak: simple.txPeak,
    adoptionSpeed: simple.adoptionSpeed,
    feeNativePerTx,
    burnFrac: (simple.burnFrac ?? 0) / 100, // Default 0%, convert to decimal
    enableWalletBuffer: simple.enableWalletBuffer ?? false,
    bufferDays: simple.bufferDays ?? 7,
  };
}
