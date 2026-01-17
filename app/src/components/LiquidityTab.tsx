"use client";

import DealTrancheEditor from "./liquidity/DealTrancheEditor";
import VolumeDecayChart from "./liquidity/VolumeDecayChart";


import { useState, useMemo } from "react";
import type {
  LiquidityModel,
  LiquidityOutputs,
  MarketRegime,
  Volatility,
  DealModel,
} from "@/types/liquidity";
import { DEFAULT_LIQUIDITY_MODEL } from "@/types/liquidity";
import { computeLiquidityPlan } from "@/lib/liquidityEngine";
import WizardNav from "./liquidity/WizardNav";
import DepthTargetsEditor from "./liquidity/DepthTargetsEditor";
import DexPoolTable from "./liquidity/DexPoolTable";

import NumberInput from "./liquidity/NumberInput";

const WIZARD_STEPS = [
  { id: "mode", label: "Mode Selection", shortLabel: "Mode" },
  { id: "launch", label: "Launch Context", shortLabel: "Launch" },
  { id: "budgets", label: "Budgets & Market", shortLabel: "Budgets" },
  { id: "venues", label: "Venue Map", shortLabel: "Venues" },
  { id: "kpis", label: "CEX KPI Targets", shortLabel: "CEX KPIs" },
  { id: "deal", label: "Deal Inputs", shortLabel: "Deal" },
  { id: "results", label: "Results", shortLabel: "Results" },
];

export default function LiquidityTab({
  initialLaunchMarketCap,
  initialCirculatingSupply,
  initialFloatPct,
}: {
  initialLaunchMarketCap?: number;
  initialCirculatingSupply?: number;
  initialFloatPct?: number;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [model, setModel] = useState<LiquidityModel>(() => ({
    ...DEFAULT_LIQUIDITY_MODEL,
    launchMarketCapUsd: initialLaunchMarketCap ?? DEFAULT_LIQUIDITY_MODEL.launchMarketCapUsd,
    circulatingSupplyAtTge: initialCirculatingSupply ?? DEFAULT_LIQUIDITY_MODEL.circulatingSupplyAtTge,
    tgeFloatPct: initialFloatPct ?? DEFAULT_LIQUIDITY_MODEL.tgeFloatPct,
  }));
  const [showResults, setShowResults] = useState(false);

  // Compute outputs
  const outputs: LiquidityOutputs | null = useMemo(() => {
    if (!showResults) return null;
    try {
      return computeLiquidityPlan(model);
    } catch (err) {
      console.error("Computation error:", err);
      return null;
    }
  }, [model, showResults]);

  const updateModel = (updates: Partial<LiquidityModel>) => {
    setModel((prev) => ({ ...prev, ...updates }));
  };

  const handleStepChange = (stepIndex: number) => {
    if (stepIndex === WIZARD_STEPS.length - 1) {
      setShowResults(true);
    }
    setCurrentStep(stepIndex);
  };

  // Validation for "Next" button
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0:
        return true; // Mode selection always valid
      case 1:
        return (
          model.launchMarketCapUsd > 0 &&
          model.circulatingSupplyAtTge > 0 &&
          model.tgeFloatPct > 0
        );
      case 2:
        return (
          model.budgets.teamTokenInventoryMax > 0 &&
          model.budgets.teamStableInventoryMaxUsd > 0
        );
      case 3:
        const totalShare = model.dexPools.reduce(
          (sum, p) => sum + p.dexBudgetSharePct,
          0
        );
        return Math.abs(totalShare - 100) < 0.01 && model.dexPools.length > 0;
      case 4:
        return model.targets.depthTargets.some((t) => t.enabled);
      case 5:
        return true; // Deal inputs always valid (have defaults)
      default:
        return true;
    }
  }, [currentStep, model]);

  return (
    <div className="space-y-6">
      {/* Wizard navigation */}
      <WizardNav
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        canProceed={canProceed}
      />

      {/* Step content */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        {currentStep === 0 && <StepMode model={model} updateModel={updateModel} />}
        {currentStep === 1 && <StepLaunch model={model} updateModel={updateModel} />}
        {currentStep === 2 && <StepBudgets model={model} updateModel={updateModel} />}
        {currentStep === 3 && <StepVenues model={model} updateModel={updateModel} />}
        {currentStep === 4 && <StepKPIs model={model} updateModel={updateModel} />}
        {currentStep === 5 && <StepDeal model={model} updateModel={updateModel} />}
        {currentStep === 6 && outputs && (
          <StepResults model={model} outputs={outputs} />
        )}
      </div>
    </div>
  );
}

