// Liquidity Planner Data Models

export type PoolType = "V2" | "CLMM" | "CLOB";
export type QuoteAssetType = "Stable" | "ETH" | "SOL" | "OtherVolatile";
export type DealModel = "Retainer" | "LoanCall";
export type MarketRegime = "Bull" | "Base" | "Bear";
export type Volatility = "Low" | "Med" | "High";
export type DepthBand = 25 | 50 | 100 | 200;
export type FeasibilityStatus = "green" | "yellow" | "red";
export type DecayFunction = "Linear" | "Exponential";

export type Catalyst = {
  day: number;
  multiplier: number;
  durationDays: number;
  label?: string;
};

// V3/CLMM Band
export type LiquidityBand = {
  minPrice: number; // e.g., 0.95
  maxPrice: number; // e.g., 1.05
  amountUsd: number;
  enabled: boolean;
};

export type DexPoolPlan = {
  id: string;
  poolType: PoolType;
  chain: "EVM" | "Solana";
  chainName?: string;
  quoteAssetType: QuoteAssetType;
  dexBudgetSharePct: number; // sums to 100 across pools
  primaryPool: boolean;

  // V2 specific
  slippageBps?: number;
  transactionSizeUsd?: number;
  lpFeePct?: number; // e.g. 0.003 for 0.3%

  // CLMM specific
  clmmRangeMinBps?: number; // legacy, keeping for compat, prefer bands
  clmmRangeMaxBps?: number; // legacy
  liquidityBands?: LiquidityBand[];

  // CLOB specific
  clobDepthBps?: number;
  clobDepthTargets?: DepthTarget[];
};

export type DepthTarget = {
  bandBps: DepthBand;
  depthUsd: number; // aggregate depth within ±band
  enabled: boolean;
};

export type CallOptionStrikeTier = {
  condition: string; // e.g. "at $150m FDV"
  strikePrice: string; // e.g. "1/4 of loan"
};

export type DealTranche = {
  id: string;
  name: string;
  loanSizePct: number; // % of supply
  interestRatePct: number; // annual
  termDays: number;
  strikePriceTiers: CallOptionStrikeTier[];

  // KPI obligations
  kpis: {
    tier1DepthUsd: number;
    tier2DepthUsd: number;
    tier3DepthUsd: number;
    uptimePct: number;
  };
};

export type LiquidityModel = {
  mode: "Launch" | "Improve";

  // Launch context
  launchMarketCapUsd: number;
  circulatingSupplyAtTge: number;
  tgeFloatPct: number;

  // Volume curve
  decayFunction: DecayFunction;
  peakDayVolumeUsd: number;
  decayToPct: number;
  decayToDay: number;
  catalysts: Catalyst[];

  // Venue plan
  dexPools: DexPoolPlan[];
  cexTierMonth1: { tier1: number; tier2: number; tier3: number };
  cexLiquidityFractions: { tier2: number; tier3: number }; // fraction of tier1

  // KPI targets (Legacy global targets, prefer per-tranche for Deal)
  targets: {
    depthTargets: DepthTarget[]; // includes 25/50/100/200
    targetSpreadBps: number;
    targetUptimePct: number;
  };

  // Budgets
  budgets: {
    teamTokenInventoryMax: number;
    teamStableInventoryMaxUsd: number;
    teamVolatileQuoteInventoryMaxUsd?: number;
  };

  // Market conditions
  regime: { market: MarketRegime; volatility: Volatility };

  // Deal model
  deal: {
    model: DealModel;
    retainerMonthlyUsd?: number; // For "Retainer" model
    tranches: DealTranche[];    // For "LoanCall" model
  };
};

// Output types

export type InventoryRequirement = {
  tokenAmount: number;
  stableUsd: number;
  volatileQuoteUsd?: number;
};

export type PoolInventoryRequirement = {
  poolId: string;
  poolLabel: string;
  tokenAmount: number;
  stableUsd: number;
  volatileQuoteUsd?: number;
};

export type InventoryBreakdown = {
  dex: InventoryRequirement & { perPool: PoolInventoryRequirement[] };
  cex: InventoryRequirement;
  total: InventoryRequirement;
};

export type FeasibilityItem = {
  item: string;
  status: FeasibilityStatus;
  reason: string;
  shortfall?: {
    tokenShortfall?: number;
    stableShortfall?: number;
  };
};

export type FragmentationAnalysis = {
  multiplier: number;
  scoreLabel: string;
  suggestions: string[];
};

export type OptionCostScenario = {
  fdvMultiplier: number; // 1x, 2x, 5x
  fdvUsd: number;
  spotPrice: number;
  strikePrice: number;
  optionTokens: number;
  valueTransferred: number;
};

export type DealComparison = {
  retainerCost90dUsd: number;
  optionCostScenarios: OptionCostScenario[];
};

export type SeedingReference = {
  suggestedSeedPct: number;
  seedByReferenceTokens: number;
  seedByKpiTokens: number;
  recommendedTokens: number;
};

export type LiquidityOutputs = {
  tgePriceUsd: number;
  totalSupplyApprox: number;
  required: InventoryBreakdown;
  seeding: SeedingReference;
  feasibility: FeasibilityItem[];
  fragmentation: FragmentationAnalysis;
  dealComparison: DealComparison;
};

// Default values for new models

export const DEFAULT_DEPTH_TARGETS: DepthTarget[] = [
  { bandBps: 25, depthUsd: 50_000, enabled: true },
  { bandBps: 50, depthUsd: 100_000, enabled: true },
  { bandBps: 100, depthUsd: 200_000, enabled: true },
  { bandBps: 200, depthUsd: 350_000, enabled: true },
];

export const DEFAULT_LIQUIDITY_MODEL: LiquidityModel = {
  mode: "Launch",

  launchMarketCapUsd: 200_000_000,
  circulatingSupplyAtTge: 100_000_000,
  tgeFloatPct: 10,

  decayFunction: "Exponential",
  peakDayVolumeUsd: 5_000_000,
  decayToPct: 20,
  decayToDay: 30,
  catalysts: [],

  dexPools: [
    {
      id: "pool1",
      poolType: "V2",
      chain: "EVM",
      chainName: "Ethereum",
      quoteAssetType: "Stable",
      dexBudgetSharePct: 100,
      primaryPool: true,
      slippageBps: 50,
      transactionSizeUsd: 10000,
    },
  ],

  cexTierMonth1: { tier1: 1, tier2: 2, tier3: 3 },
  cexLiquidityFractions: { tier2: 0.7, tier3: 0.3 },

  targets: {
    depthTargets: DEFAULT_DEPTH_TARGETS,
    targetSpreadBps: 40,
    targetUptimePct: 95,
  },

  budgets: {
    teamTokenInventoryMax: 1_000_000,
    teamStableInventoryMaxUsd: 500_000,
  },

  regime: { market: "Base", volatility: "Med" },

  deal: {
    model: "Retainer",
    retainerMonthlyUsd: 10_000,
    tranches: [
      {
        id: "tranche1",
        name: "Main Tranche",
        loanSizePct: 1.0,
        interestRatePct: 0.1,
        termDays: 365,
        strikePriceTiers: [
          { condition: "Base Strike", strikePrice: "$0.15 (TGE + 50%)" }
        ],
        kpis: {
          tier1DepthUsd: 120000,
          tier2DepthUsd: 70000,
          tier3DepthUsd: 20000,
          uptimePct: 98
        }
      }
    ]
  },
};

