import type {
  StakingModel,
  StakingOutputs,
  StakingStep,
  CohortYield,
  StressTestResult,
  StressTestType,
} from "@/types/staking";

/**
 * Main computation engine for staking dynamics
 */
export function computeStakingSeries(model: StakingModel): StakingOutputs {
  const stepsPerYear = model.timeStep === "monthly" ? 12 : 52;
  const steps: StakingStep[] = [];
  const cohorts: CohortYield[] = [];

  // Generate price series
  const prices = generatePriceSeries(model);

  // Initialize state
  let stakingRatio = model.demand.baseParticipation;
  let lstShare = 0;
  let veParticipation = 0;

  for (let t = 0; t <= model.horizonSteps; t++) {
    const price = prices[t];

    // Calculate circulating supply
    const circulatingSupply = calculateCirculatingSupply(
      model.circulatingSupply0,
      model.unlockSchedule,
      t
    );

    // Calculate rewards to stakers
    const rewardsToStakers = calculateRewardsToStakers(
      model,
      t,
      price,
      stakingRatio,
      circulatingSupply,
      stepsPerYear
    );

    // Calculate stake tokens
    const stakeTokens = stakingRatio * circulatingSupply;

    // Calculate gross APR
    const grossAPR =
      stakeTokens > 0
        ? (rewardsToStakers / stakeTokens) * stepsPerYear
        : 0;

    // Calculate net APR
    const netAPR = calculateNetAPR(
      grossAPR,
      model,
      stepsPerYear
    );

    // Calculate target staking ratio
    const targetStakingRatio = calculateTargetStakingRatio(
      netAPR,
      model.demand
    );

    // Update staking ratio (smooth adjustment)
    stakingRatio = updateStakingRatio(
      stakingRatio,
      targetStakingRatio,
      model.demand.adjustmentSpeed,
      model.demand.maxParticipation,
      model.staking.maxStakePctOfSupply
    );

    // Calculate locked tokens (for ve or other locking mechanisms)
    const lockedTokens = calculateLockedTokens(
      model,
      circulatingSupply,
      veParticipation
    );

    // Calculate fee coverage
    const feeCoveragePct = calculateFeeCoverage(
      model,
      t,
      price,
      rewardsToStakers,
      stepsPerYear
    );

    // Calculate stake value in USD
    const stakeValueUSD = stakeTokens * price;

    steps.push({
      t,
      price,
      circulatingSupply,
      stakeTokens,
      stakingRatio,
      targetStakingRatio,
      lockedTokens,
      rewardsToStakers,
      grossAPR,
      netAPR,
      feeCoveragePct,
      stakeValueUSD,
    });

    // Update LST adoption if enabled
    if (model.liquidStaking?.enabled) {
      lstShare = Math.min(
        model.liquidStaking.adoptionMaxPctOfStakers,
        lstShare +
          model.liquidStaking.adoptionSpeed *
            (model.liquidStaking.adoptionMaxPctOfStakers - lstShare)
      );
    }
  }

  // Calculate cohort yields
  if (model.liquidStaking?.enabled) {
    const lstAPR = calculateLSTAPR(model, steps);
    cohorts.push({
      cohort: "LST Holders",
      netAPR: lstAPR,
      participationPct: lstShare,
    });
  }

  if (model.restaking?.enabled) {
    const restakeAPR = calculateRestakingAPR(model, steps);
    cohorts.push({
      cohort: "Restakers",
      netAPR: restakeAPR,
      participationPct: model.restaking.maxRestakePctOfStake,
    });
  }

  if (model.veGovernance?.enabled) {
    const veAPR = calculateVEAPR(model, steps);
    cohorts.push({
      cohort: "ve Lockers",
      netAPR: veAPR,
      participationPct: veParticipation,
    });
  }

  // Calculate metadata
  const metadata = calculateMetadata(steps, model);

  return {
    steps,
    cohorts,
    metadata,
  };
}

/**
 * Generate price series based on scenario
 */
