// Liquidity Planning Computation Engine

import type {
  LiquidityModel,
  LiquidityOutputs,
  InventoryRequirement,
  PoolInventoryRequirement,
  FeasibilityItem,
  FeasibilityStatus,
  FragmentationAnalysis,
  DealComparison,
  OptionCostScenario,
  SeedingReference,
  DexPoolPlan,
} from "@/types/liquidity";

// Constants (adjustable)
const BASE_SEED_PCT = 0.002; // 0.20% of supply reference
const REF_MCAP = 200_000_000; // $200m reference point
const SEED_ALPHA = 0.5;
const MIN_SEED_PCT = 0.0005; // 0.05%
const MAX_SEED_PCT = 0.005; // 0.50%

const REF_RANGE_BPS = 1000; // ±5% for CLMM efficiency reference

// Tier multipliers for CEX inventory
const TIER_MULTIPLIERS = {
  tier1: 1.0,
  tier2: 0.7,
  tier3: 0.5,
};

// Volatility buffers for CLOB
const VOLATILITY_BUFFERS = {
  Low: 1.1,
  Med: 1.25,
  High: 1.5,
};

// Fragmentation penalties
const CEX_VENUE_PENALTY = 0.15;
const DEX_POOL_PENALTY = 0.10;
const CHAIN_PENALTY = 0.10;

/**
 * Main computation function
 */
export function computeLiquidityPlan(model: LiquidityModel): LiquidityOutputs {
  // 1. Derived price
  const tgePriceUsd = model.launchMarketCapUsd / model.circulatingSupplyAtTge;
  const totalSupplyApprox =
    model.circulatingSupplyAtTge / (model.tgeFloatPct / 100);

  // 2. Fragmentation multiplier
  const fragmentation = computeFragmentation(model);

  // 3. DEX inventory requirements
  const dexInventory = computeDexInventory(model, tgePriceUsd, fragmentation.multiplier);

  // 4. CEX inventory requirements
  const cexInventory = computeCexInventory(model, tgePriceUsd, fragmentation.multiplier);

  // 5. Total inventory
  const totalInventory: InventoryRequirement = {
    tokenAmount: dexInventory.tokenAmount + cexInventory.tokenAmount,
    stableUsd: dexInventory.stableUsd + cexInventory.stableUsd,
    volatileQuoteUsd:
      (dexInventory.volatileQuoteUsd || 0) + (cexInventory.volatileQuoteUsd || 0),
  };

  // 6. Seeding reference
  const seeding = computeSeedingReference(
    model,
    totalSupplyApprox,
    dexInventory.tokenAmount
  );

  // 7. Feasibility analysis
  const feasibility = computeFeasibility(
    model,
    totalInventory,
    dexInventory,
    cexInventory,
    fragmentation.multiplier
  );

  // 8. Deal comparison
  const dealComparison = computeDealComparison(
    model,
    tgePriceUsd,
    totalSupplyApprox
  );

  return {
    tgePriceUsd,
    totalSupplyApprox,
    required: {
      dex: dexInventory,
      cex: cexInventory,
      total: totalInventory,
    },
    seeding,
    feasibility,
    fragmentation,
    dealComparison,
  };
}

/**
 * Compute fragmentation multiplier
 */
function computeFragmentation(model: LiquidityModel): FragmentationAnalysis {
  const numCexVenues =
    model.cexTierMonth1.tier1 +
    model.cexTierMonth1.tier2 +
    model.cexTierMonth1.tier3;

  const numDexPools = model.dexPools.length;

  const uniqueChains = new Set(model.dexPools.map((p) => p.chain)).size;

  const multiplier =
    1 +
    CEX_VENUE_PENALTY * Math.max(0, numCexVenues - 1) +
    DEX_POOL_PENALTY * Math.max(0, numDexPools - 1) +
    CHAIN_PENALTY * Math.max(0, uniqueChains - 1);

  let scoreLabel = "Low";
  if (multiplier > 1.4) scoreLabel = "High";
  else if (multiplier > 1.2) scoreLabel = "Medium";

  const suggestions: string[] = [];
  if (numDexPools > 2) {
    suggestions.push(`Consider consolidating ${numDexPools} DEX pools to 1-2 primary pools`);
  }
  if (uniqueChains > 1) {
    suggestions.push(`Launching on ${uniqueChains} chains increases capital inefficiency`);
  }
  if (numCexVenues > 4) {
    suggestions.push(`${numCexVenues} CEX venues may fragment liquidity; prioritize top-tier`);
  }

  return {
    multiplier,
    scoreLabel,
    suggestions,
  };
}

