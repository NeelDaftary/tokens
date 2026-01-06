/**
 * Central registry of all specialized simulators
 * Add new simulators here to make them appear in the sidebar
 */

export interface Simulator {
  id: string;
  name: string;
  description: string;
  category: SimulatorCategory;
  icon: string;
  route: string;
  enabled: boolean; // Set to false for coming soon items
}

export type SimulatorCategory = 
  | "Protocol Mechanics"
  | "DeFi Protocols"
  | "Infrastructure"
  | "Trading Mechanisms";

export const SIMULATORS: Simulator[] = [
  // ========== Protocol Mechanics ==========
  {
    id: "depin",
    name: "DePIN Network Economics",
    description: "Simulate provider dynamics, token flows, and pricing mechanisms for decentralized physical infrastructure networks",
    category: "Protocol Mechanics",
    icon: "🔗",
    route: "/depin",
    enabled: true,
  },
  {
    id: "bonding-curve",
    name: "Bonding Curve Simulator",
    description: "Model token price dynamics with different curve shapes and parameters",
    category: "Protocol Mechanics",
    icon: "📈",
    route: "/bonding-curve",
    enabled: false, // Coming soon
  },
  {
    id: "ve-tokenomics",
    name: "veTokenomics Designer",
    description: "Design vote-escrowed token systems with lockup incentives and governance power",
    category: "Protocol Mechanics",
    icon: "🗳️",
    route: "/ve-tokenomics",
    enabled: false, // Coming soon
  },

  // ========== DeFi Protocols ==========
  {
    id: "lending-apy",
    name: "Lending Protocol APY",
    description: "Calculate supply/borrow rates, utilization curves, and protocol reserves",
    category: "DeFi Protocols",
    icon: "🏦",
    route: "/lending-apy",
    enabled: false, // Coming soon
  },
  {
    id: "il-calculator",
    name: "Impermanent Loss Calculator",
    description: "Analyze IL across different price ranges and liquidity positions",
    category: "DeFi Protocols",
    icon: "💧",
    route: "/il-calculator",
    enabled: false, // Coming soon
  },
  {
    id: "options-greeks",
    name: "Options Greeks Calculator",
    description: "Calculate delta, gamma, theta, vega for crypto options strategies",
    category: "DeFi Protocols",
    icon: "📊",
    route: "/options-greeks",
    enabled: false, // Coming soon
  },

  // ========== Trading Mechanisms ==========
  {
    id: "amm-simulator",
    name: "AMM Pool Simulator",
    description: "Simulate Uniswap V2/V3 pools with custom fee tiers and ranges",
    category: "Trading Mechanisms",
    icon: "💱",
    route: "/amm-simulator",
    enabled: false, // Coming soon
  },
  {
    id: "perp-funding",
    name: "Perpetual Funding Rates",
    description: "Model funding rate dynamics and long/short imbalances",
    category: "Trading Mechanisms",
    icon: "⚡",
    route: "/perp-funding",
    enabled: false, // Coming soon
  },

  // ========== Infrastructure ==========
  {
    id: "gas-modeling",
    name: "Gas Price Modeling",
    description: "Simulate EIP-1559 base fee dynamics and priority fee markets",
    category: "Infrastructure",
    icon: "⛽",
    route: "/gas-modeling",
    enabled: false, // Coming soon
  },
  {
    id: "mev-analysis",
    name: "MEV Impact Analysis",
    description: "Estimate MEV extraction across different transaction types",
    category: "Infrastructure",
    icon: "🤖",
    route: "/mev-analysis",
    enabled: false, // Coming soon
  },
];

/**
 * Get simulators grouped by category
 */
export function getSimulatorsByCategory(): Record<SimulatorCategory, Simulator[]> {
  const grouped: Record<string, Simulator[]> = {};
  
  for (const simulator of SIMULATORS) {
    if (!grouped[simulator.category]) {
      grouped[simulator.category] = [];
    }
    grouped[simulator.category].push(simulator);
  }
  
  return grouped as Record<SimulatorCategory, Simulator[]>;
}

/**
 * Get all enabled simulators
 */
export function getEnabledSimulators(): Simulator[] {
  return SIMULATORS.filter(s => s.enabled);
}

/**
 * Category icons and descriptions
 */
export const CATEGORY_INFO: Record<SimulatorCategory, { icon: string; description: string }> = {
  "Protocol Mechanics": {
    icon: "📊",
    description: "Core tokenomics and protocol mechanisms",
  },
  "DeFi Protocols": {
    icon: "🏦",
    description: "Lending, staking, and yield optimization",
  },
  "Trading Mechanisms": {
    icon: "💱",
    description: "DEX, AMM, and trading dynamics",
  },
  "Infrastructure": {
    icon: "⛓️",
    description: "Gas, MEV, and network economics",
  },
};