function generatePriceSeries(model: StakingModel): number[] {
  const prices: number[] = [];
  const scenario = model.priceScenario;

  if (scenario.type === "flat") {
    for (let t = 0; t <= model.horizonSteps; t++) {
      prices.push(scenario.price);
    }
  } else if (scenario.type === "bull_base_bear") {
    // Split horizon into thirds
    const thirdSteps = Math.floor(model.horizonSteps / 3);
    for (let t = 0; t <= model.horizonSteps; t++) {
      let multiplier: number;
      if (t < thirdSteps) {
        multiplier = scenario.bullMultiplier;
      } else if (t < thirdSteps * 2) {
        multiplier = scenario.baseMultiplier;
      } else {
        multiplier = scenario.bearMultiplier;
      }
      prices.push(model.initialPrice * multiplier);
    }
  } else if (scenario.type === "custom_series") {
    // Interpolate custom series
    for (let t = 0; t <= model.horizonSteps; t++) {
      prices.push(interpolatePrice(scenario.series, t));
    }
  }

  return prices;
}

function interpolatePrice(
  series: Array<{ t: number; price: number }>,
  t: number
): number {
  if (series.length === 0) return 1;

  // Find surrounding points
  let before = series[0];
  let after = series[series.length - 1];

  for (let i = 0; i < series.length; i++) {
    if (series[i].t <= t) before = series[i];
    if (series[i].t >= t && !after) after = series[i];
  }

  if (before.t === after.t) return before.price;

  // Linear interpolation
  const ratio = (t - before.t) / (after.t - before.t);
  return before.price + ratio * (after.price - before.price);
}

/**
 * Calculate circulating supply at time t
 */
function calculateCirculatingSupply(
  initial: number,
  unlockSchedule: Array<{ t: number; amount: number }>,
  t: number
): number {
  let supply = initial;
  for (const unlock of unlockSchedule) {
    if (unlock.t <= t) {
      supply += unlock.amount;
    }
  }
  return supply;
}

/**
 * Calculate rewards to stakers at time t
 */
function calculateRewardsToStakers(
  model: StakingModel,
  t: number,
  price: number,
  stakingRatio: number,
  circulatingSupply: number,
  stepsPerYear: number
): number {
  let totalRewards = 0;

  // Inflation rewards
  if (model.rewards.inflation.enabled) {
    const annualRate = getInflationRate(model.rewards.inflation, t);
    const inflationTokens =
      (circulatingSupply * annualRate) / stepsPerYear;
    totalRewards +=
      inflationTokens * model.rewards.inflation.distributionToStakersPct;
  }

  // Fee rewards
  if (model.rewards.fees.enabled) {
    const feesUSD = getFeesPerStep(model.rewards.fees, t);
    const feesTokens = price > 0 ? feesUSD / price : 0;
    totalRewards += feesTokens * model.rewards.fees.feeShareToStakersPct;
  }

  // Other rewards
  for (const other of model.rewards.other) {
    let rewardTokens = other.perStepAmount;
    if (other.denom === "usd") {
      rewardTokens = price > 0 ? rewardTokens / price : 0;
    }
    totalRewards += rewardTokens * other.toStakersPct;
  }

  return totalRewards;
}

function getInflationRate(
  inflation: any,
  t: number
): number {
  if (inflation.inflationSchedule && inflation.inflationSchedule.length > 0) {
    // Find applicable rate
    let rate = inflation.annualInflationRate;
    for (const entry of inflation.inflationSchedule) {
      if (entry.t <= t) rate = entry.annualRate;
    }
    return rate;
  }
  return inflation.annualInflationRate;
}

function getFeesPerStep(fees: any, t: number): number {
  if (fees.feesPerStep !== undefined) return fees.feesPerStep;

  if (fees.feesModel) {
    const model = fees.feesModel;
    if (model.type === "constant") {
      return model.params.constantFees || 0;
    } else if (model.type === "grow") {
      const base = model.params.constantFees || 0;
      const growth = model.params.growthRate || 0;
      return base * Math.pow(1 + growth, t);
    } else if (model.type === "custom_series") {
      // Interpolate
      const series = model.params.series || [];
      if (series.length === 0) return 0;
      return interpolatePrice(
        series.map((s: any) => ({ t: s.t, price: s.fees })),
        t
      );
    }
  }

  return 0;
}

/**
 * Calculate net APR (after commission, risk, lockup penalties)
 */
