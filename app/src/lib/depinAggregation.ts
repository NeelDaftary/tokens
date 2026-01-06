/**
 * DePIN Aggregation & Validation
 * 
 * Handles aggregation of simulation runs into statistical summaries
 * and validation of configuration parameters.
 */

import type {
  SimulationResult,
  SimulationRun,
  AggregatedStep,
  MetricStats,
  DePINConfig,
  DePINValidationResult,
  ValidationError,
} from "@/types/depin";
import { DEMAND_PRESETS, MACRO_PRESETS } from "@/data/presets/depinPresets";

// ========== Statistical Utilities ==========

function computeStats(values: number[]): MetricStats {
  if (values.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, median: 0, p10: 0, p90: 0 };
  }

  // Sort for percentiles
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // Mean
  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  // Standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const std = Math.sqrt(variance);

  // Min/Max
  const min = sorted[0];
  const max = sorted[n - 1];

  // Median (50th percentile)
  const median = percentile(sorted, 0.5);

  // 10th and 90th percentiles
  const p10 = percentile(sorted, 0.1);
  const p90 = percentile(sorted, 0.9);

  return { mean, std, min, max, median, p10, p90 };
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  
  const index = p * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedValues[lower];
  }

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

// ========== Aggregation Function ==========

export function aggregateSimulationRuns(result: SimulationResult): SimulationResult {
  if (!result.runs || result.runs.length === 0) {
    return result;
  }

  const runs = result.runs;
  const timesteps = result.metadata.timesteps;
  const aggregated: AggregatedStep[] = [];

  // For each timestep, collect all values across runs
  for (let t = 0; t <= timesteps; t++) {
    const tokenPrices: number[] = [];
    const circulatingSupplies: number[] = [];
    const demands: number[] = [];
    const numProviders: number[] = [];
    const totalCapacities: number[] = [];
    const servicePrices: number[] = [];
    const netFlows: number[] = [];
    const tokensBoughts: number[] = [];
    const tokensSolds: number[] = [];
    const rewardRates: number[] = [];
    const macroFactors: number[] = [];

    for (const run of runs) {
      const state = run.states[t];
      if (state) {
        tokenPrices.push(state.tokenPrice);
        circulatingSupplies.push(state.circulatingSupply);
        demands.push(state.demand);
        numProviders.push(state.numProviders);
        totalCapacities.push(state.totalCapacity);
        servicePrices.push(state.servicePrice);
        netFlows.push(state.netFlow);
        tokensBoughts.push(state.tokensBought);
        tokensSolds.push(state.tokensSold);
        rewardRates.push(state.rewardRate);
        macroFactors.push(state.macroFactor);
      }
    }

    aggregated.push({
      timestep: t,
      tokenPrice: computeStats(tokenPrices),
      circulatingSupply: computeStats(circulatingSupplies),
      demand: computeStats(demands),
      numProviders: computeStats(numProviders),
      totalCapacity: computeStats(totalCapacities),
      servicePrice: computeStats(servicePrices),
      netFlow: computeStats(netFlows),
      tokensBought: computeStats(tokensBoughts),
      tokensSold: computeStats(tokensSolds),
      rewardRate: computeStats(rewardRates),
      macroFactor: computeStats(macroFactors),
    });
  }

  return {
    ...result,
    aggregate: aggregated,
  };
}

// ========== Validation Functions ==========

