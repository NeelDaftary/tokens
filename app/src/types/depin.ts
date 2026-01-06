// ========== DePIN Simulation Types ==========
// TypeScript port of radCAD DePIN model from https://github.com/NeelDaftary/depin_sim

// ========== Demand Types ==========

export type DemandType = "consistent" | "growth" | "high_to_decay" | "volatile";

export interface DemandPreset {
  name: string;
  description: string;
  baseParams: {
    baseDemand: number;
    growthRate?: number; // for growth type
    decayRate?: number; // for high_to_decay type
    volatility?: number; // for volatile type
    priceElasticity: number;
    noiseLevel: number;
  };
}

// ========== Macro Conditions ==========

export type MacroCondition = "bullish" | "bearish" | "sideways";

export interface MacroPreset {
  name: MacroCondition;
  description: string;
  driftRange: {
    min: number; // weekly % change
    max: number; // weekly % change
  };
}

// ========== Provider Configuration ==========

export interface ProviderParams {
  inflowRate: number; // Poisson lambda for new provider arrivals per period
  capacityDistribution: {
    type: "lognormal";
    mean: number;
    std: number;
  };
  costDistribution: {
    type: "uniform";
    min: number;
    max: number;
  };
  exitOnNegativeProfit: boolean;
}

// ========== Provider State ==========

export interface Provider {
  id: string;
  capacity: number; // units of service this provider can deliver
  cost: number; // $ cost per period to operate
  tokenBalance: number; // tokens held
  profitHistory: number[]; // recent profit history
  isActive: boolean;
  joinedAt: number; // timestep when joined
}

// ========== Protocol Configuration ==========

export interface ProtocolParams {
  maxMint: number; // max tokens to mint per period
  percentBurned: number; // 0-1, fraction of bought tokens to burn
  servicePriceFloor: number; // min $ per service unit
  servicePriceCeiling: number; // max $ per service unit
  servicePriceElasticity: number; // elasticity for price adjustment
  tokenPriceResponseCoef: number; // how quickly token price responds to flows
  demandMacroSensitivity: number; // how much macro affects demand
}

// ========== Simulation Configuration ==========

export interface DePINConfig {
  // Token parameters
  initialSupply: number;
  initialTokenPrice: number;
  initialServicePrice: number;
  
  // Demand configuration
  demandType: DemandType;
  demandParams: DemandPreset["baseParams"];
  
  // Macro configuration
  macroCondition: MacroCondition;
  macroSensitivity: number;
  
  // Provider configuration
  providerParams: ProviderParams;
  
  // Protocol parameters
  protocolParams: ProtocolParams;
}

export interface SimulationParams {
  timesteps: number; // default 52 (weeks)
  runs: number; // default 20 (Monte Carlo runs)
  seed?: number; // optional seed for reproducibility
  returnRaw: boolean; // return per-run data
}

// ========== Simulation State (per timestep) ==========

export interface SimulationState {
  timestep: number;
  
  // Token metrics
  tokenPrice: number;
  circulatingSupply: number;
  tokensBought: number; // tokens bought this period
  tokensSold: number; // tokens sold by providers
  mintedTokens: number;
  burnedTokens: number;
  netFlow: number; // buy - sell
  
  // Demand & service
  demand: number; // units of service demanded
  servicePrice: number; // $ per service unit
  
  // Provider metrics
  numProviders: number;
  totalCapacity: number;
  avgCapacity: number;
  rewardRate: number; // tokens per capacity unit
  
  // Macro
  macroFactor: number; // current macro multiplier
  
  // Provider details (for advanced analysis)
  providers: Provider[];
}

// ========== Aggregated Results ==========

export interface MetricStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  p10: number; // 10th percentile
  p90: number; // 90th percentile
}

export interface AggregatedStep {
  timestep: number;
  tokenPrice: MetricStats;
  circulatingSupply: MetricStats;
  demand: MetricStats;
  numProviders: MetricStats;
  totalCapacity: MetricStats;
  servicePrice: MetricStats;
  netFlow: MetricStats;
  tokensBought: MetricStats;
  tokensSold: MetricStats;
  rewardRate: MetricStats;
  macroFactor: MetricStats;
}

// ========== Simulation Results ==========

export interface SimulationRun {
  runId: number;
  seed: number;
  states: SimulationState[];
}

export interface SimulationResult {
  // Aggregated data (mean/std/percentiles by timestep)
  aggregate: AggregatedStep[];
  
  // Per-run data (optional, if returnRaw = true)
  runs?: SimulationRun[];
  
  // Metadata
  metadata: {
    config: DePINConfig;
    params: SimulationParams;
    seedUsed: number;
    timesteps: number;
    numRuns: number;
    computeTimeMs: number;
    timestamp: string;
  };
}

// ========== Validation & Errors ==========

export interface ValidationError {
  field: string;
  message: string;
  allowedValues?: string[] | number[];
}

export interface DePINValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ========== Preset Collections ==========

export interface DePINPresetCollection {
  demand: Record<DemandType, DemandPreset>;
  macro: Record<MacroCondition, MacroPreset>;
  scenarios: DePINScenario[];
}

export interface DePINScenario {
  name: string;
  description: string;
  config: DePINConfig;
  params: SimulationParams;
}

// ========== Export Formats ==========

export interface DePINExportJSON {
  version: string;
  result: SimulationResult;
}

export interface DePINExportCSVRow {
  timestep: number;
  metric: string;
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  p10: number;
  p90: number;
}

// ========== Chart Data Formats ==========

export interface TimeSeriesChartData {
  timestep: number;
  mean: number;
  std: number;
  lower: number; // mean - std
  upper: number; // mean + std
  p10?: number;
  p90?: number;
}

export interface SpaghettiChartData {
  timestep: number;
  runId: number;
  value: number;
}

export interface HistogramData {
  bin: number;
  count: number;
  percentage: number;
}

// ========== Random Number Generator Interface ==========

export interface DePINRNG {
  random(): number; // uniform [0, 1)
  poisson(lambda: number): number;
  lognormal(mean: number, std: number): number;
  uniform(min: number, max: number): number;
  normal(mean: number, std: number): number;
}