function calculateNetAPR(
  grossAPR: number,
  model: StakingModel,
  stepsPerYear: number
): number {
  // Subtract operator commission
  let netAPR = grossAPR * (1 - model.staking.operatorCommissionPct);

  // Subtract risk penalty
  const riskPenalty =
    model.risk.slashProbAnnual * model.risk.slashSeverityPct +
    model.risk.smartContractRiskAnnual +
    model.demand.riskPenaltyAnnual;

  netAPR -= riskPenalty;

  // Subtract lockup penalty
  if (model.demand.lockupPenaltyModel.type === "linear") {
    const avgLockSteps = calculateAvgLockSteps(model.staking.lockupOptions);
    const lockPenalty =
      avgLockSteps *
      model.demand.lockupPenaltyModel.penaltyPerLockStep *
      stepsPerYear;
    netAPR -= lockPenalty;
  }

  return Math.max(0, netAPR);
}

function calculateAvgLockSteps(lockupOptions: any[]): number {
  if (lockupOptions.length === 0) return 0;
  const totalLock = lockupOptions.reduce((sum, opt) => sum + opt.lockSteps, 0);
  return totalLock / lockupOptions.length;
}

/**
 * Calculate target staking ratio using demand model
 */
function calculateTargetStakingRatio(
  netAPR: number,
  demand: any
): number {
  const spread = netAPR - demand.opportunityCostAnnual;

  // Get elasticity K
  let K: number;
  switch (demand.elasticityPreset) {
    case "low":
      K = 3;
      break;
    case "medium":
      K = 6;
      break;
    case "high":
      K = 10;
      break;
    case "custom":
      K = demand.elasticityK || 6;
      break;
    default:
      K = 6;
  }

  // Sigmoid function
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

  const target =
    demand.baseParticipation +
    (demand.maxParticipation - demand.baseParticipation) * sigmoid(K * spread);

  return Math.max(0, Math.min(1, target));
}

/**
 * Update staking ratio with smooth adjustment
 */
function updateStakingRatio(
  current: number,
  target: number,
  adjustmentSpeed: number,
  maxParticipation: number,
  maxStakePctOfSupply?: number
): number {
  const adjusted = current + adjustmentSpeed * (target - current);
  let clamped = Math.max(0, Math.min(maxParticipation, adjusted));

  if (maxStakePctOfSupply !== undefined) {
    clamped = Math.min(clamped, maxStakePctOfSupply);
  }

  return clamped;
}

/**
 * Calculate locked tokens (for ve or other mechanisms)
 */
function calculateLockedTokens(
  model: StakingModel,
  circulatingSupply: number,
  veParticipation: number
): number {
  if (model.veGovernance?.enabled) {
    return veParticipation * circulatingSupply;
  }
  return 0;
}

/**
 * Calculate fee coverage percentage
 */
function calculateFeeCoverage(
  model: StakingModel,
  t: number,
  price: number,
  totalRewards: number,
  stepsPerYear: number
): number {
  if (!model.rewards.fees.enabled || totalRewards === 0) return 0;

  const feesUSD = getFeesPerStep(model.rewards.fees, t);
  const feesTokens = price > 0 ? feesUSD / price : 0;
  const feeRewards = feesTokens * model.rewards.fees.feeShareToStakersPct;

  return (feeRewards / totalRewards) * 100;
}

/**
 * Calculate LST cohort APR
 */
function calculateLSTAPR(model: StakingModel, steps: StakingStep[]): number {
  if (!model.liquidStaking?.enabled) return 0;

  const avgNetAPR =
    steps.reduce((sum, step) => sum + step.netAPR, 0) / steps.length;
  const lstAPR =
    avgNetAPR +
    model.liquidStaking.extraDefiYieldAnnual -
    model.risk.liquidityDiscountPct;

  return lstAPR;
}

/**
 * Calculate restaking cohort APR
 */
function calculateRestakingAPR(model: StakingModel, steps: StakingStep[]): number {
  if (!model.restaking?.enabled) return 0;

  const avgNetAPR =
    steps.reduce((sum, step) => sum + step.netAPR, 0) / steps.length;
  const restakeAPR =
    avgNetAPR +
    model.restaking.incrementalYieldAnnual -
    model.restaking.correlatedSlashProbAnnual *
      model.restaking.correlatedSlashSeverityPct;

  return restakeAPR;
}

