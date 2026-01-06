/**
 * DePIN Simulation Engine
 * TypeScript port of radCAD model from https://github.com/NeelDaftary/depin_sim
 * 
 * This module provides a deterministic, seedable simulation of DePIN token economics
 * modeling provider dynamics, demand scenarios, token flows, and pricing mechanisms.
 */

import seedrandom from "seedrandom";
import type {
  DePINConfig,
  SimulationParams,
  SimulationResult,
  SimulationState,
  SimulationRun,
  Provider,
  DePINRNG,
} from "@/types/depin";

// ========== Seeded RNG Implementation ==========

class SeededRNG implements DePINRNG {
  private rng: seedrandom.PRNG;

  constructor(seed: number) {
    this.rng = seedrandom(seed.toString());
  }

  random(): number {
    return this.rng();
  }

  // Box-Muller transform for normal distribution
  normal(mean: number = 0, std: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * std + mean;
  }

  // Poisson distribution (Knuth algorithm)
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.random();
    } while (p > L);
    return k - 1;
  }

  // Lognormal distribution
  lognormal(mean: number, std: number): number {
    const normalValue = this.normal(0, 1);
    // Convert to lognormal parameters
    const mu = Math.log(mean ** 2 / Math.sqrt(std ** 2 + mean ** 2));
    const sigma = Math.sqrt(Math.log(1 + (std ** 2 / mean ** 2)));
    return Math.exp(mu + sigma * normalValue);
  }

  // Uniform distribution
  uniform(min: number, max: number): number {
    return min + this.random() * (max - min);
  }
}

// ========== Demand Generation ==========

function generateDemand(
  config: DePINConfig,
  timestep: number,
  servicePrice: number,
  macroFactor: number,
  previousDemand: number | null,
  rng: DePINRNG
): number {
  const { demandType, demandParams } = config;
  const {
    baseDemand,
    priceElasticity,
    noiseLevel,
    growthRate,
    decayRate,
    volatility,
  } = demandParams;

  // Price adjustment (elasticity effect)
  const priceAdjustment = Math.exp(-0.5 * priceElasticity * Math.log(servicePrice / 10));

  // Noise component
  const noise = 1 + rng.normal(0, noiseLevel);

  let demand: number;

  switch (demandType) {
    case "consistent":
      demand = baseDemand * priceAdjustment * noise;
      break;

    case "growth":
      if (previousDemand === null || timestep === 0) {
        demand = baseDemand * priceAdjustment * noise;
      } else {
        const growth = 1 + (growthRate || 0.03);
        demand = previousDemand * growth * priceAdjustment * noise;
      }
      break;

    case "high_to_decay":
      const decay = Math.exp(-(decayRate || 0.05) * timestep);
      demand = baseDemand * decay * priceAdjustment * noise;
      break;

    case "volatile":
      const shock = 1 + rng.uniform(-1, 1) * (volatility || 0.3);
      demand = baseDemand * shock * priceAdjustment * noise;
      break;

    default:
      demand = baseDemand * priceAdjustment * noise;
  }

  // Apply macro sensitivity to demand
  const macroAdjustedDemand = demand * (1 + macroFactor * config.protocolParams.demandMacroSensitivity);

  return Math.max(0, macroAdjustedDemand);
}

// ========== Provider Dynamics ==========

function generateCandidateProviders(
  config: DePINConfig,
  rng: DePINRNG
): Provider[] {
  const count = rng.poisson(config.providerParams.inflowRate);
  const providers: Provider[] = [];

  for (let i = 0; i < count; i++) {
    const capacity = rng.lognormal(
      config.providerParams.capacityDistribution.mean,
      config.providerParams.capacityDistribution.std
    );
    const cost = rng.uniform(
      config.providerParams.costDistribution.min,
      config.providerParams.costDistribution.max
    );

    providers.push({
      id: `provider-${Date.now()}-${i}`,
      capacity: Math.max(1, capacity),
      cost: Math.max(0, cost),
      tokenBalance: 0,
      profitHistory: [],
      isActive: false, // will be set to true if they onboard
      joinedAt: 0,
    });
  }

  return providers;
}

function shouldProviderOnboard(
  provider: Provider,
  rewardRate: number,
  tokenPrice: number
): boolean {
  // Provider onboards if expected revenue > cost
  const expectedRevenue = provider.capacity * rewardRate * tokenPrice;
  return expectedRevenue > provider.cost;
}

function checkProviderExit(
  provider: Provider,
  config: DePINConfig
): boolean {
  if (!config.providerParams.exitOnNegativeProfit) return false;

  // Exit if latest profit is negative
  if (provider.profitHistory.length > 0) {
    const latestProfit = provider.profitHistory[provider.profitHistory.length - 1];
    return latestProfit <= 0;
  }

  return false;
}

// ========== Protocol Service & Token Flows ==========

