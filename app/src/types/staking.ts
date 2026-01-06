// ========== Staking Model Types ==========

export type StakingArchetype = 
  | "consensus" 
  | "defi" 
  | "liquid_staking" 
  | "restaking" 
  | "ve_governance";

export type TimeStep = "weekly" | "monthly";

export type PriceScenarioType = "flat" | "custom_series" | "bull_base_bear";

export type ElasticityPreset = "low" | "medium" | "high" | "custom";

export type RewardCurveType = "simple_inverse" | "custom";

export type DeFiMode = "emissions" | "bond_required" | "lp_staking" | "hybrid";

export type BondRequiredModel = "percent_of_tvl" | "fixed_token" | "custom_series";

export type LSTType = "rebase" | "reward_bearing";

export type VEDecayModel = "linear" | "none";

// ========== Price Scenario ==========

export interface PriceScenarioFlat {
  type: "flat";
  price: number;
}

export interface PriceScenarioBullBaseBear {
  type: "bull_base_bear";
  bullMultiplier: number;
  baseMultiplier: number;
  bearMultiplier: number;
  horizonMonths: number;
}

export interface PriceScenarioCustom {
  type: "custom_series";
  series: Array<{ t: number; price: number }>;
}

export type PriceScenario = PriceScenarioFlat | PriceScenarioBullBaseBear | PriceScenarioCustom;

// ========== Unlock Schedule ==========

export interface UnlockEntry {
  t: number; // time in steps
  amount: number; // tokens
}

// ========== Rewards Sources ==========

export interface InflationRewards {
  enabled: boolean;
  annualInflationRate: number; // e.g., 0.06 for 6%
  distributionToStakersPct: number; // 0-1
  inflationSchedule?: Array<{ t: number; annualRate: number }>;
}

export interface FeesRewardsModel {
  type: "constant" | "grow" | "custom_series";
  params: {
    constantFees?: number; // per step
    growthRate?: number; // if type=grow
    series?: Array<{ t: number; fees: number }>; // if type=custom_series
  };
}

export interface FeesRewards {
  enabled: boolean;
  feesPerStep?: number; // in USD or token
  feesModel?: FeesRewardsModel;
  feeShareToStakersPct: number; // 0-1
}

export interface OtherReward {
  name: string;
  perStepAmount: number;
  denom: "token" | "usd";
  toStakersPct: number; // 0-1
}

export interface RewardsSources {
  inflation: InflationRewards;
  fees: FeesRewards;
  other: OtherReward[];
}

// ========== Staking Mechanics ==========

export interface LockupOption {
  lockSteps: number;
  boost: number; // multiplier, default 1
}

export interface StakingMechanics {
  unbondingSteps: number;
  lockupOptions: LockupOption[];
  rewardCompounding: "none" | "auto";
  operatorCommissionPct: number; // 0-1
  maxStakePctOfSupply?: number; // 0-1, optional cap
}

// ========== Demand Model ==========

export interface LockupPenaltyModel {
  type: "linear" | "none";
  penaltyPerLockStep: number; // e.g., 0.002
}

export interface DemandModel {
  opportunityCostAnnual: number; // e.g., 0.08
  elasticityPreset: ElasticityPreset;
  elasticityK?: number; // custom only
  baseParticipation: number; // 0-1, baseline sticky stake
  maxParticipation: number; // 0-1
  adjustmentSpeed: number; // 0-1 per step
  lockupPenaltyModel: LockupPenaltyModel;
  riskPenaltyAnnual: number; // combined risk penalty
}

// ========== Risk Assumptions ==========

export interface ConcentrationModel {
  topNSharePct: number; // 0-1
  numValidators: number;
}

export interface RiskAssumptions {
  slashProbAnnual: number; // 0-1
  slashSeverityPct: number; // 0-1
  smartContractRiskAnnual: number; // 0-1
  liquidityDiscountPct: number; // 0-1
  concentrationModel: ConcentrationModel;
}

// ========== Archetype-Specific: Consensus ==========

export interface RewardCurveSimple {
  type: "simple_inverse";
  targetStakeRatio: number;
  aprAtTarget: number;
  aprMin: number;
  aprMax: number;
}

export interface RewardCurveCustom {
  type: "custom";
  series: Array<{ stakeRatio: number; apr: number }>;
}

export type RewardCurve = RewardCurveSimple | RewardCurveCustom;