export function validateDePINConfig(config: DePINConfig): DePINValidationResult {
  const errors: ValidationError[] = [];

  // Validate demand type
  if (!Object.keys(DEMAND_PRESETS).includes(config.demandType)) {
    errors.push({
      field: "demandType",
      message: `Invalid demand type: ${config.demandType}`,
      allowedValues: Object.keys(DEMAND_PRESETS),
    });
  }

  // Validate macro condition
  if (!Object.keys(MACRO_PRESETS).includes(config.macroCondition)) {
    errors.push({
      field: "macroCondition",
      message: `Invalid macro condition: ${config.macroCondition}`,
      allowedValues: Object.keys(MACRO_PRESETS),
    });
  }

  // Validate token parameters
  if (config.initialSupply <= 0) {
    errors.push({
      field: "initialSupply",
      message: "Initial supply must be positive",
    });
  }

  if (config.initialTokenPrice <= 0) {
    errors.push({
      field: "initialTokenPrice",
      message: "Initial token price must be positive",
    });
  }

  if (config.initialServicePrice <= 0) {
    errors.push({
      field: "initialServicePrice",
      message: "Initial service price must be positive",
    });
  }

  // Validate demand params
  if (config.demandParams.baseDemand < 0) {
    errors.push({
      field: "demandParams.baseDemand",
      message: "Base demand cannot be negative",
    });
  }

  if (config.demandParams.priceElasticity < 0) {
    errors.push({
      field: "demandParams.priceElasticity",
      message: "Price elasticity cannot be negative",
    });
  }

  if (config.demandParams.noiseLevel < 0 || config.demandParams.noiseLevel > 1) {
    errors.push({
      field: "demandParams.noiseLevel",
      message: "Noise level must be between 0 and 1",
    });
  }

  // Validate protocol params
  if (config.protocolParams.maxMint < 0) {
    errors.push({
      field: "protocolParams.maxMint",
      message: "Max mint cannot be negative",
    });
  }

  if (
    config.protocolParams.percentBurned < 0 ||
    config.protocolParams.percentBurned > 1
  ) {
    errors.push({
      field: "protocolParams.percentBurned",
      message: "Percent burned must be between 0 and 1",
      allowedValues: [0, 1],
    });
  }

  if (config.protocolParams.servicePriceFloor < 0) {
    errors.push({
      field: "protocolParams.servicePriceFloor",
      message: "Service price floor cannot be negative",
    });
  }

  if (
    config.protocolParams.servicePriceCeiling <=
    config.protocolParams.servicePriceFloor
  ) {
    errors.push({
      field: "protocolParams.servicePriceCeiling",
      message: "Service price ceiling must be greater than floor",
    });
  }

  // Validate provider params
  if (config.providerParams.inflowRate < 0) {
    errors.push({
      field: "providerParams.inflowRate",
      message: "Provider inflow rate cannot be negative",
    });
  }

  if (config.providerParams.capacityDistribution.mean <= 0) {
    errors.push({
      field: "providerParams.capacityDistribution.mean",
      message: "Capacity distribution mean must be positive",
    });
  }

  if (config.providerParams.capacityDistribution.std < 0) {
    errors.push({
      field: "providerParams.capacityDistribution.std",
      message: "Capacity distribution std cannot be negative",
    });
  }

  if (
    config.providerParams.costDistribution.min < 0 ||
    config.providerParams.costDistribution.max < 0
  ) {
    errors.push({
      field: "providerParams.costDistribution",
      message: "Cost distribution bounds cannot be negative",
    });
  }

  if (
    config.providerParams.costDistribution.max <=
    config.providerParams.costDistribution.min
  ) {
    errors.push({
      field: "providerParams.costDistribution",
      message: "Cost distribution max must be greater than min",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ========== Helper: Extract Final Values ==========

export function extractFinalValues(result: SimulationResult): {
  tokenPrice: number[];
  circulatingSupply: number[];
  numProviders: number[];
} {
  if (!result.runs || result.runs.length === 0) {
    return { tokenPrice: [], circulatingSupply: [], numProviders: [] };
  }

  const finalTimestep = result.metadata.timesteps;
  const tokenPrice: number[] = [];
  const circulatingSupply: number[] = [];
  const numProviders: number[] = [];

  for (const run of result.runs) {
    const finalState = run.states[finalTimestep];
    if (finalState) {
      tokenPrice.push(finalState.tokenPrice);
      circulatingSupply.push(finalState.circulatingSupply);
      numProviders.push(finalState.numProviders);
    }
  }

  return { tokenPrice, circulatingSupply, numProviders };
}

// ========== Helper: Create Histogram Data ==========

export function createHistogram(
  values: number[],
  numBins: number = 20
): Array<{ bin: number; count: number; percentage: number }> {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / numBins;

  const bins: Array<{ bin: number; count: number; percentage: number }> = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = values.filter((v) => v >= binStart && v < binEnd).length;
    
    bins.push({
      bin: binStart + binWidth / 2, // bin center
      count,
      percentage: (count / values.length) * 100,
    });
  }

  return bins;
}

// ========== Helper: Check for Warnings ==========

export function checkForWarnings(result: SimulationResult): string[] {
  const warnings: string[] = [];

  if (!result.aggregate || result.aggregate.length === 0) {
    return warnings;
  }

  // Check for zero providers at any timestep
  const hasZeroProviders = result.aggregate.some(
    (step) => step.numProviders.mean === 0
  );
  if (hasZeroProviders) {
    warnings.push("Warning: Zero providers detected in some timesteps");
  }

  // Check for token price approaching zero
  const minTokenPrice = Math.min(...result.aggregate.map((s) => s.tokenPrice.mean));
  if (minTokenPrice < 0.1) {
    warnings.push(`Warning: Token price drops very low (min: $${minTokenPrice.toFixed(4)})`);
  }

  // Check for demand drops to near-zero
  const minDemand = Math.min(...result.aggregate.map((s) => s.demand.mean));
  if (minDemand < 10) {
    warnings.push(`Warning: Demand drops very low (min: ${minDemand.toFixed(2)} units)`);
  }

  // Check for high volatility (high std relative to mean)
  const finalStep = result.aggregate[result.aggregate.length - 1];
  const priceCV = finalStep.tokenPrice.std / finalStep.tokenPrice.mean;
  if (priceCV > 0.5) {
    warnings.push(
      `Warning: High price volatility detected (coefficient of variation: ${(priceCV * 100).toFixed(1)}%)`
    );
  }

  return warnings;
}

