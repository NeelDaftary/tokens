/**
 * Payment Token Demand Driver
 * 
 * Purpose: Tokens are used to pay for actions/fees/subscriptions → creates spend demand + wallet inventory.
 * 
 * Core calculations:
 * Base spend: SpendTokens[t] = SpendUSD[t] / P[t]
 * 
 * Outputs:
 * - spend_tokens[t] += SpendTokens[t]
 * - hold_tokens[t] += (B/30) * SpendTokens[t] (inventory float)
 * 
 * Pay-fees-in-token:
 * - FeesPayUSD[t] = opt_in_share * FeesUSD[t] * (1 - d_pay)
 * - spend_tokens[t] += FeesPayUSD[t]/P[t]
 * - Adjust net fees: FeesNetUSD[t] = FeesUSD[t] * (1 - opt_in_share*d_pay)
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import { saturatingAdoptionCurve, getAdoptionSpeedK } from "./shared";
import type { PaymentSimple } from "@/types/demand";

export interface PaymentConfig {
  /** Spend basis: direct USD or activity-based */
  spendBasis: "direct" | "activity";
  
  // Direct spend
  spendUSD?: number;
  
  // Activity-based spend
  activeUsers?: number;
  actionsPerUser?: number;
  usdPerAction?: number;
  
  /** Buffer days for wallet inventory (default 7-14) */
  bufferDays: number;
  
  // Pay fees in token
  enablePayFeesInToken: boolean;
  optInShare?: number; // 0-1
  discountPay?: number; // 0-1
}

/**
 * Calculate spend USD based on configuration
 */
function calculateSpendUSD(
  config: PaymentConfig,
  t: number,
  horizonMonths: number
): number {
  if (config.spendBasis === "direct") {
    return config.spendUSD || 0;
  } else {
    // Activity-based: Users[t] * actions_per_user * usd_per_action
    const users = config.activeUsers || 0;
    const actions = config.actionsPerUser || 0;
    const usdPerAction = config.usdPerAction || 0;
    return users * actions * usdPerAction;
  }
}

/**
 * Compute Payment Token demand driver outputs
 */
export function computePaymentDriver(
  config: PaymentConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const B = config.bufferDays;
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];
  
  for (let t = 0; t < T; t++) {
    // Get price at time t
    const P_t = inputs.P[t] || inputs.P[0] || 1;
    
    // Calculate base spend USD
    const SpendUSD_t = calculateSpendUSD(config, t, horizonMonths);
    
    // Calculate tokens spent
    const SpendTokens_t = P_t > 0 ? SpendUSD_t / P_t : 0;
    
    // Calculate wallet inventory (buffer)
    const inventoryTokens = (B / 30) * SpendTokens_t;
    
    // Core outputs
    spend_tokens.push(SpendTokens_t);
    hold_tokens.push(inventoryTokens);
    buy_tokens.push(0); // Payment doesn't create direct buy pressure (users acquire tokens separately)
    burn_tokens.push(0); // Payment doesn't burn tokens
    sell_tokens.push(0); // Payment doesn't create sell pressure
    
    // Handle pay-fees-in-token if enabled
    let feesPayTokens = 0;
    let feesNetUSD = 0;
    
    if (config.enablePayFeesInToken && config.optInShare !== undefined) {
      const FeesUSD_t = inputs.FeesUSD?.[t] || inputs.FeesUSD?.[0] || 0;
      const optInShare = config.optInShare;
      const discountPay = config.discountPay || 0;
      
      // Fees paid in token (with discount)
      const FeesPayUSD_t = optInShare * FeesUSD_t * (1 - discountPay);
      feesPayTokens = P_t > 0 ? FeesPayUSD_t / P_t : 0;
      
      // Adjusted net fees (for buybacks/revshare elsewhere)
      feesNetUSD = FeesUSD_t * (1 - optInShare * discountPay);
      
      // Add to spend tokens
      spend_tokens[t] += feesPayTokens;
    }
    
    // Debug info
    debug.push({
      spendUSD: SpendUSD_t,
      spendTokens: SpendTokens_t,
      inventoryTokens,
      bufferDays: B,
      feesPayTokens: config.enablePayFeesInToken ? feesPayTokens : null,
      feesNetUSD: config.enablePayFeesInToken ? feesNetUSD : null,
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
 * Convert PaymentSimple config to PaymentConfig
 */
export function convertPaymentConfig(simple: PaymentSimple): PaymentConfig {
  return {
    spendBasis: simple.spendBasis || "direct",
    spendUSD: simple.spendUSD,
    activeUsers: simple.activeUsers,
    actionsPerUser: simple.actionsPerUser,
    usdPerAction: simple.usdPerAction,
    bufferDays: simple.bufferDays ?? 7, // Default 7 days
    enablePayFeesInToken: simple.enablePayFeesInToken ?? false,
    optInShare: simple.optInShare !== undefined ? simple.optInShare / 100 : undefined,
    discountPay: simple.discountPay !== undefined ? simple.discountPay / 100 : undefined,
  };
}
