"use client";

import type { StakingModel, PriceScenario } from "@/types/staking";
import { hasPrePopulatedData, type StakingTabProps } from "../StakingWizardTypes";

interface StepTokenBasicsProps {
  model: StakingModel;
  updateModel: (updates: Partial<StakingModel>) => void;
  prePopulatedProps?: StakingTabProps;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

export default function StepTokenBasics({
  model,
  updateModel,
  prePopulatedProps,
}: StepTokenBasicsProps) {
  const isPrePopulated = hasPrePopulatedData(prePopulatedProps || {});

  const handlePriceScenarioTypeChange = (type: PriceScenario["type"]) => {
    if (type === "flat") {
      updateModel({
        priceScenario: { type: "flat", price: model.initialPrice },
      });
    } else if (type === "bull_base_bear") {
      updateModel({
        priceScenario: {
          type: "bull_base_bear",
          bullMultiplier: 2.0,
          baseMultiplier: 1.0,
          bearMultiplier: 0.5,
          horizonMonths: model.horizonSteps,
        },
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Token Basics</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Configure your token's supply and price assumptions for the simulation.
        </p>
      </div>

      {/* Pre-populated notice */}
      {isPrePopulated && (
        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-start gap-3">
            <span className="text-lg">📋</span>
            <div className="text-sm text-cyan-300">
              <span className="font-medium">Data imported from Emissions tab.</span>
              <p className="text-cyan-400/70 mt-1">
                Token supply and symbol have been pre-filled. You can adjust if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Token Identity */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Token Identity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Token Symbol</span>
            <input
              type="text"
              value={model.tokenSymbol}
              onChange={(e) => updateModel({ tokenSymbol: e.target.value.toUpperCase() })}
              className="input-glass"
              placeholder="TOKEN"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Project Name</span>
            <input
              type="text"
              value={model.name}
              onChange={(e) => updateModel({ name: e.target.value })}
              className="input-glass"
              placeholder="My Staking Protocol"
            />
          </label>
        </div>
      </section>

      {/* Supply Configuration */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Supply</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Total Supply</span>
            <input
              type="number"
              value={model.totalSupply}
              onChange={(e) => updateModel({ totalSupply: parseFloat(e.target.value) || 0 })}
              className="input-glass"
              placeholder="1,000,000,000"
            />
            <span className="text-xs text-neutral-500">{fmt(model.totalSupply)} tokens</span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Initial Circulating Supply</span>
            <input
              type="number"
              value={model.circulatingSupply0}
              onChange={(e) => updateModel({ circulatingSupply0: parseFloat(e.target.value) || 0 })}
              className="input-glass"
              placeholder="200,000,000"
            />
            <span className="text-xs text-neutral-500">
              {((model.circulatingSupply0 / model.totalSupply) * 100).toFixed(1)}% of total
            </span>
          </label>
        </div>
      </section>

      {/* Price Configuration */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Price Assumptions</h3>
        
        <label className="flex flex-col gap-2">
          <span className="text-xs text-neutral-400">Initial Token Price (USD)</span>
          <input
            type="number"
            step="0.01"
            value={model.initialPrice}
            onChange={(e) => {
              const price = parseFloat(e.target.value) || 0;
              updateModel({ initialPrice: price });
              if (model.priceScenario.type === "flat") {
                updateModel({ priceScenario: { type: "flat", price } });
              }
            }}
            className="input-glass"
            placeholder="1.00"
          />
          <span className="text-xs text-neutral-500">
            Implied FDV: ${fmt(model.totalSupply * model.initialPrice)}
          </span>
        </label>

        {/* Price Scenario */}
        <div className="space-y-3">
          <span className="text-xs text-neutral-400">Price Scenario</span>
          <div className="flex gap-2">
            {(["flat", "bull_base_bear"] as const).map((type) => (
              <button
                key={type}
                onClick={() => handlePriceScenarioTypeChange(type)}
                className={`
                  px-4 py-2 rounded-lg text-sm transition-all
                  ${model.priceScenario.type === type
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/[0.03] text-neutral-400 border border-white/[0.08] hover:bg-white/[0.06]"
                  }
                `}
              >
                {type === "flat" ? "Flat Price" : "Bull / Base / Bear"}
              </button>
            ))}
          </div>

          {model.priceScenario.type === "bull_base_bear" && (
            <div className="grid gap-4 sm:grid-cols-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-400">Bull Multiplier</span>
                <input
                  type="number"
                  step="0.1"
                  value={model.priceScenario.bullMultiplier}
                  onChange={(e) =>
                    updateModel({
                      priceScenario: {
                        ...model.priceScenario,
                        type: "bull_base_bear",
                        bullMultiplier: parseFloat(e.target.value) || 1,
                      } as PriceScenario,
                    })
                  }
                  className="input-glass"
                />
                <span className="text-xs text-green-400">
                  ${(model.initialPrice * (model.priceScenario.type === "bull_base_bear" ? model.priceScenario.bullMultiplier : 1)).toFixed(2)}
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-400">Base Multiplier</span>
                <input
                  type="number"
                  step="0.1"
                  value={model.priceScenario.baseMultiplier}
                  onChange={(e) =>
                    updateModel({
                      priceScenario: {
                        ...model.priceScenario,
                        type: "bull_base_bear",
                        baseMultiplier: parseFloat(e.target.value) || 1,
                      } as PriceScenario,
                    })
                  }
                  className="input-glass"
                />
                <span className="text-xs text-yellow-400">
                  ${(model.initialPrice * (model.priceScenario.type === "bull_base_bear" ? model.priceScenario.baseMultiplier : 1)).toFixed(2)}
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-400">Bear Multiplier</span>
                <input
                  type="number"
                  step="0.1"
                  value={model.priceScenario.bearMultiplier}
                  onChange={(e) =>
                    updateModel({
                      priceScenario: {
                        ...model.priceScenario,
                        type: "bull_base_bear",
                        bearMultiplier: parseFloat(e.target.value) || 1,
                      } as PriceScenario,
                    })
                  }
                  className="input-glass"
                />
                <span className="text-xs text-red-400">
                  ${(model.initialPrice * (model.priceScenario.type === "bull_base_bear" ? model.priceScenario.bearMultiplier : 1)).toFixed(2)}
                </span>
              </label>
            </div>
          )}
        </div>
      </section>

      {/* Time Configuration */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Simulation Period</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Time Step</span>
            <select
              value={model.timeStep}
              onChange={(e) => updateModel({ timeStep: e.target.value as "weekly" | "monthly" })}
              className="input-glass"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Horizon ({model.timeStep === "monthly" ? "months" : "weeks"})</span>
            <input
              type="number"
              value={model.horizonSteps}
              onChange={(e) => updateModel({ horizonSteps: parseInt(e.target.value) || 24 })}
              className="input-glass"
              placeholder="24"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
