/**
 * Fee Discounts Demand Driver (hold-to-unlock only)
 * 
 * Purpose: Users hold tokens to qualify for fee discounts. This is a stock demand driver.
 * 
 * Two approaches:
 * A) Manual tier uptake: U[t] users, tiers with H_i (tokens required) and p_i (% users)
 * B) Segment mapping: U[t] users, segment shares (retail/pro/whale), each segment chooses tier
 * 
 * Core calculations:
 * Manual tier: HoldFee[t] = U[t] * Σ(p_i * H_i)
 * Segment: HoldFee[t] = U[t] * (share_r*H_r + share_p*H_p + share_w*H_w)
 * 
 * Outputs:
 * - hold_tokens[t] += HoldFee[t]
 * - buy_tokens[t] += m * max(0, HoldFee[t] - HoldFee[t-1])
 */

import type { GlobalInputs, DriverOutputs } from "./shared";
import type { FeeDiscountsSimple } from "@/types/demand";

export interface FeeDiscountsConfig {
  /** Approach: manual tier or segment mapping */
  approach: "manual_tier" | "segment_mapping";
  
  /** Active users U[t] - constant for now, can be extended to time series */
  activeUsers: number;
  
  // Manual tier approach
  tiers?: Array<{
    tokensRequired: number; // H_i
    userPercentage: number; // p_i (0-1)
  }>;
  
  // Segment mapping approach
  segmentShares?: {
    retail: number; // 0-1
    pro: number; // 0-1
    whale: number; // 0-1
  };
  segmentTiers?: {
    retail: "none" | "tier1" | "tier2" | "tier3";
    pro: "none" | "tier1" | "tier2" | "tier3";
    whale: "none" | "tier1" | "tier2" | "tier3";
  };
  tierRequirements?: {
    tier1: number; // H_1
    tier2: number; // H_2
    tier3: number; // H_3
  };
  
  /** Market buy share (0-1), default 0.5 */
  marketBuyShare: number;
}

/**
 * Normalize tier percentages to sum to 100%
 */
function normalizeTierPercentages(tiers: Array<{ tokensRequired: number; userPercentage: number }>): Array<{ tokensRequired: number; userPercentage: number }> {
  const total = tiers.reduce((sum, tier) => sum + tier.userPercentage, 0);
  if (total === 0) return tiers;
  
  return tiers.map(tier => ({
    ...tier,
    userPercentage: tier.userPercentage / total,
  }));
}

/**
 * Normalize segment shares to sum to 100%
 */
function normalizeSegmentShares(shares: { retail: number; pro: number; whale: number }): { retail: number; pro: number; whale: number } {
  const total = shares.retail + shares.pro + shares.whale;
  if (total === 0) return shares;
  
  return {
    retail: shares.retail / total,
    pro: shares.pro / total,
    whale: shares.whale / total,
  };
}

/**
 * Get tier requirement from segment choice
 */
function getTierRequirement(
  tierChoice: "none" | "tier1" | "tier2" | "tier3",
  tierRequirements: { tier1: number; tier2: number; tier3: number }
): number {
  switch (tierChoice) {
    case "none":
      return 0;
    case "tier1":
      return tierRequirements.tier1;
    case "tier2":
      return tierRequirements.tier2;
    case "tier3":
      return tierRequirements.tier3;
    default:
      return 0;
  }
}

/**
 * Calculate hold requirement using manual tier approach
 */
function calculateHoldManualTier(
  users: number,
  tiers: Array<{ tokensRequired: number; userPercentage: number }>
): number {
  // Normalize tiers
  const normalizedTiers = normalizeTierPercentages(tiers);
  
  // Calculate: HoldFee[t] = U[t] * Σ(p_i * H_i)
  const holdPerUser = normalizedTiers.reduce(
    (sum, tier) => sum + tier.userPercentage * tier.tokensRequired,
    0
  );
  
  return users * holdPerUser;
}

/**
 * Calculate hold requirement using segment mapping approach
 */