function executeProtocolService(
  state: SimulationState,
  config: DePINConfig,
  demand: number
): {
  tokensBought: number;
  mintedTokens: number;
  burnedTokens: number;
  rewardRate: number;
} {
  const { tokenPrice, servicePrice, totalCapacity } = state;
  const { maxMint, percentBurned } = config.protocolParams;

  // Tokens bought by users for service
  const tokensBought = (demand * servicePrice) / tokenPrice;

  // Minted tokens (capped at maxMint)
  const mintedTokens = Math.min(tokensBought, maxMint);

  // Burned tokens
  const burnedTokens = tokensBought * percentBurned;

  // Reward rate (tokens per capacity unit)
  // Guard against division by zero
  const rewardRate = totalCapacity > 0 ? mintedTokens / totalCapacity : 0;

  return {
    tokensBought,
    mintedTokens,
    burnedTokens,
    rewardRate,
  };
}

function distributeRewardsAndSellTokens(
  providers: Provider[],
  rewardRate: number,
  tokenPrice: number
): number {
  let totalTokensSold = 0;

  for (const provider of providers) {
    if (!provider.isActive) continue;

    // Provider receives rewards
    const rewards = provider.capacity * rewardRate;
    provider.tokenBalance += rewards;

    // Provider sells tokens to cover costs
    const tokensToSell = Math.min(provider.tokenBalance, provider.cost / tokenPrice);
    provider.tokenBalance -= tokensToSell;
    totalTokensSold += tokensToSell;

    // Calculate profit for this period
    const revenue = tokensToSell * tokenPrice;
    const profit = revenue - provider.cost;
    provider.profitHistory.push(profit);

    // Keep only recent history (last 4 weeks)
    if (provider.profitHistory.length > 4) {
      provider.profitHistory.shift();
    }
  }

  return totalTokensSold;
}

// ========== Pricing Mechanisms ==========

function updateServicePrice(
  state: SimulationState,
  config: DePINConfig,
  demand: number
): number {
  const { totalCapacity, servicePrice } = state;
  const {
    servicePriceFloor,
    servicePriceCeiling,
    servicePriceElasticity,
  } = config.protocolParams;

  if (totalCapacity === 0) {
    // No capacity: price hits ceiling
    return servicePriceCeiling;
  }

  // Market-clearing approximation
  // If demand > capacity, price increases; if capacity > demand, price decreases
  const utilizationRatio = demand / totalCapacity;
  const priceAdjustment = Math.pow(utilizationRatio, servicePriceElasticity);
  
  let newPrice = servicePrice * priceAdjustment;

  // Apply bounds
  newPrice = Math.max(servicePriceFloor, Math.min(servicePriceCeiling, newPrice));

  return newPrice;
}

function updateTokenPrice(
  state: SimulationState,
  config: DePINConfig,
  netFlow: number,
  macroFactor: number
): number {
  const { tokenPrice, circulatingSupply } = state;
  const { tokenPriceResponseCoef } = config.protocolParams;

  if (circulatingSupply === 0) return tokenPrice;

  // Exponential response to net flow / supply
  const flowRatio = netFlow / circulatingSupply;
  const priceChange = Math.exp(tokenPriceResponseCoef * flowRatio);

  // Apply macro factor
  const newPrice = tokenPrice * priceChange * (1 + macroFactor);

  return Math.max(0.01, newPrice); // Floor at $0.01
}

// ========== Macro Dynamics ==========

function updateMacro(
  config: DePINConfig,
  timestep: number,
  rng: DePINRNG
): number {
  const { macroCondition, macroSensitivity } = config;
  
  let driftRange: { min: number; max: number };

  switch (macroCondition) {
    case "bullish":
      driftRange = { min: 0.02, max: 0.05 };
      break;
    case "bearish":
      driftRange = { min: -0.05, max: -0.02 };
      break;
    case "sideways":
      driftRange = { min: -0.01, max: 0.01 };
      break;
    default:
      driftRange = { min: -0.01, max: 0.01 };
  }

  const drift = rng.uniform(driftRange.min, driftRange.max);
  return drift * macroSensitivity;
}

// ========== Main Simulation Step ==========