/**
 * Calculate ve governance cohort APR
 */
function calculateVEAPR(model: StakingModel, steps: StakingStep[]): number {
  if (!model.veGovernance?.enabled) return 0;

  const avgNetAPR =
    steps.reduce((sum, step) => sum + step.netAPR, 0) / steps.length;
  const veAPR =
    avgNetAPR +
    (model.veGovernance.bribeYieldAnnual || 0) +
    (model.veGovernance.controlValueAnnual || 0);

  return veAPR;
}

/**
 * Calculate output metadata
 */
function calculateMetadata(steps: StakingStep[], model: StakingModel): any {
  const finalStep = steps[steps.length - 1];
  const avgGrossAPR =
    steps.reduce((sum, step) => sum + step.grossAPR, 0) / steps.length;
  const avgNetAPR =
    steps.reduce((sum, step) => sum + step.netAPR, 0) / steps.length;
  const avgFeeCoverage =
    steps.reduce((sum, step) => sum + step.feeCoveragePct, 0) / steps.length;

  // Calculate reward runway (simplified: months until emissions drop below threshold)
  let rewardRunwayMonths = model.horizonSteps;
  const threshold = 0.5; // 50% of initial rewards
  const initialRewards = steps[0]?.rewardsToStakers || 0;

  for (let i = 1; i < steps.length; i++) {
    if (steps[i].rewardsToStakers < initialRewards * threshold) {
      rewardRunwayMonths = i;
      break;
    }
  }

  const floatLockedPct =
    finalStep.circulatingSupply > 0
      ? (finalStep.stakeTokens + finalStep.lockedTokens) /
        finalStep.circulatingSupply
      : 0;

  return {
    finalStakingRatio: finalStep.stakingRatio,
    avgGrossAPR,
    avgNetAPR,
    avgFeeCoverage,
    totalStakeValueUSD: finalStep.stakeValueUSD,
    rewardRunwayMonths,
    floatLockedPct,
  };
}

/**
 * Run stress test scenario
 */
export function runStressTest(
  model: StakingModel,
  testType: StressTestType
): StressTestResult {
  // Clone model and apply shock
  const stressedModel = JSON.parse(JSON.stringify(model)) as StakingModel;

  switch (testType) {
    case "rate_hike":
      stressedModel.demand.opportunityCostAnnual += 0.03; // +300 bps
      break;
    case "fee_drawdown":
      if (stressedModel.rewards.fees.feesPerStep) {
        stressedModel.rewards.fees.feesPerStep *= 0.5; // -50%
      }
      if (stressedModel.rewards.fees.feesModel?.params.constantFees) {
        stressedModel.rewards.fees.feesModel.params.constantFees *= 0.5;
      }
      break;
    case "price_crash":
      if (stressedModel.priceScenario.type === "flat") {
        stressedModel.priceScenario.price *= 0.4; // -60%
      }
      break;
    case "slash_event":
      stressedModel.risk.slashProbAnnual = 1.0; // one-time event
      stressedModel.risk.slashSeverityPct = 0.1; // 10% loss
      break;
  }

  // Compute baseline and stressed outputs
  const baseline = computeStakingSeries(model);
  const stressed = computeStakingSeries(stressedModel);

  // Calculate deltas
  const deltaStakingRatio =
    stressed.metadata.finalStakingRatio - baseline.metadata.finalStakingRatio;

  const minStakingRatio = Math.min(
    ...stressed.steps.map((s) => s.stakingRatio)
  );

  // Calculate time to recover (steps where staking ratio returns to baseline)
  let timeToRecoverSteps = stressed.steps.length;
  for (let i = 0; i < stressed.steps.length; i++) {
    if (
      Math.abs(stressed.steps[i].stakingRatio - baseline.steps[i].stakingRatio) <
      0.01
    ) {
      timeToRecoverSteps = i;
      break;
    }
  }

  const securityBudgetReduction =
    1 -
    stressed.metadata.totalStakeValueUSD / baseline.metadata.totalStakeValueUSD;

  return {
    type: testType,
    deltaStakingRatio,
    minStakingRatio,
    timeToRecoverSteps,
    securityBudgetReduction,
  };
}