function calculateHoldSegmentMapping(
  users: number,
  segmentShares: { retail: number; pro: number; whale: number },
  segmentTiers: { retail: "none" | "tier1" | "tier2" | "tier3"; pro: "none" | "tier1" | "tier2" | "tier3"; whale: "none" | "tier1" | "tier2" | "tier3" },
  tierRequirements: { tier1: number; tier2: number; tier3: number }
): number {
  // Normalize segment shares
  const normalizedShares = normalizeSegmentShares(segmentShares);
  
  // Calculate hold requirement per segment
  const holdRetail = getTierRequirement(segmentTiers.retail, tierRequirements);
  const holdPro = getTierRequirement(segmentTiers.pro, tierRequirements);
  const holdWhale = getTierRequirement(segmentTiers.whale, tierRequirements);
  
  // Calculate: HoldFee[t] = U[t] * (share_r*H_r + share_p*H_p + share_w*H_w)
  const holdPerUser = 
    normalizedShares.retail * holdRetail +
    normalizedShares.pro * holdPro +
    normalizedShares.whale * holdWhale;
  
  return users * holdPerUser;
}

/**
 * Compute Fee Discounts demand driver outputs
 */
export function computeFeeDiscountsDriver(
  config: FeeDiscountsConfig,
  inputs: GlobalInputs,
  horizonMonths: number
): DriverOutputs {
  const T = horizonMonths + 1; // Total months (0..horizonMonths inclusive)
  const m = config.marketBuyShare;
  
  // Initialize output arrays
  const buy_tokens: number[] = [];
  const hold_tokens: number[] = [];
  const spend_tokens: number[] = [];
  const burn_tokens: number[] = [];
  const sell_tokens: number[] = [];
  const debug: any[] = [];
  
  // State tracking for buy pressure (only on increases)
  let previousHoldFee = 0;
  
  for (let t = 0; t < T; t++) {
    // Calculate hold requirement based on approach
    let holdFee = 0;
    
    if (config.approach === "manual_tier" && config.tiers) {
      holdFee = calculateHoldManualTier(config.activeUsers, config.tiers);
    } else if (
      config.approach === "segment_mapping" &&
      config.segmentShares &&
      config.segmentTiers &&
      config.tierRequirements
    ) {
      holdFee = calculateHoldSegmentMapping(
        config.activeUsers,
        config.segmentShares,
        config.segmentTiers,
        config.tierRequirements
      );
    }
    
    // Calculate change in hold requirement
    const deltaHoldFee = Math.max(0, holdFee - previousHoldFee);
    
    // Core outputs
    hold_tokens.push(holdFee); // Total hold requirement
    buy_tokens.push(m * deltaHoldFee); // Only increases create buy pressure
    spend_tokens.push(0); // Fee discounts don't create spend pressure
    burn_tokens.push(0); // Fee discounts don't burn tokens
    sell_tokens.push(0); // Fee discounts don't create sell pressure
    
    // Update state
    previousHoldFee = holdFee;
    
    // Debug info
    debug.push({
      activeUsers: config.activeUsers,
      holdFee,
      deltaHoldFee,
      approach: config.approach,
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
 * Convert FeeDiscountsSimple config to FeeDiscountsConfig
 */
export function convertFeeDiscountsConfig(simple: FeeDiscountsSimple): FeeDiscountsConfig {
  const config: FeeDiscountsConfig = {
    approach: simple.approach || "manual_tier",
    activeUsers: simple.activeUsers || 0,
    marketBuyShare: (simple.marketBuyShare ?? 50) / 100, // Default 50%, convert to decimal
  };
  
  if (simple.approach === "manual_tier" && simple.tiers) {
    config.tiers = simple.tiers.map(tier => ({
      tokensRequired: tier.tokensRequired,
      userPercentage: tier.userPercentage / 100, // Convert % to decimal
    }));
  } else if (
    simple.approach === "segment_mapping" &&
    simple.segmentShares &&
    simple.segmentTiers &&
    simple.tierRequirements
  ) {
    config.segmentShares = {
      retail: simple.segmentShares.retail / 100, // Convert % to decimal
      pro: simple.segmentShares.pro / 100,
      whale: simple.segmentShares.whale / 100,
    };
    config.segmentTiers = simple.segmentTiers;
    config.tierRequirements = simple.tierRequirements;
  }
  
  return config;
}