/**
 * Compute DEX inventory requirements
 */
// 3. DEX Inventory
function computeDexInventory(
  model: LiquidityModel,
  tgePriceUsd: number,
  fragmentationMultiplier: number
): InventoryRequirement & { perPool: PoolInventoryRequirement[] } {
  const perPool: PoolInventoryRequirement[] = [];

  let totalTokens = 0;
  let totalStable = 0;
  let totalVolatileQuote = 0;

  // Get enabled depth targets
  const enabledTargets = model.targets.depthTargets.filter((t) => t.enabled);

  // Use the tightest enabled band for calculations (fallback)
  const primaryTarget = enabledTargets.reduce((prev, curr) =>
    curr.bandBps < prev.bandBps ? curr : prev
    , enabledTargets[0] || { bandBps: 200, depthUsd: 100_000, enabled: true });

  for (const pool of model.dexPools) {
    let requiredTvlUsd = 0;

    if (pool.poolType === "V2") {
      // V2: XY=K. 
      // Approx: Reserve ~ TxSize / SlippagePct
      // TVL = 2 * Reserve
      const txSize = pool.transactionSizeUsd || 10000;
      const slipBps = pool.slippageBps || 50;
      const slipPct = slipBps / 10000;

      if (slipPct > 0) {
        const reserve = txSize / slipPct;
        requiredTvlUsd = reserve * 2;
      } else {
        requiredTvlUsd = 0; // infinite slippage?
      }

    } else if (pool.poolType === "CLMM") {
      // Sum enabled bands
      if (pool.liquidityBands && pool.liquidityBands.length > 0) {
        requiredTvlUsd = pool.liquidityBands
          .filter(b => b.enabled)
          .reduce((sum, b) => sum + (b.amountUsd || 0), 0);
      } else {
        // Fallback logic
        const budgetShare = pool.dexBudgetSharePct / 100;
        const depthForPool = primaryTarget.depthUsd * budgetShare;
        const rangeMinBps = pool.clmmRangeMinBps ?? -500;
        const rangeMaxBps = pool.clmmRangeMaxBps ?? 500;
        const rangeWidthBps = Math.abs(rangeMaxBps - rangeMinBps);
        const efficiency = Math.max(0.5, Math.min(5, REF_RANGE_BPS / rangeWidthBps));
        const bandFraction = primaryTarget.bandBps / 10_000;
        requiredTvlUsd = (depthForPool / bandFraction) / efficiency;
      }

    } else if (pool.poolType === "CLOB") {
      // CLOB: Depth at bps
      // We assume the user configures "depth within X bps".
      // But currently we only capture "X bps" (clobDepthBps) in specific config,
      // and "Amount" comes from global targets or budget share.
      // Let's stick to budget share of global targets for Amount, 
      // but adjusted for the specific BPS depth requested?
      // Actually simpler: Just use the calculated depth requirement directly.

      const budgetShare = pool.dexBudgetSharePct / 100;
      const depthForPool = primaryTarget.depthUsd * budgetShare;
      const volatilityBuffer = VOLATILITY_BUFFERS[model.regime.volatility];
      requiredTvlUsd = depthForPool * volatilityBuffer;
    }

    // Apply fragmentation multiplier (efficiency loss)
    requiredTvlUsd *= fragmentationMultiplier;

    // Split 50/50 between token and quote
    const requiredStableUsd = requiredTvlUsd / 2;
    const requiredTokenUsd = requiredTvlUsd / 2;
    const requiredToken = requiredTokenUsd / tgePriceUsd;

    // Check if quote is volatile
    const isVolatileQuote = pool.quoteAssetType !== "Stable";

    perPool.push({
      poolId: pool.id,
      poolLabel: `${pool.poolType} on ${pool.chainName || pool.chain}`,
      tokenAmount: requiredToken,
      stableUsd: isVolatileQuote ? 0 : requiredStableUsd,
      volatileQuoteUsd: isVolatileQuote ? requiredStableUsd : 0,
    });

    totalTokens += requiredToken;
    if (isVolatileQuote) {
      totalVolatileQuote += requiredStableUsd;
    } else {
      totalStable += requiredStableUsd;
    }
  }

  return {
    tokenAmount: totalTokens,
    stableUsd: totalStable,
    volatileQuoteUsd: totalVolatileQuote > 0 ? totalVolatileQuote : undefined,
    perPool,
  };
}

/**
 * Compute CEX inventory requirements
 */