// Screen A: Mode picker
function StepMode({
  model,
  updateModel,
}: {
  model: LiquidityModel;
  updateModel: (updates: Partial<LiquidityModel>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Select Mode</h2>
      <p className="text-sm text-neutral-400">
        Are you planning a new token launch or improving existing liquidity?
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => updateModel({ mode: "Launch" })}
          className={`rounded-lg border-2 p-6 text-left transition-all ${model.mode === "Launch"
            ? "border-blue-500 bg-blue-500/10"
            : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
            }`}
        >
          <div className="text-lg font-semibold text-white">Plan Launch Liquidity</div>
          <div className="mt-2 text-sm text-neutral-400">
            Design liquidity for a new token TGE
          </div>
        </button>
        <button
          onClick={() => updateModel({ mode: "Improve" })}
          className={`rounded-lg border-2 p-6 text-left transition-all ${model.mode === "Improve"
            ? "border-blue-500 bg-blue-500/10"
            : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
            }`}
        >
          <div className="text-lg font-semibold text-white">Improve Current Liquidity</div>
          <div className="mt-2 text-sm text-neutral-400">
            Optimize liquidity for an already live token
          </div>
        </button>
      </div>
    </div>
  );
}

// Screen B: Launch context
function StepLaunch({
  model,
  updateModel,
}: {
  model: LiquidityModel;
  updateModel: (updates: Partial<LiquidityModel>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Launch Context</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <NumberInput
          label="Launch Market Cap (USD)"
          value={model.launchMarketCapUsd}
          onChange={(value) => updateModel({ launchMarketCapUsd: value })}
          placeholder="200,000,000"
        />

        <NumberInput
          label="Circulating Supply at TGE"
          value={model.circulatingSupplyAtTge}
          onChange={(value) => updateModel({ circulatingSupplyAtTge: value })}
          placeholder="100,000,000"
        />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-300">TGE Float %</span>
          <input
            type="number"
            value={model.tgeFloatPct || ""}
            onChange={(e) =>
              updateModel({ tgeFloatPct: parseFloat(e.target.value) || 0 })
            }
            className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-white"
            placeholder="10"
          />
        </label>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
        <div className="text-sm font-medium text-neutral-300">
          Implied TGE Price:{" "}
          <span className="text-blue-400">
            ${(model.launchMarketCapUsd / model.circulatingSupplyAtTge || 0).toFixed(4)}
          </span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">Volume Curve</h3>

        {/* Toggle for Decay Function */}
        <div className="mb-6 flex gap-2 rounded-lg bg-neutral-950 p-1 border border-neutral-800 w-fit">
          <button
            onClick={() => updateModel({ decayFunction: "Linear" })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${model.decayFunction === "Linear"
              ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
              : "text-neutral-400 hover:text-neutral-200"
              }`}
          >
            Linear Decay
          </button>
          <button
            onClick={() => updateModel({ decayFunction: "Exponential" })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${model.decayFunction === "Exponential" // Default
              ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
              : "text-neutral-400 hover:text-neutral-200"
              }`}
          >
            Exponential Decay
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <NumberInput
              label="Peak Day Volume (USD)"
              value={model.peakDayVolumeUsd}
              onChange={(value) => updateModel({ peakDayVolumeUsd: value })}
              placeholder="5,000,000"
            />

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-300">
                Decay to % (of peak)
              </span>
              <input
                type="number"
                value={model.decayToPct || ""}
                onChange={(e) =>
                  updateModel({ decayToPct: parseFloat(e.target.value) || 0 })
                }
                className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-white"
                placeholder="20"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-300">
                Decay to Day
              </span>
              <input
                type="number"
                value={model.decayToDay || ""}
                onChange={(e) =>
                  updateModel({ decayToDay: parseInt(e.target.value) || 0 })
                }
                className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-white"
                placeholder="30"
              />
            </label>
          </div>

          <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 h-64">
            <VolumeDecayChart model={model} />
          </div>
        </div>
      </div>


    </div>
  );
}

// Screen C: Venue map
function StepVenues({
  model,
  updateModel,
}: {
  model: LiquidityModel;
  updateModel: (updates: Partial<LiquidityModel>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Venue Map</h2>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">DEX Pools</h3>
        <DexPoolTable
          pools={model.dexPools}
          onChange={(dexPools) => updateModel({ dexPools })}
        />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">CEX Plan (Month 1)</h3>
        <p className="mb-3 text-sm text-neutral-400">
          Enter target number of listings. Use sliders to estimate liquidity needs relative to Tier 1.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Tier 1 */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-white">Tier 1</span>
              <span className="text-xs text-neutral-500">Binance, Coinbase</span>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Count</span>
              <input
                type="number"
                min="0"
                value={model.cexTierMonth1.tier1}
                onChange={(e) => updateModel({
                  cexTierMonth1: { ...model.cexTierMonth1, tier1: Math.max(0, parseInt(e.target.value) || 0) }
                })}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-white"
              />
            </label>
            <div className="mt-4 text-xs text-blue-400">100% Liquidity Depth</div>
          </div>

          {/* Tier 2 */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-white">Tier 2</span>
              <span className="text-xs text-neutral-500">Bybit, OKX, Kraken</span>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Count</span>
              <input
                type="number"
                min="0"
                value={model.cexTierMonth1.tier2}
                onChange={(e) => updateModel({
                  cexTierMonth1: { ...model.cexTierMonth1, tier2: Math.max(0, parseInt(e.target.value) || 0) }
                })}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-white"
              />
            </label>

            {model.cexTierMonth1.tier2 > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Liquidity % of T1</span>
                  <span className="text-white">{(model.cexLiquidityFractions.tier2 * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={model.cexLiquidityFractions.tier2 * 100}
                  onChange={(e) => updateModel({
                    cexLiquidityFractions: { ...model.cexLiquidityFractions, tier2: parseInt(e.target.value) / 100 }
                  })}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Tier 3 */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-white">Tier 3</span>
              <span className="text-xs text-neutral-500">Gate, KuCoin, HTX</span>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Count</span>
              <input
                type="number"
                min="0"
                value={model.cexTierMonth1.tier3}
                onChange={(e) => updateModel({
                  cexTierMonth1: { ...model.cexTierMonth1, tier3: Math.max(0, parseInt(e.target.value) || 0) }
                })}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-white"
              />
            </label>

            {model.cexTierMonth1.tier3 > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Liquidity % of T1</span>
                  <span className="text-white">{(model.cexLiquidityFractions.tier3 * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={model.cexLiquidityFractions.tier3 * 100}
                  onChange={(e) => updateModel({
                    cexLiquidityFractions: { ...model.cexLiquidityFractions, tier3: parseInt(e.target.value) / 100 }
                  })}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Screen D: KPI targets
function StepKPIs({
  model,
  updateModel,
}: {
  model: LiquidityModel;
  updateModel: (updates: Partial<LiquidityModel>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">CEX KPI Targets</h2>
      <p className="text-sm text-neutral-400">
        These targets are primarily for CEX market making. DEX liquidity is configured separately via pool parameters.
      </p>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">Depth Ladder (for CEX)</h3>
        <DepthTargetsEditor
          targets={model.targets.depthTargets}
          onChange={(depthTargets) =>
            updateModel({
              targets: { ...model.targets, depthTargets },
            })
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-300">
            Target Spread (bps)
          </span>
          <input
            type="number"
            value={model.targets.targetSpreadBps || ""}
            onChange={(e) =>
              updateModel({
                targets: {
                  ...model.targets,
                  targetSpreadBps: parseInt(e.target.value) || 0,
                },
              })
            }
            className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-white"
            placeholder="40"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-300">
            Target Uptime %
          </span>
          <input
            type="number"
            value={model.targets.targetUptimePct || ""}
            onChange={(e) =>
              updateModel({
                targets: {
                  ...model.targets,
                  targetUptimePct: parseInt(e.target.value) || 0,
                },
              })
            }
            className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-white"
            placeholder="95"
          />
        </label>
      </div>
    </div>
  );
}

// Screen E: Budgets & market
function StepBudgets({
  model,
  updateModel,
}: {
  model: LiquidityModel;
  updateModel: (updates: Partial<LiquidityModel>) => void;
}) {
  const REGIMES: MarketRegime[] = ["Bull", "Base", "Bear"];
  const VOLATILITIES: Volatility[] = ["Low", "Med", "High"];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Budgets & Market Regime</h2>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">Budgets</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <NumberInput
            label="Team Token Inventory (max)"
            value={model.budgets.teamTokenInventoryMax}
            onChange={(value) =>
              updateModel({
                budgets: { ...model.budgets, teamTokenInventoryMax: value },
              })
            }
            placeholder="1,000,000"
          />

          <NumberInput
            label="Team Stable Inventory (USD)"
            value={model.budgets.teamStableInventoryMaxUsd}
            onChange={(value) =>
              updateModel({
                budgets: { ...model.budgets, teamStableInventoryMaxUsd: value },
              })
            }
            placeholder="500,000"
          />

          <NumberInput
            label="Volatile Quote Inventory (USD, optional)"
            value={model.budgets.teamVolatileQuoteInventoryMaxUsd || 0}
            onChange={(value) =>
              updateModel({
                budgets: {
                  ...model.budgets,
                  teamVolatileQuoteInventoryMaxUsd: value || undefined,
                },
              })
            }
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">Market Regime</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-300">Market</span>
            <div className="flex gap-2">
              {REGIMES.map((regime) => (
                <button
                  key={regime}
                  onClick={() =>
                    updateModel({
                      regime: { ...model.regime, market: regime },
                    })
                  }
                  className={`flex-1 rounded border px-4 py-2 text-sm font-medium transition-all ${model.regime.market === regime
                    ? "border-blue-500 bg-blue-500/20 text-blue-400"
                    : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600"
                    }`}
                >
                  {regime}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-300">Volatility</span>
            <div className="flex gap-2">
              {VOLATILITIES.map((vol) => (
                <button
                  key={vol}
                  onClick={() =>
                    updateModel({
                      regime: { ...model.regime, volatility: vol },
                    })
                  }
                  className={`flex-1 rounded border px-4 py-2 text-sm font-medium transition-all ${model.regime.volatility === vol
                    ? "border-blue-500 bg-blue-500/20 text-blue-400"
                    : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600"
                    }`}
                >
                  {vol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Screen F: Deal inputs
function StepDeal({
  model,
  updateModel,
}: {
  model: LiquidityModel;
  updateModel: (updates: Partial<LiquidityModel>) => void;
}) {
  const DEAL_MODELS: DealModel[] = ["Retainer", "LoanCall"];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Deal Inputs</h2>
      <p className="text-sm text-neutral-400">
        Choose how you'll compensate market makers for providing liquidity.
      </p>

      <div className="flex gap-2">
        {DEAL_MODELS.map((dealModel) => (
          <button
            key={dealModel}
            onClick={() =>
              updateModel({ deal: { ...model.deal, model: dealModel } })
            }
            className={`flex-1 rounded border px-4 py-2 text-sm font-medium transition-all ${model.deal.model === dealModel
              ? "border-blue-500 bg-blue-500/20 text-blue-400"
              : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600"
              }`}
          >
            {dealModel === "LoanCall" ? "Loan + Call (Multi-Tranche)" : dealModel}
          </button>
        ))}
      </div>

      {model.deal.model === "Retainer" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-600/30 bg-blue-600/10 p-4 text-sm text-neutral-300">
            <div className="font-semibold text-blue-400 mb-2">Retainer Model</div>
            <p>Pay a fixed monthly fee to the market maker. This is the <strong>explicit cost</strong> — predictable and transparent. Market makers provide liquidity using their own inventory or borrowed tokens, and you pay them a service fee regardless of token price performance.</p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-300">
              Monthly Retainer (USD)
            </span>
            <p className="text-xs text-neutral-500">
              Typical range: $5K–$25K/month depending on tier and scope
            </p>
            <input
              type="number"
              value={model.deal.retainerMonthlyUsd || ""}
              onChange={(e) =>
                updateModel({
                  deal: {
                    ...model.deal,
                    retainerMonthlyUsd: parseFloat(e.target.value) || 0,
                  },
                })
              }
              className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-white"
              placeholder="10000"
            />
          </label>
        </div>
      )}

      {model.deal.model === "LoanCall" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-purple-600/30 bg-purple-600/10 p-4 text-sm text-neutral-300">
            <div className="font-semibold text-purple-400 mb-2">Loan + Call Option Model</div>
            <p className="mb-2">Define one or more tranches of inventory + options. Each tranche can have specific terms and KPI obligations.</p>
          </div>

          <DealTrancheEditor
            tranches={model.deal.tranches || []}
            onChange={(tranches) => updateModel({ deal: { ...model.deal, tranches } })}
          />
        </div>
      )}
    </div>
  );
}

// Screen G: Results dashboard
function StepResults({
  model,
  outputs,
}: {
  model: LiquidityModel;
  outputs: LiquidityOutputs;
}) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtUsd = (n: number) => `$${fmt(n)}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Results Dashboard</h2>
        <div className="text-sm text-neutral-400">
          TGE Price: <span className="font-medium text-white">${outputs.tgePriceUsd.toFixed(4)}</span>
        </div>
      </div>

      {/* Required Inventory Summary */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Required Inventory</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-neutral-800 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
            <div className="text-xs text-neutral-400">DEX Total</div>
            <div className="mt-2 text-xl font-semibold text-blue-400">
              {fmt(outputs.required.dex.tokenAmount)} tokens
            </div>
            <div className="mt-1 text-sm text-neutral-300">
              {fmtUsd(outputs.required.dex.stableUsd)} stable
            </div>
            {outputs.required.dex.volatileQuoteUsd && (
              <div className="mt-1 text-xs text-yellow-400">
                + {fmtUsd(outputs.required.dex.volatileQuoteUsd)} volatile quote
              </div>
            )}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-gradient-to-br from-purple-500/10 to-transparent p-4">
            <div className="text-xs text-neutral-400">CEX Total</div>
            <div className="mt-2 text-xl font-semibold text-purple-400">
              {fmt(outputs.required.cex.tokenAmount)} tokens
            </div>
            <div className="mt-1 text-sm text-neutral-300">
              {fmtUsd(outputs.required.cex.stableUsd)} stable
            </div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-gradient-to-br from-green-500/10 to-transparent p-4">
            <div className="text-xs text-neutral-400">Total Required</div>
            <div className="mt-2 text-xl font-semibold text-green-400">
              {fmt(outputs.required.total.tokenAmount)} tokens
            </div>
            <div className="mt-1 text-sm text-neutral-300">
              {fmtUsd(outputs.required.total.stableUsd)} stable
            </div>
          </div>
        </div>
      </div>

      {/* DEX Per-Pool Breakdown */}
      {outputs.required.dex.perPool.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-white">DEX Pool Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-white">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-300">
                  <th className="px-4 py-2">Pool</th>
                  <th className="px-4 py-2 text-right">Token Amount</th>
                  <th className="px-4 py-2 text-right">Stable USD</th>
                  <th className="px-4 py-2 text-right">Volatile Quote USD</th>
                </tr>
              </thead>
              <tbody>
                {outputs.required.dex.perPool.map((pool) => (
                  <tr key={pool.poolId} className="border-b border-neutral-800">
                    <td className="px-4 py-2">{pool.poolLabel}</td>
                    <td className="px-4 py-2 text-right">{fmt(pool.tokenAmount)}</td>
                    <td className="px-4 py-2 text-right">{fmtUsd(pool.stableUsd)}</td>
                    <td className="px-4 py-2 text-right">
                      {pool.volatileQuoteUsd ? fmtUsd(pool.volatileQuoteUsd) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seeding Reference */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">DEX Seeding Reference</h3>
        <p className="mb-3 text-sm text-neutral-400">
          Comparison of two seeding methodologies: market-cap-scaled benchmarks vs. your specific KPI requirements.
        </p>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs text-neutral-400">Suggested Seed %</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {(outputs.seeding.suggestedSeedPct * 100).toFixed(3)}%
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Scaled from industry benchmarks
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-400">Market Cap Benchmark Method</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {fmt(outputs.seeding.seedByReferenceTokens)} tokens
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Based on comparable launches at similar FDV
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-400">KPI-Driven Method</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {fmt(outputs.seeding.seedByKpiTokens)} tokens
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Calculated from your depth targets
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-neutral-700 pt-4">
            <div className="text-xs text-neutral-400">Recommended DEX Seed</div>
            <div className="mt-1 text-xl font-semibold text-blue-400">
              {fmt(outputs.seeding.recommendedTokens)} tokens
            </div>
            <div className="text-xs text-neutral-500">
              Uses the higher of benchmark or KPI-driven to ensure adequate liquidity
            </div>
          </div>
        </div>
      </div>

      {/* Feasibility Grid */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Feasibility Analysis</h3>
        <div className="space-y-2">
          {outputs.feasibility.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-lg border p-4 ${item.status === "green"
                ? "border-green-600/30 bg-green-600/10"
                : item.status === "yellow"
                  ? "border-yellow-600/30 bg-yellow-600/10"
                  : "border-red-600/30 bg-red-600/10"
                }`}
            >
              <div className="text-2xl">
                {item.status === "green" ? "✅" : item.status === "yellow" ? "⚠️" : "❌"}
              </div>
              <div className="flex-1">
                <div className={`font-semibold ${item.status === "green"
                  ? "text-green-400"
                  : item.status === "yellow"
                    ? "text-yellow-400"
                    : "text-red-400"
                  }`}>
                  {item.item}
                </div>
                <div className="mt-1 text-sm text-neutral-300">{item.reason}</div>
                {item.shortfall && (
                  <div className="mt-2 text-xs text-neutral-400">
                    Shortfall:{" "}
                    {item.shortfall.tokenShortfall && (
                      <span className="text-red-400">
                        {fmt(item.shortfall.tokenShortfall)} tokens
                      </span>
                    )}
                    {item.shortfall.stableShortfall && (
                      <span className="text-red-400">
                        {" "}
                        {fmtUsd(item.shortfall.stableShortfall)} stable
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fragmentation Analysis */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Fragmentation Analysis</h3>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-neutral-400">Fragmentation Multiplier</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {outputs.fragmentation.multiplier.toFixed(2)}x
              </div>
              <div className={`mt-1 text-sm font-medium ${outputs.fragmentation.scoreLabel === "High"
                ? "text-red-400"
                : outputs.fragmentation.scoreLabel === "Medium"
                  ? "text-yellow-400"
                  : "text-green-400"
                }`}>
                {outputs.fragmentation.scoreLabel} Penalty
              </div>
            </div>
            {outputs.fragmentation.suggestions.length > 0 && (
              <div className="flex-1">
                <div className="text-xs text-neutral-400">Suggestions</div>
                <ul className="mt-2 space-y-1 text-sm text-neutral-300">
                  {outputs.fragmentation.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-neutral-600">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deal Comparison */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Deal Comparison (90 days)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Retainer */}
          <div className="rounded-lg border border-neutral-800 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
            <div className="text-lg font-semibold text-white">Retainer Model</div>
            <div className="mt-4 text-xs text-neutral-400">Explicit Cost (90 days)</div>
            <div className="mt-1 text-2xl font-semibold text-blue-400">
              {fmtUsd(outputs.dealComparison.retainerCost90dUsd)}
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              3 months × ${fmt(model.deal.retainerMonthlyUsd || 0)}/mo
            </div>
          </div>

          {/* Loan + Call */}
          <div className="rounded-lg border border-neutral-800 bg-gradient-to-br from-purple-500/10 to-transparent p-4">
            <div className="text-lg font-semibold text-white">Loan + Call Model</div>
            <div className="mt-4 text-xs text-neutral-400">Option Give-Up Scenarios</div>
            <div className="mt-2 space-y-2">
              {outputs.dealComparison.optionCostScenarios.map((scenario) => (
                <div
                  key={scenario.fdvMultiplier}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-neutral-400">
                    {scenario.fdvMultiplier}× FDV ({fmtUsd(scenario.fdvUsd)}):
                  </span>
                  <span className={`font-medium ${scenario.valueTransferred > 0 ? "text-red-400" : "text-green-400"
                    }`}>
                    {scenario.valueTransferred > 0
                      ? fmtUsd(scenario.valueTransferred)
                      : "$0"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-neutral-500">
              {outputs.dealComparison.optionCostScenarios[0]?.strikePrice > 0
                ? `Strike: $${outputs.dealComparison.optionCostScenarios[0]?.strikePrice.toFixed(4)}`
                : "Strike: Varies by tranche"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