function simulateStep(
  state: SimulationState,
  config: DePINConfig,
  timestep: number,
  previousDemand: number | null,
  rng: DePINRNG
): SimulationState {
  // 1. Update macro factor
  const macroFactor = updateMacro(config, timestep, rng);

  // 2. Generate demand
  const demand = generateDemand(
    config,
    timestep,
    state.servicePrice,
    macroFactor,
    previousDemand,
    rng
  );

  // 3. Generate candidate providers
  const candidates = generateCandidateProviders(config, rng);

  // 4. Onboard new providers
  for (const candidate of candidates) {
    if (shouldProviderOnboard(candidate, state.rewardRate, state.tokenPrice)) {
      candidate.isActive = true;
      candidate.joinedAt = timestep;
      state.providers.push(candidate);
    }
  }

  // 5. Check for provider exits
  const exitingProviders: Provider[] = [];
  state.providers = state.providers.filter((provider) => {
    if (checkProviderExit(provider, config)) {
      exitingProviders.push(provider);
      return false;
    }
    return true;
  });

  // 6. Execute protocol service
  const activeProviders = state.providers.filter((p) => p.isActive);
  const totalCapacity = activeProviders.reduce((sum, p) => sum + p.capacity, 0);
  const avgCapacity = totalCapacity > 0 ? totalCapacity / activeProviders.length : 0;

  state.totalCapacity = totalCapacity;
  state.avgCapacity = avgCapacity;
  state.numProviders = activeProviders.length;

  const { tokensBought, mintedTokens, burnedTokens, rewardRate } = executeProtocolService(
    { ...state, totalCapacity },
    config,
    demand
  );

  // 7. Distribute rewards and providers sell tokens
  const tokensSoldByProviders = distributeRewardsAndSellTokens(
    state.providers,
    rewardRate,
    state.tokenPrice
  );

  // Exiting providers sell all their tokens
  let tokensSoldByExiting = 0;
  for (const provider of exitingProviders) {
    tokensSoldByExiting += provider.tokenBalance;
  }

  const tokensSold = tokensSoldByProviders + tokensSoldByExiting;

  // 8. Update supply
  const circulatingSupply = state.circulatingSupply + mintedTokens - burnedTokens;

  // 9. Calculate net flow
  const netFlow = tokensBought - tokensSold;

  // 10. Update prices
  const servicePrice = updateServicePrice(
    { ...state, totalCapacity },
    config,
    demand
  );
  const tokenPrice = updateTokenPrice(
    { ...state, circulatingSupply },
    config,
    netFlow,
    macroFactor
  );

  // 11. Return new state
  return {
    timestep,
    tokenPrice,
    circulatingSupply,
    tokensBought,
    tokensSold,
    mintedTokens,
    burnedTokens,
    netFlow,
    demand,
    servicePrice,
    numProviders: activeProviders.length,
    totalCapacity,
    avgCapacity,
    rewardRate,
    macroFactor,
    providers: state.providers,
  };
}

// ========== Main Simulation Runner ==========

export function runDePINSimulation(
  config: DePINConfig,
  params: SimulationParams
): SimulationResult {
  const startTime = Date.now();
  const seedUsed = params.seed !== undefined ? params.seed : Math.floor(Math.random() * 1000000);
  
  const runs: SimulationRun[] = [];

  for (let runId = 0; runId < params.runs; runId++) {
    const runSeed = seedUsed + runId;
    const rng = new SeededRNG(runSeed);
    const states: SimulationState[] = [];

    // Initialize state
    let state: SimulationState = {
      timestep: 0,
      tokenPrice: config.initialTokenPrice,
      circulatingSupply: config.initialSupply,
      tokensBought: 0,
      tokensSold: 0,
      mintedTokens: 0,
      burnedTokens: 0,
      netFlow: 0,
      demand: config.demandParams.baseDemand,
      servicePrice: config.initialServicePrice,
      numProviders: 0,
      totalCapacity: 0,
      avgCapacity: 0,
      rewardRate: 0,
      macroFactor: 0,
      providers: [],
    };

    states.push({ ...state });

    let previousDemand: number | null = null;

    // Run simulation steps
    for (let t = 1; t <= params.timesteps; t++) {
      state = simulateStep(state, config, t, previousDemand, rng);
      previousDemand = state.demand;
      
      // Deep copy state for storage
      states.push(JSON.parse(JSON.stringify(state)));
    }

    runs.push({
      runId,
      seed: runSeed,
      states,
    });
  }

  const computeTimeMs = Date.now() - startTime;

  // Prepare result
  const result: SimulationResult = {
    aggregate: [], // Will be computed by aggregation module
    runs: params.returnRaw ? runs : undefined,
    metadata: {
      config,
      params,
      seedUsed,
      timesteps: params.timesteps,
      numRuns: params.runs,
      computeTimeMs,
      timestamp: new Date().toISOString(),
    },
  };

  return result;
}

// ========== Utility: Extract Time Series for Charting ==========

export function extractMetricTimeSeries(
  runs: SimulationRun[],
  metric: keyof SimulationState
): SpaghettiData[] {
  const data: SpaghettiData[] = [];
  
  for (const run of runs) {
    for (const state of run.states) {
      const value = state[metric];
      if (typeof value === "number") {
        data.push({
          timestep: state.timestep,
          runId: run.runId,
          value,
        });
      }
    }
  }
  
  return data;
}

interface SpaghettiData {
  timestep: number;
  runId: number;
  value: number;
}

