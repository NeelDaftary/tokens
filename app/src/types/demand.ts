export type DemandSourceType =
  | "buybacks"
  | "staking"
  | "locking"
  | "token_gated"
  | "payment"
  | "collateral"
  | "fee_discounts"
  | "bonding_curve"
  | "gas";

export type DemandMode = "simple" | "advanced";

export interface DemandSourceBase {
  id: string;
  type: DemandSourceType;
  enabled: boolean;
  mode: DemandMode;
}

export type RevenueModelType = "target_end" | "initial_growth" | "ramp_peak";

export interface BuybacksSimple {
  // Global params
  revenueModel: RevenueModelType;
  buybackShare: number; // % of revenue used for buybacks (0-100)
  burnShare: number; // % of buybacks burned (vs treasury) (0-100)

  // Model A: Target End
  targetEndRevenue?: number;
  adoptionSpeed?: "slow" | "medium" | "fast";

  // Model B: Initial + Growth
  initialRevenue?: number;
  growthRate?: number; // monthly %

  // Model C: Ramp -> Peak -> Stabilize
  peakRevenue?: number;
  floorRevenue?: number;
  curveShape?: number; // 0..1
}

export interface BuybacksAdvanced {
  monthlyRevenue: number;
  buybackPercentage: number;
  growthRate: number;
  startMonth: number;
}

export interface StakingSimple {
  // Staking demand parameters
  f_max: number; // Max fraction of circulating that becomes staked (0-100, as %)
  adoptionSpeed?: "slow" | "medium" | "fast"; // Speed → k conversion
  marketBuyShare?: number; // m (0-100, as %), default 50%
  
  // Value return mechanism (mutually exclusive)
  rewardMechanism: "emissions" | "revenue_share";
  
  // Emissions branch (if rewardMechanism === "emissions")
  emissionSchedule?: "low" | "medium" | "high" | "custom"; // Preset or custom
  inflationRate?: number; // Annual inflation rate (0-100, as %), used if custom
  sellFrac?: number; // Fraction of rewards sold (0-100, as %), default 70%
  
  // Revenue share branch (if rewardMechanism === "revenue_share")
  revenueSharePct?: number; // s_rs (0-100, as %), % of protocol fees allocated to stakers
}

export interface StakingAdvanced {
  stakingTiers: Array<{ duration: number; apy: number; percentage: number }>;
  unbondingPeriod: number;
  rewardFrequency: "daily" | "weekly" | "monthly";
}

export interface LockingSimple {
  // Locking demand parameters
  f_lock_max: number; // Max fraction of circulating that becomes locked (0-100, as %)
  adoptionSpeed?: "slow" | "medium" | "fast"; // Speed → k conversion
  lockDurationPreset?: "short" | "medium" | "long"; // D_months preset
  lockDurationMonths?: number; // Custom lock duration in months (if not using preset)
  marketBuyShare?: number; // m (0-100, as %), default 50%
  enableUnlockApproximation?: boolean; // Enable "leaky bucket" unlock effect
}

export interface LockingAdvanced {
  lockTiers: Array<{ duration: number; yield: number; percentage: number }>;
  earlyUnlockPenalty: number;
  autoCompound: boolean;
}

export interface TokenGatedSimple {
  // User count (can be constant or growth curve)
  gatedUsers?: number; // U_gate[t] - constant for now
  adoptionSpeed?: "slow" | "medium" | "fast"; // If using saturation curve
  maxGatedUsers?: number; // Max users if using saturation
  
  // Token requirement
  tokensRequired: number; // H_gate: tokens required per user
  
  // Optional
  marketBuyShare?: number; // m (0-100, as %), default 50%
}

export interface TokenGatedAdvanced {
  userGrowth: Array<{ month: number; users: number }>;
  feeTiers: Array<{ users: number; cost: number }>;
  renewalRate: number;
  usageFrequency: number;
}

export interface PaymentSimple {
  // Spend basis (pick one)
  spendBasis: "direct" | "activity";
  
  // Direct spend
  spendUSD?: number; // SpendUSD[t] - monthly total value paid (constant for now)
  
  // Activity-based spend
  activeUsers?: number; // Users[t]
  actionsPerUser?: number;
  usdPerAction?: number;
  
  // Buffer days for wallet inventory
  bufferDays?: number; // B (default 7-14)
  
