import type {
  DePINPresetCollection,
  DePINScenario,
  DemandPreset,
  MacroPreset,
} from "@/types/depin";

// ========== Demand Presets ==========
// Based on radCAD model demand scenarios

export const DEMAND_PRESETS: Record<string, DemandPreset> = {
  consistent: {
    name: "Consistent",
    description: "Stable demand with low volatility, suitable for mature networks",
    baseParams: {
      baseDemand: 1000, // units per week
      priceElasticity: 0.5, // moderate price sensitivity
      noiseLevel: 0.05, // 5% noise
    },
  },
  growth: {
    name: "Growth",
    description: "Exponential growth scenario, typical of early network adoption",
    baseParams: {
      baseDemand: 500, // starting demand
      growthRate: 0.03, // 3% weekly growth
      priceElasticity: 0.7, // higher sensitivity during growth
      noiseLevel: 0.1, // 10% noise
    },
  },
  high_to_decay: {
    name: "High to Decay",
    description: "Initial surge followed by exponential decay, common in incentive programs",
    baseParams: {
      baseDemand: 5000, // high initial demand
      decayRate: 0.05, // 5% weekly decay
      priceElasticity: 0.4, // lower sensitivity
      noiseLevel: 0.15, // 15% noise
    },
  },
  volatile: {
    name: "Volatile",
    description: "High volatility with random shocks, representing uncertain market conditions",
    baseParams: {
      baseDemand: 1500,
      volatility: 0.3, // 30% volatility
      priceElasticity: 0.6,
      noiseLevel: 0.2, // 20% noise
    },
  },
};

// ========== Macro Presets ==========
// Based on radCAD macro conditions

export const MACRO_PRESETS: Record<string, MacroPreset> = {
  bullish: {
    name: "bullish",
    description: "Positive market sentiment with upward price pressure",
    driftRange: {
      min: 0.02, // 2% weekly gain
      max: 0.05, // 5% weekly gain
    },
  },
  bearish: {
    name: "bearish",
    description: "Negative market sentiment with downward price pressure",
    driftRange: {
      min: -0.05, // -5% weekly loss
      max: -0.02, // -2% weekly loss
    },
  },
  sideways: {
    name: "sideways",
    description: "Neutral market with low directional movement",
    driftRange: {
      min: -0.01, // -1% weekly
      max: 0.01, // +1% weekly
    },
  },
};

// ========== Complete Scenario Presets ==========