export interface ConsensusConfig {
  rewardCurve: RewardCurve;
  slashablePctOfStake: number; // 0-1
  mevPerStep?: number; // optional, USD or token
}

// ========== Archetype-Specific: DeFi ==========

export interface BondRequiredConfig {
  type: BondRequiredModel;
  tvlSeries?: Array<{ t: number; tvl: number }>;
  fixedBondTokens?: number;
}

export interface DeFiConfig {
  mode: DeFiMode;
  bondRequiredModel?: BondRequiredConfig;
  ilHaircutPct?: number; // if lp_staking, 0-1
}

// ========== Archetype-Specific: Liquid Staking ==========

export interface LiquidStakingConfig {
  enabled: boolean;
  type: LSTType;
  adoptionMaxPctOfStakers: number; // 0-1
  adoptionSpeed: number; // 0-1 per step
  extraDefiYieldAnnual: number; // 0-1
  exitLiquidityLimitPctPerStep?: number; // optional, 0-1
  expectedDiscountBandPct: number; // e.g., 0.01
}

// ========== Archetype-Specific: Restaking ==========

export interface RestakingConfig {
  enabled: boolean;
  maxRestakePctOfStake: number; // 0-1
  incrementalYieldAnnual: number; // 0-1
  correlatedSlashProbAnnual: number; // 0-1
  correlatedSlashSeverityPct: number; // 0-1
}

// ========== Archetype-Specific: veGovernance ==========

export interface VELockDuration {
  steps: number;
  votingPowerMultiplier: number;
}

export interface VEGovernanceConfig {
  enabled: boolean;
  lockDurations: VELockDuration[];
  feeShareToLockersPct: number; // 0-1
  emissionsDirectedByGaugesPct: number; // 0-1
  bribeYieldAnnual: number; // 0-1, optional
  earlyExitPenaltyPct: number; // 0-1, optional
  decayModel: VEDecayModel;
  controlValueAnnual?: number; // optional
}

// ========== Main Staking Model ==========

export interface StakingModel {
  version: number; // staking_model_version
  
  // Metadata
  name: string;
  description?: string;
  
  // Archetype
  archetype: StakingArchetype;
  hybridMode: boolean; // allow stacking multiple archetypes
  
  // Token & Supply
  tokenSymbol: string;
  totalSupply: number;
  circulatingSupply0: number;
  initialPrice: number;
  priceScenario: PriceScenario;
  
  // Unlocks
  unlockSchedule: UnlockEntry[];
  
  // Time config
  timeStep: TimeStep;
  horizonSteps: number;
  discountRateAnnual?: number; // optional, for NPV
  
  // Rewards
  rewards: RewardsSources;
  
  // Staking mechanics
  staking: StakingMechanics;
  
  // Demand model
  demand: DemandModel;
  
  // Risk
  risk: RiskAssumptions;
  
  // Archetype-specific configs
  consensus?: ConsensusConfig;
  defi?: DeFiConfig;
  liquidStaking?: LiquidStakingConfig;
  restaking?: RestakingConfig;
  veGovernance?: VEGovernanceConfig;
}

// ========== Computation Outputs ==========

export interface StakingStep {
  t: number;
  price: number;
  circulatingSupply: number;
  stakeTokens: number;
  stakingRatio: number;
  targetStakingRatio: number;
  lockedTokens: number;
  rewardsToStakers: number; // in tokens
  grossAPR: number;
  netAPR: number;
  feeCoveragePct: number; // % of rewards from fees
  stakeValueUSD: number;
}

export interface CohortYield {
  cohort: string;
  netAPR: number;
  participationPct: number;
}

export interface StakingOutputs {
  steps: StakingStep[];
  cohorts: CohortYield[]; // for LST/restake/ve
  metadata: {
    finalStakingRatio: number;
    avgGrossAPR: number;
    avgNetAPR: number;
    avgFeeCoverage: number;
    totalStakeValueUSD: number;
    rewardRunwayMonths: number;
    floatLockedPct: number;
  };
}

// ========== Stress Test Scenarios ==========

export type StressTestType = 
  | "rate_hike" 
  | "fee_drawdown" 
  | "price_crash" 
  | "slash_event";

export interface StressTestResult {
  type: StressTestType;
  deltaStakingRatio: number;
  minStakingRatio: number;
  timeToRecoverSteps: number;
  securityBudgetReduction: number;
}

// ========== Presets ==========

export interface StakingPreset {
  name: string;
  description: string;
  model: StakingModel;
}

