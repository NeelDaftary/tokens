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

export interface BuybacksSimple {
  monthlyBuybackUsd: number;
}

export interface BuybacksAdvanced {
  monthlyRevenue: number;
  buybackPercentage: number;
  growthRate: number;
  startMonth: number;
}

export interface StakingSimple {
  stakingRatio: number;
  apy: number;
}

export interface StakingAdvanced {
  stakingTiers: Array<{ duration: number; apy: number; percentage: number }>;
  unbondingPeriod: number;
  rewardFrequency: "daily" | "weekly" | "monthly";
}

export interface LockingSimple {
  lockedSupplyPct: number;
  avgLockDuration: number;
}

export interface LockingAdvanced {
  lockTiers: Array<{ duration: number; yield: number; percentage: number }>;
  earlyUnlockPenalty: number;
  autoCompound: boolean;
}

export interface TokenGatedSimple {
  expectedUsers: number;
  costPerUser: number;
}

export interface TokenGatedAdvanced {
  userGrowth: Array<{ month: number; users: number }>;
  feeTiers: Array<{ users: number; cost: number }>;
  renewalRate: number;
  usageFrequency: number;
}

export interface PaymentSimple {
  monthlyVolume: number;
}

export interface PaymentAdvanced {
  gmvProjection: Array<{ month: number; volume: number }>;
  transactionGrowthRate: number;
  captureRate: number;
  velocity: number;
}

export interface CollateralSimple {
  projectedTvl: number;
  collateralizationRatio: number;
}

export interface CollateralAdvanced {
  protocolBreakdown: Array<{ protocol: string; tvl: number }>;
  overCollateralRatios: Array<{ asset: string; ratio: number }>;
  liquidationThreshold: number;
  tvlGrowthCurve: Array<{ month: number; tvl: number }>;
}

export interface FeeDiscountsSimple {
  monthlyFeeVolume: number;
  discountRate: number;
}

export interface FeeDiscountsAdvanced {
  tieredDiscounts: Array<{ holding: number; discount: number }>;
  userAdoptionCurve: Array<{ month: number; users: number }>;
  holdingRequirement: number;
  volumeThresholds: Array<{ volume: number; discount: number }>;
}

export interface BondingCurveSimple {
  initialLiquidity: number;
  curveSlope: number;
}

export interface BondingCurveAdvanced {
  curveType: "linear" | "exponential";
  reserveRatio: number;
  vestingSchedule: Array<{ duration: number; percentage: number }>;
  exitFee: number;
}

export interface GasSimple {
  transactionsPerMonth: number;
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
  tokens: number;
  usd: number;
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