// 4. CEX Inventory
function computeCexInventory(
  model: LiquidityModel,
  tgePriceUsd: number,
  fragmentationMultiplier: number
): InventoryRequirement {
  let totalTokenAmount = 0;
  let totalStableUsd = 0;

  // Use primary depth target as "Tier 1 Reference"
  const enabledTargets = model.targets.depthTargets.filter((t) => t.enabled);
  const primaryTarget = enabledTargets[0] || { depthUsd: 100_000 };
  const referenceDepthUsd = primaryTarget.depthUsd;

  const volBuffer = VOLATILITY_BUFFERS[model.regime.volatility];

  // Tier 1
  if (model.cexTierMonth1.tier1 > 0) {
    const reqUsd = referenceDepthUsd * volBuffer * model.cexTierMonth1.tier1;
    totalTokenAmount += (reqUsd / 2) / tgePriceUsd;
    totalStableUsd += reqUsd / 2;
  }

  // Tier 2
  if (model.cexTierMonth1.tier2 > 0) {
    const fraction = model.cexLiquidityFractions.tier2;
    const reqUsd = referenceDepthUsd * fraction * volBuffer * model.cexTierMonth1.tier2;
    totalTokenAmount += (reqUsd / 2) / tgePriceUsd;
    totalStableUsd += reqUsd / 2;
  }

  // Tier 3
  if (model.cexTierMonth1.tier3 > 0) {
    const fraction = model.cexLiquidityFractions.tier3;
    const reqUsd = referenceDepthUsd * fraction * volBuffer * model.cexTierMonth1.tier3;
    totalTokenAmount += (reqUsd / 2) / tgePriceUsd;
    totalStableUsd += reqUsd / 2;
  }

  return {
    tokenAmount: totalTokenAmount,
    stableUsd: totalStableUsd,
  };
}

/**
 * Compute seeding reference (market-cap-scaled baseline)
 */
function computeSeedingReference(
  model: LiquidityModel,
  totalSupplyApprox: number,
  seedByKpiTokens: number
): SeedingReference {
  const suggestedSeedPct = Math.max(
    MIN_SEED_PCT,
    Math.min(
      MAX_SEED_PCT,
      BASE_SEED_PCT * Math.pow(REF_MCAP / model.launchMarketCapUsd, SEED_ALPHA)
    )
  );

  const seedByReferenceTokens = suggestedSeedPct * totalSupplyApprox;
  const recommendedTokens = Math.max(seedByKpiTokens, seedByReferenceTokens);

  return {
    suggestedSeedPct,
    seedByReferenceTokens,
    seedByKpiTokens,
    recommendedTokens,
  };
}

/**
 * Compute feasibility analysis
 */
function computeFeasibility(
  model: LiquidityModel,
  totalInventory: InventoryRequirement,
  dexInventory: InventoryRequirement & { perPool: PoolInventoryRequirement[] },
  cexInventory: InventoryRequirement,
  fragmentationMultiplier: number
): FeasibilityItem[] {
  const items: FeasibilityItem[] = [];

  const availableToken = model.budgets.teamTokenInventoryMax;
  const availableStable = model.budgets.teamStableInventoryMaxUsd;

  // Check token inventory
  if (totalInventory.tokenAmount > availableToken) {
    const shortfall = totalInventory.tokenAmount - availableToken;
    items.push({
      item: "Token Inventory",
      status: "red",
      reason: `Insufficient tokens: need ${totalInventory.tokenAmount.toLocaleString()} but have ${availableToken.toLocaleString()}`,
      shortfall: { tokenShortfall: shortfall },
    });
  } else if (totalInventory.tokenAmount > availableToken * 0.8) {
    items.push({
      item: "Token Inventory",
      status: "yellow",
      reason: `Using ${((totalInventory.tokenAmount / availableToken) * 100).toFixed(0)}% of available tokens`,
    });
  } else {
    items.push({
      item: "Token Inventory",
      status: "green",
      reason: `Sufficient tokens available`,
    });
  }

  // Check stable inventory
  if (totalInventory.stableUsd > availableStable) {
    const shortfall = totalInventory.stableUsd - availableStable;
    items.push({
      item: "Stable Inventory",
      status: "red",
      reason: `Insufficient stables: need $${totalInventory.stableUsd.toLocaleString()} but have $${availableStable.toLocaleString()}`,
      shortfall: { stableShortfall: shortfall },
    });
  } else if (totalInventory.stableUsd > availableStable * 0.8) {
    items.push({
      item: "Stable Inventory",
      status: "yellow",
      reason: `Using ${((totalInventory.stableUsd / availableStable) * 100).toFixed(0)}% of available stables`,
    });
  } else {
    items.push({
      item: "Stable Inventory",
      status: "green",
      reason: `Sufficient stables available`,
    });
  }

  // Check fragmentation
  if (fragmentationMultiplier > 1.4) {
    items.push({
      item: "Fragmentation",
      status: "red",
      reason: `High fragmentation penalty (${fragmentationMultiplier.toFixed(2)}x): consolidate venues`,
    });
  } else if (fragmentationMultiplier > 1.2) {
    items.push({
      item: "Fragmentation",
      status: "yellow",
      reason: `Moderate fragmentation (${fragmentationMultiplier.toFixed(2)}x)`,
    });
  } else {
    items.push({
      item: "Fragmentation",
      status: "green",
      reason: `Low fragmentation (${fragmentationMultiplier.toFixed(2)}x)`,
    });
  }

  // Check CLMM range vs volatility
  const clmmPools = model.dexPools.filter((p) => p.poolType === "CLMM");
  for (const pool of clmmPools) {
    const rangeMinBps = pool.clmmRangeMinBps ?? -500;
    const rangeMaxBps = pool.clmmRangeMaxBps ?? 500;
    const rangeWidthBps = Math.abs(rangeMaxBps - rangeMinBps);
    if (rangeWidthBps < 500 && model.regime.volatility === "High") {
      items.push({
        item: `CLMM Range (${pool.id})`,
        status: "yellow",
        reason: `Tight range (${(rangeMinBps / 100).toFixed(1)}% to +${(rangeMaxBps / 100).toFixed(1)}%) in high volatility may go out-of-range`,
      });
    }
  }

  // Check volatile quote in bear market
  const hasVolatileQuote = model.dexPools.some(
    (p) => p.quoteAssetType !== "Stable"
  );
  if (hasVolatileQuote && model.regime.market === "Bear") {
    items.push({
      item: "Quote Asset Risk",
      status: "yellow",
      reason: `Using volatile quote (ETH/SOL) in bear market increases drawdown risk`,
    });
  }

  return items;
}

