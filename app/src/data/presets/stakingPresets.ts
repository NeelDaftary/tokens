import type { StakingPreset } from "@/types/staking";

/**
 * 6 Staking Presets as specified
 */
export const stakingPresets: StakingPreset[] = [
  {
    name: "L1 PoS Conservative",
    description: "Long unbonding period, moderate inflation, high security focus",
    model: {
      version: 1,
      name: "L1 PoS Conservative",
      archetype: "consensus",
      hybridMode: false,
      tokenSymbol: "LAYER",
      totalSupply: 1_000_000_000,
      circulatingSupply0: 200_000_000,
      initialPrice: 10,
      priceScenario: {
        type: "flat",
        price: 10,
      },
      unlockSchedule: [
        { t: 12, amount: 100_000_000 },
        { t: 24, amount: 150_000_000 },
        { t: 36, amount: 200_000_000 },
      ],
      timeStep: "monthly",
      horizonSteps: 48,
      rewards: {
        inflation: {
          enabled: true,
          annualInflationRate: 0.05,
          distributionToStakersPct: 0.9,
        },
        fees: {
          enabled: true,
          feesPerStep: 50000,
          feeShareToStakersPct: 0.5,
        },
        other: [],
      },
      staking: {
        unbondingSteps: 3,
        lockupOptions: [{ lockSteps: 0, boost: 1 }],
        rewardCompounding: "auto",
        operatorCommissionPct: 0.08,
        maxStakePctOfSupply: 0.8,
      },
      demand: {
        opportunityCostAnnual: 0.08,
        elasticityPreset: "medium",
        baseParticipation: 0.4,
        maxParticipation: 0.75,
        adjustmentSpeed: 0.1,
        lockupPenaltyModel: {
          type: "linear",
          penaltyPerLockStep: 0.003,
        },
        riskPenaltyAnnual: 0.01,
      },
      risk: {
        slashProbAnnual: 0.02,
        slashSeverityPct: 0.05,
        smartContractRiskAnnual: 0.005,
        liquidityDiscountPct: 0,
        concentrationModel: {
          topNSharePct: 0.33,
          numValidators: 150,
        },
      },
      consensus: {
        rewardCurve: {
          type: "simple_inverse",
          targetStakeRatio: 0.67,
          aprAtTarget: 0.08,
          aprMin: 0.03,
          aprMax: 0.15,
        },
        slashablePctOfStake: 1.0,
        mevPerStep: 10000,
      },
    },
  },
  {
    name: "L1 PoS Aggressive",
    description: "High inflation early, target high stake ratio for security",
    model: {
      version: 1,
      name: "L1 PoS Aggressive",
      archetype: "consensus",
      hybridMode: false,
      tokenSymbol: "FAST",
      totalSupply: 500_000_000,
      circulatingSupply0: 100_000_000,
      initialPrice: 5,
      priceScenario: {
        type: "bull_base_bear",
        bullMultiplier: 2.0,
        baseMultiplier: 1.0,
        bearMultiplier: 0.5,
        horizonMonths: 36,
      },
      unlockSchedule: [
        { t: 6, amount: 50_000_000 },
        { t: 12, amount: 75_000_000 },
        { t: 18, amount: 100_000_000 },
      ],
      timeStep: "monthly",
      horizonSteps: 36,
      rewards: {
        inflation: {
          enabled: true,
          annualInflationRate: 0.12,
          distributionToStakersPct: 0.95,
          inflationSchedule: [
            { t: 0, annualRate: 0.15 },
            { t: 12, annualRate: 0.10 },
            { t: 24, annualRate: 0.06 },
          ],
        },
        fees: {
          enabled: true,
          feesModel: {
            type: "grow",
            params: {
              constantFees: 20000,
              growthRate: 0.05,
            },
          },
          feeShareToStakersPct: 0.7,
        },
        other: [],
      },
      staking: {
        unbondingSteps: 2,
        lockupOptions: [{ lockSteps: 0, boost: 1 }],
        rewardCompounding: "auto",
        operatorCommissionPct: 0.10,
        maxStakePctOfSupply: 0.85,
      },
      demand: {
        opportunityCostAnnual: 0.10,
        elasticityPreset: "high",
        baseParticipation: 0.5,
        maxParticipation: 0.85,
        adjustmentSpeed: 0.15,
        lockupPenaltyModel: {
          type: "linear",
          penaltyPerLockStep: 0.002,
        },
        riskPenaltyAnnual: 0.015,
      },
      risk: {
        slashProbAnnual: 0.03,
        slashSeverityPct: 0.1,
        smartContractRiskAnnual: 0.01,
        liquidityDiscountPct: 0,
        concentrationModel: {
          topNSharePct: 0.4,
          numValidators: 100,
        },
      },
      consensus: {
        rewardCurve: {
          type: "simple_inverse",
          targetStakeRatio: 0.75,
          aprAtTarget: 0.12,
          aprMin: 0.05,
          aprMax: 0.20,
        },
        slashablePctOfStake: 1.0,
        mevPerStep: 15000,
      },
    },
  },
  {
    name: "DeFi Emissions Farm",
    description: "High emissions to bootstrap liquidity, high sell pressure risk",
    model: {
      version: 1,
      name: "DeFi Emissions Farm",
      archetype: "defi",
      hybridMode: false,
      tokenSymbol: "FARM",
      totalSupply: 100_000_000,
      circulatingSupply0: 10_000_000,
      initialPrice: 2,
      priceScenario: {
        type: "bull_base_bear",
        bullMultiplier: 3.0,
        baseMultiplier: 1.0,
        bearMultiplier: 0.3,
        horizonMonths: 24,
      },
      unlockSchedule: [
        { t: 3, amount: 10_000_000 },
        { t: 6, amount: 15_000_000 },
        { t: 12, amount: 20_000_000 },
      ],
      timeStep: "monthly",
      horizonSteps: 24,
      rewards: {
        inflation: {
          enabled: true,
          annualInflationRate: 0.50,
          distributionToStakersPct: 1.0,
          inflationSchedule: [
            { t: 0, annualRate: 1.0 },
            { t: 6, annualRate: 0.5 },
            { t: 12, annualRate: 0.25 },
          ],
        },
        fees: {
          enabled: true,
          feesModel: {
            type: "grow",
            params: {
              constantFees: 5000,
              growthRate: 0.10,
            },
          },
          feeShareToStakersPct: 0.3,
        },
        other: [],
      },
      staking: {
        unbondingSteps: 0,
        lockupOptions: [
          { lockSteps: 1, boost: 1.0 },
          { lockSteps: 3, boost: 1.5 },
          { lockSteps: 6, boost: 2.0 },
        ],
        rewardCompounding: "auto",
        operatorCommissionPct: 0,
        maxStakePctOfSupply: 0.6,
      },
      demand: {
        opportunityCostAnnual: 0.15,
        elasticityPreset: "high",
        baseParticipation: 0.1,
        maxParticipation: 0.6,
        adjustmentSpeed: 0.2,
        lockupPenaltyModel: {
          type: "linear",
          penaltyPerLockStep: 0.005,
        },
        riskPenaltyAnnual: 0.05,
      },
      risk: {
        slashProbAnnual: 0,
        slashSeverityPct: 0,
        smartContractRiskAnnual: 0.03,
        liquidityDiscountPct: 0.1,
        concentrationModel: {
          topNSharePct: 0.5,
          numValidators: 1,
        },
      },
      defi: {
        mode: "emissions",
      },
    },
  },
  {
    name: "App Bond Required",
    description: "Stake demand tied to TVL/volume, utility-driven participation",
    model: {
      version: 1,
      name: "App Bond Required",
      archetype: "defi",
      hybridMode: false,
      tokenSymbol: "BOND",
      totalSupply: 50_000_000,
      circulatingSupply0: 20_000_000,
      initialPrice: 20,
      priceScenario: {
        type: "flat",
        price: 20,
      },
      unlockSchedule: [
        { t: 12, amount: 10_000_000 },
        { t: 24, amount: 15_000_000 },
      ],
      timeStep: "monthly",
      horizonSteps: 36,
      rewards: {
        inflation: {
          enabled: true,
          annualInflationRate: 0.03,
          distributionToStakersPct: 0.8,
        },
        fees: {
          enabled: true,
          feesModel: {
            type: "grow",
            params: {
              constantFees: 100000,
              growthRate: 0.08,
            },
          },
          feeShareToStakersPct: 0.6,
        },
        other: [],
      },
      staking: {
        unbondingSteps: 1,
        lockupOptions: [{ lockSteps: 3, boost: 1 }],
        rewardCompounding: "none",
        operatorCommissionPct: 0,
        maxStakePctOfSupply: 0.5,
      },
      demand: {
        opportunityCostAnnual: 0.08,
        elasticityPreset: "low",
        baseParticipation: 0.3,
        maxParticipation: 0.5,
        adjustmentSpeed: 0.05,
        lockupPenaltyModel: {
          type: "linear",
          penaltyPerLockStep: 0.002,
        },
        riskPenaltyAnnual: 0.02,
      },
      risk: {
        slashProbAnnual: 0,
        slashSeverityPct: 0,
        smartContractRiskAnnual: 0.02,
        liquidityDiscountPct: 0.05,
        concentrationModel: {
          topNSharePct: 0.3,
          numValidators: 1,
        },
      },
      defi: {
        mode: "bond_required",
        bondRequiredModel: {
          type: "percent_of_tvl",
          tvlSeries: [
            { t: 0, tvl: 10_000_000 },
            { t: 12, tvl: 50_000_000 },
            { t: 24, tvl: 100_000_000 },
          ],
        },
      },
    },
  },
  {
    name: "Liquid Staking Enabled",
    description: "LST with moderate adoption, extra DeFi yield available",
    model: {
      version: 1,
      name: "Liquid Staking Enabled",
      archetype: "liquid_staking",
      hybridMode: true,
      tokenSymbol: "LSTK",
      totalSupply: 1_000_000_000,
      circulatingSupply0: 300_000_000,
      initialPrice: 8,
      priceScenario: {
        type: "flat",
        price: 8,
      },
      unlockSchedule: [
        { t: 12, amount: 100_000_000 },
        { t: 24, amount: 150_000_000 },
      ],
      timeStep: "monthly",
      horizonSteps: 36,
      rewards: {
        inflation: {
          enabled: true,
          annualInflationRate: 0.06,
          distributionToStakersPct: 0.9,
        },
        fees: {
          enabled: true,
          feesPerStep: 75000,
          feeShareToStakersPct: 0.5,
        },
        other: [],
      },
      staking: {
        unbondingSteps: 2,
        lockupOptions: [{ lockSteps: 0, boost: 1 }],
        rewardCompounding: "auto",
        operatorCommissionPct: 0.1,
        maxStakePctOfSupply: 0.7,
      },
      demand: {
        opportunityCostAnnual: 0.08,
        elasticityPreset: "medium",
        baseParticipation: 0.35,
        maxParticipation: 0.7,
        adjustmentSpeed: 0.1,
        lockupPenaltyModel: {
          type: "none",
          penaltyPerLockStep: 0,
        },
        riskPenaltyAnnual: 0.01,
      },
      risk: {
        slashProbAnnual: 0.01,
        slashSeverityPct: 0.03,
        smartContractRiskAnnual: 0.015,
        liquidityDiscountPct: 0.01,
        concentrationModel: {
          topNSharePct: 0.3,
          numValidators: 200,
        },
      },
      liquidStaking: {
        enabled: true,
        type: "reward_bearing",
        adoptionMaxPctOfStakers: 0.4,
        adoptionSpeed: 0.05,
        extraDefiYieldAnnual: 0.03,
        exitLiquidityLimitPctPerStep: 0.05,
        expectedDiscountBandPct: 0.01,
      },
    },
  },
  {
    name: "veTokenomics",
    description: "Lock durations with voting power, fee share, and bribe yield",
    model: {
      version: 1,
      name: "veTokenomics",
      archetype: "ve_governance",
      hybridMode: false,
      tokenSymbol: "VETO",
      totalSupply: 100_000_000,
      circulatingSupply0: 40_000_000,
      initialPrice: 15,
      priceScenario: {
        type: "flat",
        price: 15,
      },
      unlockSchedule: [
        { t: 12, amount: 20_000_000 },
        { t: 24, amount: 30_000_000 },
      ],
      timeStep: "monthly",
      horizonSteps: 48,
      rewards: {
        inflation: {
          enabled: true,
          annualInflationRate: 0.04,
          distributionToStakersPct: 0.7,
        },
        fees: {
          enabled: true,
          feesModel: {
            type: "grow",
            params: {
              constantFees: 200000,
              growthRate: 0.06,
            },
          },
          feeShareToStakersPct: 0.8,
        },
        other: [],
      },
      staking: {
        unbondingSteps: 0,
        lockupOptions: [
          { lockSteps: 3, boost: 1.0 },
          { lockSteps: 12, boost: 2.0 },
          { lockSteps: 48, boost: 4.0 },
        ],
        rewardCompounding: "none",
        operatorCommissionPct: 0,
        maxStakePctOfSupply: 0.6,
      },
      demand: {
        opportunityCostAnnual: 0.10,
        elasticityPreset: "medium",
        baseParticipation: 0.25,
        maxParticipation: 0.6,
        adjustmentSpeed: 0.08,
        lockupPenaltyModel: {
          type: "linear",
          penaltyPerLockStep: 0.004,
        },
        riskPenaltyAnnual: 0.02,
      },
      risk: {
        slashProbAnnual: 0,
        slashSeverityPct: 0,
        smartContractRiskAnnual: 0.02,
        liquidityDiscountPct: 0.15,
        concentrationModel: {
          topNSharePct: 0.4,
          numValidators: 1,
        },
      },
      veGovernance: {
        enabled: true,
        lockDurations: [
          { steps: 3, votingPowerMultiplier: 1 },
          { steps: 12, votingPowerMultiplier: 2 },
          { steps: 48, votingPowerMultiplier: 4 },
        ],
        feeShareToLockersPct: 0.8,
        emissionsDirectedByGaugesPct: 0.5,
        bribeYieldAnnual: 0.02,
        earlyExitPenaltyPct: 0.5,
        decayModel: "linear",
        controlValueAnnual: 0.01,
      },
    },
  },
];

