// Staking Wizard Step Definitions
// Handles conditional step visibility based on archetype

import type { StakingArchetype } from "@/types/staking";

export type StakingStepId = 
  | "archetype"
  | "token"
  | "rewards"
  | "mechanics"
  | "demand"
  | "results";

export interface StakingStep {
  id: StakingStepId;
  label: string;
  shortLabel: string;
  description: string;
}

export const STAKING_STEPS: StakingStep[] = [
  {
    id: "archetype",
    label: "Archetype & Preset",
    shortLabel: "Type",
    description: "Select staking model type",
  },
  {
    id: "token",
    label: "Token Basics",
    shortLabel: "Token",
    description: "Supply and price configuration",
  },
  {
    id: "rewards",
    label: "Rewards Setup",
    shortLabel: "Rewards",
    description: "Inflation, fees, and other rewards",
  },
  {
    id: "mechanics",
    label: "Mechanics & Risk",
    shortLabel: "Mechanics",
    description: "Unbonding, lockups, and risk parameters",
  },
  {
    id: "demand",
    label: "Demand Model",
    shortLabel: "Demand",
    description: "Participation and elasticity",
  },
  {
    id: "results",
    label: "Results",
    shortLabel: "Results",
    description: "Analysis and projections",
  },
];

// Feature visibility by archetype
export interface ArchetypeFeatures {
  // Mechanics features
  showExitQueue: boolean;
  showUnbondingPeriod: boolean;
  showLockDurations: boolean;
  showOperatorCommission: boolean;
  showSlashingRisk: boolean;
  showMevRewards: boolean;
  
  // Rewards features
  showGaugesAndBribes: boolean;
  showLstYield: boolean;
  showRestakingYield: boolean;
  
  // Labels/descriptions
  unbondingLabel: string;
  riskLabel: string;
}

export const ARCHETYPE_FEATURES: Record<StakingArchetype, ArchetypeFeatures> = {
  consensus: {
    showExitQueue: true,
    showUnbondingPeriod: true,
    showLockDurations: false,
    showOperatorCommission: true,
    showSlashingRisk: true,
    showMevRewards: true,
    showGaugesAndBribes: false,
    showLstYield: false,
    showRestakingYield: false,
    unbondingLabel: "Unbonding Period",
    riskLabel: "Slashing & Downtime Risk",
  },
  defi: {
    showExitQueue: false,
    showUnbondingPeriod: true,
    showLockDurations: true,
    showOperatorCommission: false,
    showSlashingRisk: false,
    showMevRewards: false,
    showGaugesAndBribes: false,
    showLstYield: false,
    showRestakingYield: false,
    unbondingLabel: "Cooldown Period",
    riskLabel: "Smart Contract Risk",
  },
  liquid_staking: {
    showExitQueue: true,
    showUnbondingPeriod: true,
    showLockDurations: false,
    showOperatorCommission: true,
    showSlashingRisk: true,
    showMevRewards: true,
    showGaugesAndBribes: false,
    showLstYield: true,
    showRestakingYield: false,
    unbondingLabel: "Withdrawal Queue",
    riskLabel: "Slashing + Liquidity Risk",
  },
  restaking: {
    showExitQueue: false,
    showUnbondingPeriod: true,
    showLockDurations: false,
    showOperatorCommission: true,
    showSlashingRisk: true,
    showMevRewards: true,
    showGaugesAndBribes: false,
    showLstYield: false,
    showRestakingYield: true,
    unbondingLabel: "Unbonding Period",
    riskLabel: "Correlated Slashing Risk",
  },
  ve_governance: {
    showExitQueue: false,
    showUnbondingPeriod: false,
    showLockDurations: true,
    showOperatorCommission: false,
    showSlashingRisk: false,
    showMevRewards: false,
    showGaugesAndBribes: true,
    showLstYield: false,
    showRestakingYield: false,
    unbondingLabel: "Lock Duration",
    riskLabel: "Governance Risk",
  },
};

// Archetype display info
export interface ArchetypeInfo {
  id: StakingArchetype;
  name: string;
  icon: string;
  description: string;
  examples: string;
}

export const ARCHETYPE_INFO: ArchetypeInfo[] = [
  {
    id: "consensus",
    name: "Consensus (L1 PoS)",
    icon: "🔐",
    description: "Proof-of-Stake validation for L1 blockchains",
    examples: "Ethereum, Cosmos, Solana, Polkadot",
  },
  {
    id: "defi",
    name: "DeFi Staking",
    icon: "🌾",
    description: "Application-level staking for yield or utility",
    examples: "Aave Safety Module, GMX, dYdX",
  },
  {
    id: "liquid_staking",
    name: "Liquid Staking",
    icon: "💧",
    description: "Staking derivatives that maintain liquidity",
    examples: "Lido (stETH), Rocket Pool, Jito",
  },
  {
    id: "restaking",
    name: "Restaking",
    icon: "🔄",
    description: "Reuse staked assets to secure additional services",
    examples: "EigenLayer, Symbiotic, Karak",
  },
  {
    id: "ve_governance",
    name: "ve Governance",
    icon: "🗳️",
    description: "Vote-escrowed tokens for governance and fee sharing",
    examples: "Curve (veCRV), Balancer (veBAL), Aerodrome",
  },
];

// Helper to get features for an archetype
export function getArchetypeFeatures(archetype: StakingArchetype): ArchetypeFeatures {
  return ARCHETYPE_FEATURES[archetype];
}

// Helper to get archetype info
export function getArchetypeInfo(archetype: StakingArchetype): ArchetypeInfo | undefined {
  return ARCHETYPE_INFO.find(a => a.id === archetype);
}