  // Pay protocol fees in token (optional sub-toggle)
  enablePayFeesInToken?: boolean;
  optInShare?: number; // Fraction of fees paid in token (0-100, as %)
  discountPay?: number; // d_pay: discount for paying in token (0-100, as %)
}

export interface PaymentAdvanced {
  gmvProjection: Array<{ month: number; volume: number }>;
  transactionGrowthRate: number;
  captureRate: number;
  velocity: number;
}

export interface CollateralSimple {
  // Borrow amount (can be constant or adoption curve)
  borrowUSD?: number; // BorrowUSD[t] - constant for now
  borrowTarget?: number; // Target borrow USD if using adoption curve
  adoptionSpeed?: "slow" | "medium" | "fast"; // If using adoption curve
  
  // Collateral parameters
  collateralRatio: number; // CR (e.g., 1.5 = 150%)
  mcapCeilingPct?: number; // c_mcap: ceiling as % of market cap (0-100, as %), default 5%
  
  // Optional
  marketBuyShare?: number; // m (0-100, as %), default 50%
}

export interface CollateralAdvanced {
  protocolBreakdown: Array<{ protocol: string; tvl: number }>;
  overCollateralRatios: Array<{ asset: string; ratio: number }>;
  liquidationThreshold: number;
  tvlGrowthCurve: Array<{ month: number; tvl: number }>;
}

export interface FeeDiscountsSimple {
  // Approach selection
  approach: "manual_tier" | "segment_mapping";
  
  // User count (required for both approaches)
  activeUsers?: number; // U[t] - can be constant or time series (for now, constant)
  
  // Manual tier approach (if approach === "manual_tier")
  tiers?: Array<{
    tokensRequired: number; // H_i: tokens required for tier
    userPercentage: number; // p_i: % of users in this tier (0-100)
  }>;
  
  // Segment mapping approach (if approach === "segment_mapping")
  segmentShares?: {
    retail: number; // % of users (0-100)
    pro: number; // % of users (0-100)
    whale: number; // % of users (0-100)
  };
  segmentTiers?: {
    retail: "none" | "tier1" | "tier2" | "tier3"; // Tier choice for retail segment
    pro: "none" | "tier1" | "tier2" | "tier3"; // Tier choice for pro segment
    whale: "none" | "tier1" | "tier2" | "tier3"; // Tier choice for whale segment
  };
  tierRequirements?: {
    tier1: number; // H_1: tokens required
    tier2: number; // H_2: tokens required
    tier3: number; // H_3: tokens required
  };
  
  // Optional
  marketBuyShare?: number; // m (0-100, as %), default 50%
}

export interface FeeDiscountsAdvanced {
  tieredDiscounts: Array<{ holding: number; discount: number }>;
  userAdoptionCurve: Array<{ month: number; users: number }>;
  holdingRequirement: number;
  volumeThresholds: Array<{ volume: number; discount: number }>;
}

export interface BondingCurveSimple {
  // Launch count (can be constant or adoption curve)
  launchesPerMonth?: number; // N_launch[t] - constant for now
  launchPeak?: number; // Peak launches if using adoption curve
  adoptionSpeed?: "slow" | "medium" | "fast"; // If using adoption curve
  
  // Liquidity seeding
  seedNativePerLaunch: number; // L_seed_native: avg native tokens seeded per launch
  
  // Stickiness/locked fraction
  stickiness: number; // l_lock (0-100, as %)
  
  // Optional decay/unlock
  enableDecay?: boolean;
  unlockHalfLifeMonths?: number; // Half-life in months (default very long)
  
  // Optional
  marketBuyShare?: number; // m (0-100, as %), default 70%
}

export interface BondingCurveAdvanced {
  curveType: "linear" | "exponential";
  reserveRatio: number;
  vestingSchedule: Array<{ duration: number; percentage: number }>;
  exitFee: number;
}

export interface GasSimple {
  // Transaction count (can be constant or adoption curve)
  txCount?: number; // tx_count[t] - constant for now
  txPeak?: number; // Peak tx count if using adoption curve
  adoptionSpeed?: "slow" | "medium" | "fast"; // If using adoption curve
  
  // Fee preset
  feePreset?: "low" | "medium" | "high"; // fee_native_per_tx preset
  feeNativePerTx?: number; // Custom fee if not using preset
  
