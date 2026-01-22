"use client";

import { useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  StakingModel,
  StakingArchetype,
  ElasticityPreset,
} from "@/types/staking";
import { computeStakingSeries, runStressTest } from "@/lib/stakingEngine";
import { stakingPresets } from "@/data/presets/stakingPresets";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

export default function StakingTab() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState<StakingModel>(stakingPresets[0].model);

  // Compute outputs
  const outputs = useMemo(() => {
    try {
      return computeStakingSeries(model);
    } catch (error) {
      console.error("Staking computation error:", error);
      return null;
    }
  }, [model]);

  const handleArchetypeChange = (archetype: StakingArchetype) => {
    const preset = stakingPresets.find((p) => p.model.archetype === archetype);
    if (preset) {
      setModel(preset.model);
    } else {
      setModel({ ...model, archetype });
    }
  };

  const handleLoadPreset = (presetName: string) => {
    const preset = stakingPresets.find((p) => p.name === presetName);
    if (preset) {
      setModel(preset.model);
    }
  };

  const updateModel = (updates: Partial<StakingModel>) => {
    setModel({ ...model, ...updates });
  };

  const updateModelNested = (path: string, value: any) => {
    const keys = path.split(".");
    const newModel = JSON.parse(JSON.stringify(model));
    let current: any = newModel;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setModel(newModel);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-white">
          Staking Program Designer & Demand Simulator
        </h2>
        <p className="text-sm text-neutral-400">
          Simulate staking demand, yields, security, and sustainability across different
          staking archetypes
        </p>
      </header>

      {/* Archetype Selector */}
      <section className="glass-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Staking Archetype</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(["consensus", "defi", "liquid_staking", "restaking", "ve_governance"] as StakingArchetype[]).map(
            (arch) => (
              <button
                key={arch}
                onClick={() => handleArchetypeChange(arch)}
                className={`rounded-lg border-2 p-3 text-sm transition-colors ${
                  model.archetype === arch
                    ? "border-blue-500 bg-blue-500/10 text-white"
                    : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600"
                }`}
              >
                {arch.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            )
          )}
        </div>

        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={model.hybridMode}
              onChange={(e) => updateModel({ hybridMode: e.target.checked })}
              className="rounded"
            />
            Hybrid Mode (stack multiple archetypes)
          </label>
        </div>
      </section>

      {/* Preset Selector */}
      <section className="glass-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Load Preset</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stakingPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleLoadPreset(preset.name)}
              className={`rounded border p-3 text-left text-sm transition-colors ${
                model.name === preset.name
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-neutral-700 bg-neutral-800 hover:border-neutral-600"
              }`}
            >
              <div className="font-medium text-white">{preset.name}</div>
              <div className="mt-1 text-xs text-neutral-400">{preset.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Input Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Token & Supply */}
        <section className="glass-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Token & Supply</h3>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Token Symbol
              <input
                type="text"
                value={model.tokenSymbol}
                onChange={(e) => updateModel({ tokenSymbol: e.target.value })}
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Total Supply
              <input
                type="number"
                value={model.totalSupply}
                onChange={(e) => updateModel({ totalSupply: parseFloat(e.target.value) })}
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Initial Circulating Supply
              <input
                type="number"
                value={model.circulatingSupply0}
                onChange={(e) => updateModel({ circulatingSupply0: parseFloat(e.target.value) })}
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Initial Price ($)
              <input
                type="number"
                step="0.01"
                value={model.initialPrice}
                onChange={(e) => updateModel({ initialPrice: parseFloat(e.target.value) })}
                className="input-glass"
              />
            </label>
          </div>
        </section>

        {/* Time Config */}
        <section className="glass-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Time Configuration</h3>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Time Step
              <select
                value={model.timeStep}
                onChange={(e) => updateModel({ timeStep: e.target.value as any })}
                className="input-glass"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Horizon ({model.timeStep === "monthly" ? "months" : "weeks"})
              <input
                type="number"
                value={model.horizonSteps}
                onChange={(e) => updateModel({ horizonSteps: parseInt(e.target.value) })}
                className="input-glass"
              />
            </label>
          </div>
        </section>
      </div>

      {/* Rewards Configuration */}
      <section className="glass-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Rewards Sources</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Inflation */}
          <div className="glass-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={model.rewards.inflation.enabled}
                onChange={(e) =>
                  updateModelNested("rewards.inflation.enabled", e.target.checked)
                }
                className="rounded"
              />
              <span className="text-sm font-medium text-white">Inflation Rewards</span>
            </div>
            {model.rewards.inflation.enabled && (
              <div className="grid gap-2">
                <label className="flex flex-col gap-1 text-xs text-neutral-300">
                  Annual Inflation Rate (%)
                  <input
                    type="number"
                    step="0.01"
                    value={model.rewards.inflation.annualInflationRate * 100}
                    onChange={(e) =>
                      updateModelNested(
                        "rewards.inflation.annualInflationRate",
                        parseFloat(e.target.value) / 100
                      )
                    }
                    className="input-glass text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-300">
                  Distribution to Stakers (%)
                  <input
                    type="number"
                    step="1"
                    value={model.rewards.inflation.distributionToStakersPct * 100}
                    onChange={(e) =>
                      updateModelNested(
                        "rewards.inflation.distributionToStakersPct",
                        parseFloat(e.target.value) / 100
                      )
                    }
                    className="input-glass text-sm"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Fees */}
          <div className="glass-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={model.rewards.fees.enabled}
                onChange={(e) =>
                  updateModelNested("rewards.fees.enabled", e.target.checked)
                }
                className="rounded"
              />
              <span className="text-sm font-medium text-white">Fee Rewards</span>
            </div>
            {model.rewards.fees.enabled && (
              <div className="grid gap-2">
                <label className="flex flex-col gap-1 text-xs text-neutral-300">
                  Fees Per Step (USD)
                  <input
                    type="number"
                    value={model.rewards.fees.feesPerStep || 0}
                    onChange={(e) =>
                      updateModelNested("rewards.fees.feesPerStep", parseFloat(e.target.value))
                    }
                    className="input-glass text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-300">
                  Fee Share to Stakers (%)
                  <input
                    type="number"
                    step="1"
                    value={model.rewards.fees.feeShareToStakersPct * 100}
                    onChange={(e) =>
                      updateModelNested(
                        "rewards.fees.feeShareToStakersPct",
                        parseFloat(e.target.value) / 100
                      )
                    }
                    className="input-glass text-sm"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Staking Mechanics */}
      <section className="glass-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Staking Mechanics</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Unbonding Period ({model.timeStep === "monthly" ? "months" : "weeks"})
            <input
              type="number"
              value={model.staking.unbondingSteps}
              onChange={(e) =>
                updateModelNested("staking.unbondingSteps", parseInt(e.target.value))
              }
              className="input-glass"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Operator Commission (%)
            <input
              type="number"
              step="0.1"
              value={model.staking.operatorCommissionPct * 100}
              onChange={(e) =>
                updateModelNested("staking.operatorCommissionPct", parseFloat(e.target.value) / 100)
              }
              className="input-glass"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Max Stake % of Supply
            <input
              type="number"
              step="1"
              value={(model.staking.maxStakePctOfSupply || 1) * 100}
              onChange={(e) =>
                updateModelNested("staking.maxStakePctOfSupply", parseFloat(e.target.value) / 100)
              }
              className="input-glass"
            />
          </label>
        </div>
      </section>

      {/* Demand Model */}
      <section className="glass-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Demand Model</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Opportunity Cost (% annual)
            <input
              type="number"
              step="0.01"
              value={model.demand.opportunityCostAnnual * 100}
              onChange={(e) =>
                updateModelNested("demand.opportunityCostAnnual", parseFloat(e.target.value) / 100)
              }
              className="input-glass"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Elasticity Preset
            <select
              value={model.demand.elasticityPreset}
              onChange={(e) =>
                updateModelNested("demand.elasticityPreset", e.target.value as ElasticityPreset)
              }
              className="input-glass"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Base Participation (%)
            <input
              type="number"
              step="1"
              value={model.demand.baseParticipation * 100}
              onChange={(e) =>
                updateModelNested("demand.baseParticipation", parseFloat(e.target.value) / 100)
              }
              className="input-glass"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Max Participation (%)
            <input
              type="number"
              step="1"
              value={model.demand.maxParticipation * 100}
              onChange={(e) =>
                updateModelNested("demand.maxParticipation", parseFloat(e.target.value) / 100)
              }
              className="input-glass"
            />
          </label>
        </div>
      </section>

      {/* Advanced Mode Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="btn-secondary btn-sm"
      >
        {showAdvanced ? "Hide" : "Show"} Advanced Settings
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <section className="glass-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Advanced Risk Settings</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Slash Probability (% annual)
              <input
                type="number"
                step="0.01"
                value={model.risk.slashProbAnnual * 100}
                onChange={(e) =>
                  updateModelNested("risk.slashProbAnnual", parseFloat(e.target.value) / 100)
                }
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Slash Severity (%)
              <input
                type="number"
                step="1"
                value={model.risk.slashSeverityPct * 100}
                onChange={(e) =>
                  updateModelNested("risk.slashSeverityPct", parseFloat(e.target.value) / 100)
                }
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Smart Contract Risk (% annual)
              <input
                type="number"
                step="0.01"
                value={model.risk.smartContractRiskAnnual * 100}
                onChange={(e) =>
                  updateModelNested("risk.smartContractRiskAnnual", parseFloat(e.target.value) / 100)
                }
                className="input-glass"
              />
            </label>
          </div>
        </section>
      )}

      {/* Outputs Section */}
      {outputs && (
        <>
          {/* KPI Cards */}
          <section className="glass-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Key Metrics</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="glass-surface p-4">
                <div className="text-xs uppercase text-neutral-500">Staking Ratio</div>
                <div className="mt-1 text-2xl font-bold text-blue-400">
                  {fmtPct(outputs.metadata.finalStakingRatio)}
                </div>
                <div className="mt-1 text-xs text-neutral-400">of circulating supply</div>
              </div>

              <div className="glass-surface p-4">
                <div className="text-xs uppercase text-neutral-500">Avg Net APR</div>
                <div className="mt-1 text-2xl font-bold text-green-400">
                  {fmtPct(outputs.metadata.avgNetAPR)}
                </div>
                <div className="mt-1 text-xs text-neutral-400">after all costs</div>
              </div>

              <div className="glass-surface p-4">
                <div className="text-xs uppercase text-neutral-500">Stake Value</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  ${(outputs.metadata.totalStakeValueUSD / 1_000_000).toFixed(1)}M
                </div>
                <div className="mt-1 text-xs text-neutral-400">USD at horizon end</div>
              </div>

              <div className="glass-surface p-4">
                <div className="text-xs uppercase text-neutral-500">Real Yield</div>
                <div className="mt-1 text-2xl font-bold text-yellow-400">
                  {outputs.metadata.avgFeeCoverage.toFixed(1)}%
                </div>
                <div className="mt-1 text-xs text-neutral-400">from fees vs inflation</div>
              </div>
            </div>
          </section>

          {/* Charts */}
          <section className="glass-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Staking Ratio Over Time</h3>
            <div className="h-[20rem] glass-surface p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={outputs.steps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="t"
                    stroke="#9ca3af"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "4px",
                    }}
                    labelStyle={{ color: "#d1d5db" }}
                    formatter={(v: any) => [`${(v * 100).toFixed(2)}%`, ""]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="stakingRatio"
                    stroke="#3b82f6"
                    name="Actual Ratio"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetStakingRatio"
                    stroke="#10b981"
                    strokeDasharray="5 5"
                    name="Target Ratio"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* APR Chart */}
          <section className="glass-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Gross vs Net APR</h3>
            <div className="h-[20rem] glass-surface p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={outputs.steps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="t"
                    stroke="#9ca3af"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "4px",
                    }}
                    labelStyle={{ color: "#d1d5db" }}
                    formatter={(v: any) => [`${(v * 100).toFixed(2)}%`, ""]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="grossAPR"
                    stroke="#22c55e"
                    name="Gross APR"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="netAPR"
                    stroke="#eab308"
                    name="Net APR"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Cohorts Table */}
          {outputs.cohorts.length > 0 && (
            <section className="glass-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Cohort Yields</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-left text-xs text-slate-400">
                      <th className="pb-2">Cohort</th>
                      <th className="pb-2">Net APR</th>
                      <th className="pb-2">Participation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.cohorts.map((cohort, idx) => (
                      <tr key={idx} className="border-b border-white/[0.06] text-sm">
                        <td className="py-2 text-white">{cohort.cohort}</td>
                        <td className="py-2 text-green-400">{fmtPct(cohort.netAPR)}</td>
                        <td className="py-2 text-neutral-300">
                          {fmtPct(cohort.participationPct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Stress Tests */}
          <section className="glass-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Stress Tests</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["rate_hike", "fee_drawdown", "price_crash", "slash_event"] as const).map(
                (testType) => (
                  <button
                    key={testType}
                    onClick={() => {
                      const result = runStressTest(model, testType);
                      alert(
                        `${testType.replace(/_/g, " ").toUpperCase()}\n\n` +
                          `Δ Staking Ratio: ${fmtPct(result.deltaStakingRatio)}\n` +
                          `Min Ratio: ${fmtPct(result.minStakingRatio)}\n` +
                          `Recovery Time: ${result.timeToRecoverSteps} steps\n` +
                          `Security Budget Δ: ${fmtPct(result.securityBudgetReduction)}`
                      );
                    }}
                    className="btn-primary"
                  >
                    {testType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </button>
                )
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

