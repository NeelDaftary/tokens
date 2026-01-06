"use client";

import { useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import type { DePINConfig, SimulationParams, SimulationResult } from "@/types/depin";
import { runDePINSimulation, extractMetricTimeSeries } from "@/lib/depinSimulation";
import { aggregateSimulationRuns, validateDePINConfig, extractFinalValues, createHistogram, checkForWarnings } from "@/lib/depinAggregation";
import { DEPIN_SCENARIOS, DEMAND_PRESETS, MACRO_PRESETS } from "@/data/presets/depinPresets";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const fmtDec = (n: number, decimals: number = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);

export default function DePINPage() {
  const [config, setConfig] = useState<DePINConfig>(DEPIN_SCENARIOS[0].config);
  const [params, setParams] = useState<SimulationParams>(DEPIN_SCENARIOS[0].params);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSpaghettiPlot, setShowSpaghettiPlot] = useState(false);
  const [spaghettiMetric, setSpaghettiMetric] = useState<string>("tokenPrice");

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setErrors([]);
    setWarnings([]);

    // Validate config
    const validation = validateDePINConfig(config);
    if (!validation.valid) {
      setErrors(validation.errors.map((e) => `${e.field}: ${e.message}`));
      setIsRunning(false);
      return;
    }

    try {
      // Run simulation in a setTimeout to allow UI to update
      setTimeout(() => {
        const rawResult = runDePINSimulation(config, params);
        const aggregatedResult = aggregateSimulationRuns(rawResult);
        setResult(aggregatedResult);
        
        const simWarnings = checkForWarnings(aggregatedResult);
        setWarnings(simWarnings);
        
        setIsRunning(false);
      }, 100);
    } catch (error) {
      console.error("Simulation error:", error);
      setErrors([`Simulation failed: ${error}`]);
      setIsRunning(false);
    }
  };

  const handleLoadScenario = (scenarioName: string) => {
    const scenario = DEPIN_SCENARIOS.find((s) => s.name === scenarioName);
    if (scenario) {
      setConfig(scenario.config);
      setParams(scenario.params);
      setResult(null);
    }
  };

  const handleExportJSON = () => {
    if (!result) return;
    const data = JSON.stringify({ version: "1.0", result }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `depin-simulation-${Date.now()}.json`;
    a.click();
  };

  const handleExportCSV = () => {
    if (!result || !result.aggregate) return;
    
    let csv = "timestep,metric,mean,std,min,max,median,p10,p90\n";
    
    for (const step of result.aggregate) {
      const metrics = [
        "tokenPrice",
        "circulatingSupply",
        "demand",
        "numProviders",
        "totalCapacity",
        "servicePrice",
      ] as const;
      
      for (const metric of metrics) {
        const stats = step[metric];
        csv += `${step.timestep},${metric},${stats.mean},${stats.std},${stats.min},${stats.max},${stats.median},${stats.p10},${stats.p90}\n`;
      }
    }
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `depin-simulation-${Date.now()}.csv`;
    a.click();
  };

  // Histogram data for final values
  const histogramData = useMemo(() => {
    if (!result || !result.runs) return null;
    
    const finalValues = extractFinalValues(result);
    
    return {
      tokenPrice: createHistogram(finalValues.tokenPrice, 15),
      circulatingSupply: createHistogram(finalValues.circulatingSupply, 15),
      numProviders: createHistogram(finalValues.numProviders, 15),
    };
  }, [result]);

  // Spaghetti plot data
  const spaghettiData = useMemo(() => {
    if (!result || !result.runs || !showSpaghettiPlot) return null;
    
    return extractMetricTimeSeries(result.runs, spaghettiMetric as any);
  }, [result, showSpaghettiPlot, spaghettiMetric]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-750"
            >
              ← Back to Toolkit
            </a>
          </div>
          <h1 className="text-2xl font-semibold text-white">
            DePIN Simulation Module
          </h1>
          <p className="text-sm text-neutral-400">
            Simulate decentralized physical infrastructure network token economics with provider dynamics,
            demand scenarios, and token flows
          </p>
        </header>

        {/* Scenario Selector */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-white">Load Preset Scenario</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DEPIN_SCENARIOS.map((scenario) => (
              <button
                key={scenario.name}
                onClick={() => handleLoadScenario(scenario.name)}
                className={`rounded border p-3 text-left text-sm transition-colors ${
                  config.demandType === scenario.config.demandType &&
                  config.macroCondition === scenario.config.macroCondition
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-neutral-700 bg-neutral-800 hover:border-neutral-600"
                }`}
              >
                <div className="font-medium text-white">{scenario.name}</div>
                <div className="mt-1 text-xs text-neutral-400">{scenario.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Configuration Panels */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Token Parameters */}
          <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-white">Token Parameters</h2>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Initial Supply
                <input
                  type="number"
                  value={config.initialSupply}
                  onChange={(e) =>
                    setConfig({ ...config, initialSupply: parseFloat(e.target.value) })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Initial Token Price ($)
                <input
                  type="number"
                  step="0.01"
                  value={config.initialTokenPrice}
                  onChange={(e) =>
                    setConfig({ ...config, initialTokenPrice: parseFloat(e.target.value) })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Initial Service Price ($)
                <input
                  type="number"
                  step="0.1"
                  value={config.initialServicePrice}
                  onChange={(e) =>
                    setConfig({ ...config, initialServicePrice: parseFloat(e.target.value) })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                />
              </label>
            </div>
          </section>

          {/* Demand Configuration */}
          <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-white">Demand Configuration</h2>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Demand Type
                <select
                  value={config.demandType}
                  onChange={(e) =>
                    setConfig({ ...config, demandType: e.target.value as any })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                >
                  {Object.entries(DEMAND_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Base Demand (units)
                <input
                  type="number"
                  value={config.demandParams.baseDemand}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      demandParams: {
                        ...config.demandParams,
                        baseDemand: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Price Elasticity
                <input
                  type="number"
                  step="0.1"
                  value={config.demandParams.priceElasticity}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      demandParams: {
                        ...config.demandParams,
                        priceElasticity: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                />
              </label>
            </div>
          </section>

          {/* Macro Configuration */}
          <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-white">Macro Configuration</h2>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Macro Condition
                <select
                  value={config.macroCondition}
                  onChange={(e) =>
                    setConfig({ ...config, macroCondition: e.target.value as any })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                >
                  {Object.entries(MACRO_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Macro Sensitivity
                <input
                  type="number"
                  step="0.05"
                  value={config.macroSensitivity}
                  onChange={(e) =>
                    setConfig({ ...config, macroSensitivity: parseFloat(e.target.value) })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                />
              </label>
            </div>
          </section>

          {/* Protocol Parameters */}
          <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-white">Protocol Parameters</h2>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Max Mint per Period
                <input
                  type="number"
                  value={config.protocolParams.maxMint}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      protocolParams: {
                        ...config.protocolParams,
                        maxMint: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Percent Burned (0-1)
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={config.protocolParams.percentBurned}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      protocolParams: {
                        ...config.protocolParams,
                        percentBurned: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
                />
              </label>
            </div>
          </section>
        </div>

        {/* Simulation Settings */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-white">Simulation Settings</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Timesteps (weeks)
              <input
                type="number"
                value={params.timesteps}
                onChange={(e) =>
                  setParams({ ...params, timesteps: parseInt(e.target.value) })
                }
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Number of Runs
              <input
                type="number"
                value={params.runs}
                onChange={(e) => setParams({ ...params, runs: parseInt(e.target.value) })}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Random Seed (optional)
              <input
                type="number"
                value={params.seed || ""}
                placeholder="Random"
                onChange={(e) =>
                  setParams({ ...params, seed: e.target.value ? parseInt(e.target.value) : undefined })
                }
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              />
            </label>
            <label className="flex items-end gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={params.returnRaw}
                onChange={(e) => setParams({ ...params, returnRaw: e.target.checked })}
                className="rounded"
              />
              Return raw data
            </label>
          </div>
        </section>

        {/* Run Button */}
        <div className="flex gap-3">
          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className={`rounded border px-6 py-3 font-medium transition-colors ${
              isRunning
                ? "border-neutral-700 bg-neutral-800 text-neutral-500"
                : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isRunning ? "Running Simulation..." : "Run Simulation"}
          </button>
          
          {result && (
            <>
              <button
                onClick={handleExportJSON}
                className="rounded border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-750"
              >
                Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="rounded border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-750"
              >
                Export CSV
              </button>
            </>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
            <h3 className="mb-2 text-sm font-semibold text-red-400">Errors</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-red-300">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-4">
            <h3 className="mb-2 text-sm font-semibold text-yellow-400">Warnings</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-yellow-300">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Results */}
        {result && result.aggregate && (
          <>
            {/* Metadata */}
            <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-white">Simulation Metadata</h2>
              <div className="grid gap-2 text-sm md:grid-cols-4">
                <div>
                  <span className="text-neutral-400">Seed Used:</span>{" "}
                  <span className="font-mono text-white">{result.metadata.seedUsed}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Compute Time:</span>{" "}
                  <span className="text-white">{result.metadata.computeTimeMs}ms</span>
                </div>
                <div>
                  <span className="text-neutral-400">Runs:</span>{" "}
                  <span className="text-white">{result.metadata.numRuns}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Timesteps:</span>{" "}
                  <span className="text-white">{result.metadata.timesteps}</span>
                </div>
              </div>
            </section>

            {/* 6 Standard Charts */}
            <section className="grid gap-6 lg:grid-cols-2">
              {/* 1. Token Price */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-white">Token Price Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={result.aggregate.map((s) => ({
                      t: s.timestep,
                      mean: s.tokenPrice.mean,
                      upper: s.tokenPrice.mean + s.tokenPrice.std,
                      lower: Math.max(0, s.tokenPrice.mean - s.tokenPrice.std),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="t" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Week", position: "insideBottom", offset: -5, fill: "#9ca3af" }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `$${fmtDec(v, 2)}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                      labelStyle={{ color: "#d1d5db" }}
                      formatter={(value: any) => [`$${fmtDec(value, 2)}`, ""]}
                    />
                    <Area type="monotone" dataKey="upper" fill="#3b82f680" stroke="none" />
                    <Area type="monotone" dataKey="mean" fill="#3b82f6" stroke="#3b82f6" strokeWidth={2} />
                    <Area type="monotone" dataKey="lower" fill="#3b82f680" stroke="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 2. Circulating Supply */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-white">Circulating Supply Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={result.aggregate.map((s) => ({
                      t: s.timestep,
                      mean: s.circulatingSupply.mean,
                      p10: s.circulatingSupply.p10,
                      p90: s.circulatingSupply.p90,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="t" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Week", position: "insideBottom", offset: -5, fill: "#9ca3af" }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                      labelStyle={{ color: "#d1d5db" }}
                      formatter={(value: any) => [fmt(value), ""]}
                    />
                    <Line type="monotone" dataKey="p90" stroke="#6366f150" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="mean" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="p10" stroke="#6366f150" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 3. Demand */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-white">Demand Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={result.aggregate.map((s) => ({
                      t: s.timestep,
                      mean: s.demand.mean,
                      upper: s.demand.mean + s.demand.std,
                      lower: Math.max(0, s.demand.mean - s.demand.std),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="t" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Week", position: "insideBottom", offset: -5, fill: "#9ca3af" }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                      labelStyle={{ color: "#d1d5db" }}
                      formatter={(value: any) => [fmt(value), ""]}
                    />
                    <Area type="monotone" dataKey="upper" fill="#10b98180" stroke="none" />
                    <Area type="monotone" dataKey="mean" fill="#10b981" stroke="#10b981" strokeWidth={2} />
                    <Area type="monotone" dataKey="lower" fill="#10b98180" stroke="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 4. Number of Providers */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-white">Number of Providers Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={result.aggregate.map((s) => ({
                      t: s.timestep,
                      mean: s.numProviders.mean,
                      p10: s.numProviders.p10,
                      p90: s.numProviders.p90,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="t" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Week", position: "insideBottom", offset: -5, fill: "#9ca3af" }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                      labelStyle={{ color: "#d1d5db" }}
                      formatter={(value: any) => [fmt(value), ""]}
                    />
                    <Line type="monotone" dataKey="p90" stroke="#f59e0b50" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="mean" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="p10" stroke="#f59e0b50" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 5. Total Capacity */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-white">Total Capacity Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={result.aggregate.map((s) => ({
                      t: s.timestep,
                      mean: s.totalCapacity.mean,
                      upper: s.totalCapacity.mean + s.totalCapacity.std,
                      lower: Math.max(0, s.totalCapacity.mean - s.totalCapacity.std),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="t" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Week", position: "insideBottom", offset: -5, fill: "#9ca3af" }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                      labelStyle={{ color: "#d1d5db" }}
                      formatter={(value: any) => [fmt(value), ""]}
                    />
                    <Area type="monotone" dataKey="upper" fill="#8b5cf680" stroke="none" />
                    <Area type="monotone" dataKey="mean" fill="#8b5cf6" stroke="#8b5cf6" strokeWidth={2} />
                    <Area type="monotone" dataKey="lower" fill="#8b5cf680" stroke="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 6. Service Price */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-white">Service Price Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={result.aggregate.map((s) => ({
                      t: s.timestep,
                      mean: s.servicePrice.mean,
                      p10: s.servicePrice.p10,
                      p90: s.servicePrice.p90,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="t" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Week", position: "insideBottom", offset: -5, fill: "#9ca3af" }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `$${fmtDec(v, 2)}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                      labelStyle={{ color: "#d1d5db" }}
                      formatter={(value: any) => [`$${fmtDec(value, 2)}`, ""]}
                    />
                    <Line type="monotone" dataKey="p90" stroke="#ec489950" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="mean" stroke="#ec4899" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="p10" stroke="#ec489950" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Advanced Visualizations */}
            <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Advanced Visualizations</h2>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showAdvanced ? "Hide" : "Show"}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-6">
                  {/* Spaghetti Plot */}
                  {params.returnRaw && result.runs && (
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="text-sm font-medium text-white">Spaghetti Plot (Per-Run Traces)</h3>
                        <select
                          value={spaghettiMetric}
                          onChange={(e) => {
                            setSpaghettiMetric(e.target.value);
                            setShowSpaghettiPlot(true);
                          }}
                          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-white"
                        >
                          <option value="tokenPrice">Token Price</option>
                          <option value="circulatingSupply">Circulating Supply</option>
                          <option value="demand">Demand</option>
                          <option value="numProviders">Number of Providers</option>
                          <option value="totalCapacity">Total Capacity</option>
                          <option value="servicePrice">Service Price</option>
                        </select>
                      </div>
                      {showSpaghettiPlot && spaghettiData && (
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart
                            data={spaghettiData}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="timestep" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                            <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                              labelStyle={{ color: "#d1d5db" }}
                            />
                            {Array.from(new Set(spaghettiData.map((d) => d.runId))).map((runId) => (
                              <Line
                                key={runId}
                                type="monotone"
                                dataKey="value"
                                data={spaghettiData.filter((d) => d.runId === runId)}
                                stroke={`hsl(${(runId * 360) / result.runs!.length}, 70%, 60%)`}
                                strokeWidth={1}
                                dot={false}
                                opacity={0.3}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}

                  {/* Histograms */}
                  {params.returnRaw && histogramData && (
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Token Price Histogram */}
                      <div>
                        <h3 className="mb-3 text-sm font-medium text-white">Final Token Price Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={histogramData.tokenPrice}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="bin" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(v) => `$${fmtDec(v, 1)}`} />
                            <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                              labelStyle={{ color: "#d1d5db" }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Circulating Supply Histogram */}
                      <div>
                        <h3 className="mb-3 text-sm font-medium text-white">Final Supply Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={histogramData.circulatingSupply}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="bin" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                            <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                              labelStyle={{ color: "#d1d5db" }}
                            />
                            <Bar dataKey="count" fill="#6366f1" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Providers Histogram */}
                      <div>
                        <h3 className="mb-3 text-sm font-medium text-white">Final Providers Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={histogramData.numProviders}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="bin" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                            <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
                              labelStyle={{ color: "#d1d5db" }}
                            />
                            <Bar dataKey="count" fill="#f59e0b" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