  // Optional burn fraction
  burnFrac?: number; // burn_frac (0-100, as %)
  
  // Optional wallet buffer
  enableWalletBuffer?: boolean;
  bufferDays?: number; // B (default 7-14)
}

export interface GasAdvanced {
  blockSpaceDemand: number;
  gasPriceProjection: Array<{ month: number; price: number }>;
  transactionTypes: Array<{ type: string; percentage: number; gasUsage: number }>;
  networkGrowthRate: number;
}

export type DemandSourceConfig =
  | (DemandSourceBase & { type: "buybacks"; config: BuybacksSimple | BuybacksAdvanced })
  | (DemandSourceBase & { type: "staking"; config: StakingSimple | StakingAdvanced })
  | (DemandSourceBase & { type: "locking"; config: LockingSimple | LockingAdvanced })
  | (DemandSourceBase & { type: "token_gated"; config: TokenGatedSimple | TokenGatedAdvanced })
  | (DemandSourceBase & { type: "payment"; config: PaymentSimple | PaymentAdvanced })
  | (DemandSourceBase & { type: "collateral"; config: CollateralSimple | CollateralAdvanced })
  | (DemandSourceBase & { type: "fee_discounts"; config: FeeDiscountsSimple | FeeDiscountsAdvanced })
  | (DemandSourceBase & { type: "bonding_curve"; config: BondingCurveSimple | BondingCurveAdvanced })
  | (DemandSourceBase & { type: "gas"; config: GasSimple | GasAdvanced });

export interface DemandDataPoint {
  month: number;
  tokens: number; // Net monthly demand (buy + hold_delta + spend + burn - sell) ? Or just "Total Demand"? The aggregator sums them. Let's keep 'tokens' as the primary aggregate for the chart, but add the breakdown.
  usd: number;

  // Breakdown
  buy_tokens?: number;
  hold_tokens?: number;
  spend_tokens?: number;
  burn_tokens?: number;
  sell_tokens?: number;

  // Debug
  debug?: any;
}

export interface DemandSourceSeries {
  name: string;
  type: DemandSourceType;
  series: DemandDataPoint[];
}

export interface DemandComputationResult {
  bySource: DemandSourceSeries[];
  totalSeries: DemandDataPoint[];
}

// ========== Sell Pressure Types ==========

export type SellPressurePreset = "not_seller" | "conservative" | "moderate" | "aggressive";

export interface SellPressurePresetDefinition {
  label: string;
  minRate: number;
  maxRate: number;
  defaultRate: number;
}

export const SELL_PRESSURE_PRESETS: Record<SellPressurePreset, SellPressurePresetDefinition> = {
  not_seller: {
    label: "Not a Seller",
    minRate: 0,
    maxRate: 0,
    defaultRate: 0,
  },
  conservative: {
    label: "Conservative",
    minRate: 0.1,
    maxRate: 0.2,
    defaultRate: 0.15,
  },
  moderate: {
    label: "Moderate",
    minRate: 0.2,
    maxRate: 0.5,
    defaultRate: 0.35,
  },
  aggressive: {
    label: "Aggressive",
    minRate: 0.5,
    maxRate: 0.8,
    defaultRate: 0.65,
  },
};

export interface SellPressureConfig {
  groupId: string;
  groupName: string;
  costBasisUsd: number;
  impliedFdv: number | null;
  impliedFdvManual: boolean;
  preset: SellPressurePreset;
  customSellPct: number | null;
  enabled: boolean;
  useProfitMultiplier: boolean;
  usePriceDependent: boolean;
}

export interface SellPressureDataPoint {
  month: number;
  tokens: number;
  usd: number;
}

export interface SellPressureGroupSeries {
  groupId: string;
  groupName: string;
  series: SellPressureDataPoint[];
}

export interface SellPressureComputationResult {
  byGroup: SellPressureGroupSeries[];
  totalSeries: SellPressureDataPoint[];
  metadata: {
    totalSellPressure: number;
    peakSellMonth: number;
    avgMonthlySell: number;
  };
}

export interface NetPressureDataPoint {
  month: number;
  demand: number;
  sellPressure: number;
  net: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface NetPressureComputationResult {
  series: NetPressureDataPoint[];
  metadata: {
    totalDemand: number;
    totalSellPressure: number;
    netPressure: number;
    demandSellRatio: number;
    equilibriumMonth: number | null;
  };
}