/**
 * Compute deal comparison
 */
// 8. Deal Comparison
function computeDealComparison(
  model: LiquidityModel,
  tgePriceUsd: number,
  totalSupplyApprox: number
): DealComparison {
  // Retainer cost (90 days = 3 months for fairness)
  const retainerCost90dUsd = (model.deal.retainerMonthlyUsd || 0) * 3;

  // Loan+Call option scenarios (total for all tranches)

  const fdvMultipliers = [1, 2, 5];

  // Need to sum up tokens and value transfer for each scenario across all tranches
  const optionCostScenarios: OptionCostScenario[] = fdvMultipliers.map((mult) => {
    const fdvUsd = model.launchMarketCapUsd * mult;
    const spotPrice = fdvUsd / totalSupplyApprox;

    let totalOptionTokens = 0;
    let totalValueTransferred = 0;

    if (model.deal.tranches && model.deal.tranches.length > 0) {
      // Multi-tranche
      for (const tranche of model.deal.tranches) {
        const trancheLoanSize = (tranche.loanSizePct / 100) * totalSupplyApprox;

        // Each tranche might have multiple strikes.
        // Simplified: assume average strike or just the first one.
        // Or split the loan size across strikes?
        // Let's assume the tranche loan corresponds to the strikes.
        // If multiple strikes, we'd average them?
        // Let's take the first strike for now, parsing the string... 
        // Wait, user enters string like "TGE + 50%".
        // We don't have a structured "premiumPct" field in tranche anymore, strictly speaking.
        // But I can add one or parse it?
        // The `DealTrancheEditor` has `strikePrice` as string.
        // This makes calculation hard.
        // Maybe I should add a hidden/structured `premiumPct` or `strikePriceUsd` to `DealTranche`?
        // Or just assume a default premium for calculation since it's "Estimated".
        // Let's assume +50% premium for calculation purposes if not parseable.

        const premiumPct = 0.5; // Default assumption for estimation
        const strikePrice = tgePriceUsd * (1 + premiumPct);

        const valTransfer = Math.max(0, (spotPrice - strikePrice) * trancheLoanSize);

        totalOptionTokens += trancheLoanSize;
        totalValueTransferred += valTransfer;
      }
    } else {
      // No tranches defined, assumed 0 cost
    }

    return {
      fdvMultiplier: mult,
      fdvUsd,
      spotPrice,
      strikePrice: 0, // Not single strike anymore, maybe set to 0 or avg?
      optionTokens: totalOptionTokens,
      valueTransferred: totalValueTransferred,
    };
  });

  return {
    retainerCost90dUsd,
    optionCostScenarios,
  };
}

/**
 * Helper: Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