export const DEPIN_SCENARIOS: DePINScenario[] = [
  {
    name: "Baseline Growth",
    description: "Healthy network growth with bullish macro conditions",
    config: {
      initialSupply: 1_000_000,
      initialTokenPrice: 1.0,
      initialServicePrice: 10.0,
      demandType: "growth",
      demandParams: {
        baseDemand: 800,
        growthRate: 0.025, // 2.5% weekly
        priceElasticity: 0.6,
        noiseLevel: 0.08,
      },
      macroCondition: "bullish",
      macroSensitivity: 0.3,
      providerParams: {
        inflowRate: 5, // avg 5 new providers per week
        capacityDistribution: {
          type: "lognormal",
          mean: 100,
          std: 30,
        },
        costDistribution: {
          type: "uniform",
          min: 50,
          max: 150,
        },
        exitOnNegativeProfit: true,
      },
      protocolParams: {
        maxMint: 2000,
        percentBurned: 0.5,
        servicePriceFloor: 5.0,
        servicePriceCeiling: 50.0,
        servicePriceElasticity: 0.8,
        tokenPriceResponseCoef: 0.1,
        demandMacroSensitivity: 0.2,
      },
    },
    params: {
      timesteps: 52,
      runs: 20,
      returnRaw: false,
    },
  },
  {
    name: "Bear Market Stress Test",
    description: "Testing resilience during prolonged bear market",
    config: {
      initialSupply: 1_000_000,
      initialTokenPrice: 1.0,
      initialServicePrice: 10.0,
      demandType: "consistent",
      demandParams: {
        baseDemand: 1200,
        priceElasticity: 0.5,
        noiseLevel: 0.1,
      },
      macroCondition: "bearish",
      macroSensitivity: 0.4,
      providerParams: {
        inflowRate: 3,
        capacityDistribution: {
          type: "lognormal",
          mean: 80,
          std: 25,
        },
        costDistribution: {
          type: "uniform",
          min: 40,
          max: 120,
        },
        exitOnNegativeProfit: true,
      },
      protocolParams: {
        maxMint: 1500,
        percentBurned: 0.3, // lower burn to sustain rewards
        servicePriceFloor: 5.0,
        servicePriceCeiling: 50.0,
        servicePriceElasticity: 0.7,
        tokenPriceResponseCoef: 0.08,
        demandMacroSensitivity: 0.25,
      },
    },
    params: {
      timesteps: 52,
      runs: 30,
      returnRaw: false,
    },
  },
  {
    name: "High Burn, Low Mint",
    description: "Deflationary model with high burn rate",
    config: {
      initialSupply: 500_000,
      initialTokenPrice: 2.0,
      initialServicePrice: 15.0,
      demandType: "growth",
      demandParams: {
        baseDemand: 600,
        growthRate: 0.02,
        priceElasticity: 0.55,
        noiseLevel: 0.09,
      },
      macroCondition: "sideways",
      macroSensitivity: 0.2,
      providerParams: {
        inflowRate: 4,
        capacityDistribution: {
          type: "lognormal",
          mean: 120,
          std: 35,
        },
        costDistribution: {
          type: "uniform",
          min: 60,
          max: 180,
        },
        exitOnNegativeProfit: true,
      },
      protocolParams: {
        maxMint: 1000, // low mint cap
        percentBurned: 0.8, // high burn rate
        servicePriceFloor: 8.0,
        servicePriceCeiling: 60.0,
        servicePriceElasticity: 0.75,
        tokenPriceResponseCoef: 0.12,
        demandMacroSensitivity: 0.15,
      },
    },
    params: {
      timesteps: 52,
      runs: 20,
      returnRaw: false,
    },
  },
  {
    name: "Incentive Launch",
    description: "High initial demand with decay, simulating launch incentives",
    config: {
      initialSupply: 2_000_000,
      initialTokenPrice: 0.5,
      initialServicePrice: 5.0,
      demandType: "high_to_decay",
      demandParams: {
        baseDemand: 8000, // very high initial
        decayRate: 0.04, // 4% weekly decay
        priceElasticity: 0.4,
        noiseLevel: 0.12,
      },
      macroCondition: "bullish",
      macroSensitivity: 0.35,
      providerParams: {
        inflowRate: 10, // high provider interest
        capacityDistribution: {
          type: "lognormal",
          mean: 150,
          std: 50,
        },
        costDistribution: {
          type: "uniform",
          min: 80,
          max: 200,
        },
        exitOnNegativeProfit: true,
      },
      protocolParams: {
        maxMint: 5000, // high mint to support incentives
        percentBurned: 0.4,
        servicePriceFloor: 3.0,
        servicePriceCeiling: 40.0,
        servicePriceElasticity: 0.85,
        tokenPriceResponseCoef: 0.15,
        demandMacroSensitivity: 0.3,
      },
    },
    params: {
      timesteps: 52,
      runs: 25,
      returnRaw: false,
    },
  },
  {
    name: "Volatile Market",
    description: "High uncertainty with volatile demand and sideways macro",
    config: {
      initialSupply: 1_500_000,
      initialTokenPrice: 1.5,
      initialServicePrice: 12.0,
      demandType: "volatile",
      demandParams: {
        baseDemand: 1800,
        volatility: 0.35, // 35% volatility
        priceElasticity: 0.65,
        noiseLevel: 0.18,
      },
      macroCondition: "sideways",
      macroSensitivity: 0.25,
      providerParams: {
        inflowRate: 6,
        capacityDistribution: {
          type: "lognormal",
          mean: 90,
          std: 28,
        },
        costDistribution: {
          type: "uniform",
          min: 45,
          max: 135,
        },
        exitOnNegativeProfit: true,
      },
      protocolParams: {
        maxMint: 2500,
        percentBurned: 0.5,
        servicePriceFloor: 6.0,
        servicePriceCeiling: 45.0,
        servicePriceElasticity: 0.7,
        tokenPriceResponseCoef: 0.1,
        demandMacroSensitivity: 0.2,
      },
    },
    params: {
      timesteps: 52,
      runs: 30,
      returnRaw: false,
    },
  },
  {
    name: "Minimal Burn, High Provider Churn",
    description: "Testing with low burn and high provider turnover",
    config: {
      initialSupply: 800_000,
      initialTokenPrice: 1.2,
      initialServicePrice: 8.0,
      demandType: "consistent",
      demandParams: {
        baseDemand: 1000,
        priceElasticity: 0.5,
        noiseLevel: 0.07,
      },
      macroCondition: "sideways",
      macroSensitivity: 0.15,
      providerParams: {
        inflowRate: 8, // high inflow
        capacityDistribution: {
          type: "lognormal",
          mean: 70,
          std: 20,
        },
        costDistribution: {
          type: "uniform",
          min: 55,
          max: 125,
        },
        exitOnNegativeProfit: true,
      },
      protocolParams: {
        maxMint: 3000,
        percentBurned: 0.1, // minimal burn
        servicePriceFloor: 4.0,
        servicePriceCeiling: 35.0,
        servicePriceElasticity: 0.8,
        tokenPriceResponseCoef: 0.09,
        demandMacroSensitivity: 0.18,
      },
    },
    params: {
      timesteps: 52,
      runs: 20,
      returnRaw: false,
    },
  },
];

// ========== Preset Collection Export ==========

export const DEPIN_PRESET_COLLECTION: DePINPresetCollection = {
  demand: DEMAND_PRESETS as any,
  macro: MACRO_PRESETS as any,
  scenarios: DEPIN_SCENARIOS,
};

// ========== Default Configuration ==========

export const DEFAULT_DEPIN_CONFIG = DEPIN_SCENARIOS[0].config;
export const DEFAULT_SIMULATION_PARAMS = DEPIN_SCENARIOS[0].params;

