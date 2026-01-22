"use client";

import { useState, useEffect, useRef } from "react";
import type { DePINConfig, SimulationParams, SimulationResult } from "@/types/depin";
import { runDePINSimulation } from "@/lib/depinSimulation";
import { aggregateSimulationRuns, validateDePINConfig, checkForWarnings } from "@/lib/depinAggregation";
import { DEPIN_SCENARIOS, DEMAND_PRESETS, MACRO_PRESETS } from "@/data/presets/depinPresets";
import NumberInput from "@/components/depin/NumberInput";
import ConfigSection from "@/components/depin/ConfigSection";
import DePINChart from "@/components/depin/DePINChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const fmtDec = (n: number, decimals: number = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);

export default function DePINPage() {
  const [config, setConfig] = useState<DePINConfig>(DEPIN_SCENARIOS[0].config);
  const [params, setParams] = useState<SimulationParams>({
    timesteps: 12, // Start with just 12 weeks for testing
    runs: 5, // Start with just 5 runs for testing
    returnRaw: true, // MUST be true for aggregation to work!
  });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState<string>("");
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when simulation completes
  useEffect(() => {
    if (!isRunning && result && result.aggregate && result.aggregate.length > 0) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isRunning, result]);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setErrors([]);
    setWarnings([]);
    setProgress("Validating configuration...");

    // Check for performance-intensive simulations
    const totalComputations = params.runs * params.timesteps;
    const performanceWarnings: string[] = [];
    
    if (totalComputations > 500) {
      performanceWarnings.push(
        `⚠️ Large simulation: ${params.runs} runs × ${params.timesteps} steps = ${totalComputations} computations. This may take 10-30 seconds.`
      );
    }
    
    if (totalComputations > 2000) {
      setErrors([
        `Simulation too large: ${totalComputations} total computations exceeds maximum of 2000. ` +
        `Please reduce runs or timesteps (e.g., max 40 runs × 50 weeks = 2000).`
      ]);
      setIsRunning(false);
      setProgress("");
      return;
    }

    // Validate config
    const validation = validateDePINConfig(config);
    if (!validation.valid) {
      setErrors(validation.errors.map((e) => `${e.field}: ${e.message}`));
      setIsRunning(false);
      setProgress("");
      return;
    }

    try {
      // Run simulation in a setTimeout to allow UI to update
      setTimeout(() => {
        try {
          if (performanceWarnings.length > 0) {
            setWarnings(performanceWarnings);
          }
          
          setProgress(`Running ${params.runs} simulations (${params.timesteps} weeks each)...`);
          const startTime = Date.now();
          const rawResult = runDePINSimulation(config, params);
          const runTime = Date.now() - startTime;
          console.log(`Simulation completed in ${runTime}ms`);
          
          setProgress("Aggregating results...");
          const aggregatedResult = aggregateSimulationRuns(rawResult);
          setResult(aggregatedResult);
          
          setProgress("Checking for warnings...");
          const simWarnings = checkForWarnings(aggregatedResult);
          setWarnings([...performanceWarnings, ...simWarnings]);
          
          setIsRunning(false);
          setProgress("");
        } catch (innerError: any) {
          console.error("Simulation error:", innerError);
          setErrors([
            `Simulation failed: ${innerError.message || innerError}`,
            `This may be due to memory constraints. Try reducing runs (${params.runs}) or timesteps (${params.timesteps}).`
          ]);
          setIsRunning(false);
          setProgress("");
        }
      }, 100);
    } catch (error: any) {
      console.error("Simulation error:", error);
      setErrors([
        `Simulation failed: ${error.message || error}`,
        `This may be due to memory constraints. Try reducing runs (${params.runs}) or timesteps (${params.timesteps}).`
      ]);
      setIsRunning(false);
      setProgress("");
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


  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#06080D] text-slate-50">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="btn-ghost text-xs"
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
        <section className="glass-card p-5">
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
                    : "border-white/[0.1] bg-[rgba(15,20,28,0.5)] hover:border-cyan-500/30"
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
          <ConfigSection title="Token Parameters">
            <NumberInput
              label="Initial Supply"
              value={config.initialSupply}
              onChange={(v) => setConfig({ ...config, initialSupply: v })}
            />
            <NumberInput
              label="Initial Token Price ($)"
              value={config.initialTokenPrice}
              onChange={(v) => setConfig({ ...config, initialTokenPrice: v })}
              step="0.01"
            />
            <NumberInput
              label="Initial Service Price ($)"
              value={config.initialServicePrice}
              onChange={(v) => setConfig({ ...config, initialServicePrice: v })}
              step="0.1"
            />
          </ConfigSection>

          {/* Demand Configuration */}
          <ConfigSection title="Demand Configuration">
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Demand Type
              <select
                value={config.demandType}
                onChange={(e) => setConfig({ ...config, demandType: e.target.value as any })}
                className="input-glass"
              >
                {Object.entries(DEMAND_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.name}</option>
                ))}
              </select>
            </label>
            <NumberInput
              label="Base Demand (units)"
              value={config.demandParams.baseDemand}
              onChange={(v) => setConfig({ ...config, demandParams: { ...config.demandParams, baseDemand: v } })}
            />
            <NumberInput
              label="Price Elasticity"
              value={config.demandParams.priceElasticity}
              onChange={(v) => setConfig({ ...config, demandParams: { ...config.demandParams, priceElasticity: v } })}
              step="0.1"
            />
          </ConfigSection>

          {/* Macro Configuration */}
          <ConfigSection title="Macro Configuration">
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Macro Condition
              <select
                value={config.macroCondition}
                onChange={(e) => setConfig({ ...config, macroCondition: e.target.value as any })}
                className="input-glass"
              >
                {Object.entries(MACRO_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.name}</option>
                ))}
              </select>
            </label>
            <NumberInput
              label="Macro Sensitivity"
              value={config.macroSensitivity}
              onChange={(v) => setConfig({ ...config, macroSensitivity: v })}
              step="0.05"
            />
          </ConfigSection>

          {/* Protocol Parameters */}
          <ConfigSection title="Protocol Parameters">
            <NumberInput
              label="Max Mint per Period"
              value={config.protocolParams.maxMint}
              onChange={(v) => setConfig({ ...config, protocolParams: { ...config.protocolParams, maxMint: v } })}
            />
            <NumberInput
              label="Percent Burned (0-1)"
              value={config.protocolParams.percentBurned}
              onChange={(v) => setConfig({ ...config, protocolParams: { ...config.protocolParams, percentBurned: v } })}
              step="0.05"
              min={0}
              max={1}
            />
          </ConfigSection>
        </div>

        {/* Simulation Settings */}
        <ConfigSection title="Simulation Settings" columns={3}>
          <div className="flex flex-col gap-1">
            <NumberInput
              label="Timesteps (weeks) - Max 52 recommended"
              value={params.timesteps}
              onChange={(v) => setParams({ ...params, timesteps: Math.max(1, Math.min(100, Math.floor(v))) })}
              min={1}
              max={100}
            />
            {params.timesteps > 52 && (
              <span className="text-xs text-yellow-400">⚠️ {params.timesteps} weeks may slow down simulation</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <NumberInput
              label="Number of Runs - Max 20 recommended"
              value={params.runs}
              onChange={(v) => setParams({ ...params, runs: Math.max(1, Math.min(50, Math.floor(v))) })}
              min={1}
              max={50}
            />
            {params.runs > 20 && (
              <span className="text-xs text-yellow-400">⚠️ {params.runs} runs may slow down simulation</span>
            )}
          </div>
          <NumberInput
            label="Random Seed (optional)"
            value={params.seed || 0}
            onChange={(v) => setParams({ ...params, seed: v || undefined })}
            placeholder="Random"
          />
        </ConfigSection>
        
        {/* Performance Warning */}
        {params.runs * params.timesteps > 500 && (
          <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-yellow-300">
                Large simulation: {params.runs} runs × {params.timesteps} weeks = {params.runs * params.timesteps} computations. This may take 10-30 seconds.
              </span>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {isRunning && progress && (
          <div className="rounded-lg border border-blue-800 bg-blue-900/20 p-4">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-blue-300">{progress}</span>
            </div>
          </div>
        )}

        {/* Run Button */}
        <div className="flex gap-3">
          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className={`relative rounded border px-6 py-3 font-medium transition-colors ${
              isRunning
                ? "border-white/[0.06] bg-[rgba(15,20,28,0.3)] text-slate-500"
                : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isRunning && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            )}
            <span className={isRunning ? "ml-6" : ""}>
              {isRunning ? "Running Simulation..." : "Run Simulation"}
            </span>
          </button>
          
          {result && (
            <>
              <button
                onClick={handleExportJSON}
                className="btn-primary"
              >
                Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="btn-primary"
              >
                Export CSV
              </button>
            </>
          )}
        </div>

        {/* Progress Indicator */}
        {isRunning && progress && (
          <div className="rounded-lg border border-blue-800 bg-blue-900/20 p-4">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-blue-300">{progress}</span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {!isRunning && result && result.aggregate && result.aggregate.length > 0 && (
          <div ref={resultsRef} className="rounded-lg border border-green-800 bg-green-900/20 p-4">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-300">
                ✓ Simulation complete! Generated {result.aggregate.length} timesteps across {result.runs?.length || params.runs} runs in {result.metadata.computeTimeMs}ms. Scroll down to see charts.
              </span>
            </div>
          </div>
        )}

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

        {/* No Results Yet */}
        {!result && !isRunning && errors.length === 0 && (
          <div className="glass-surface p-8 text-center">
            <div className="mx-auto mb-3 h-12 w-12 text-neutral-600">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-base font-medium text-neutral-300">No Simulation Results Yet</h3>
            <p className="text-sm text-neutral-500">
              Click "Run Simulation" above to generate DePIN token economics projections.
            </p>
          </div>
        )}

        {/* Results */}
        {result && result.aggregate && result.aggregate.length > 0 && (
          <>
            {/* Metadata */}
            <section className="glass-card p-5">
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
              <DePINChart
                title="Token Price Over Time"
                data={result.aggregate}
                metric="tokenPrice"
                color="#3b82f6"
                type="area"
                formatter={(v) => `$${fmtDec(v, 2)}`}
              />
              <DePINChart
                title="Circulating Supply Over Time"
                data={result.aggregate}
                metric="circulatingSupply"
                color="#6366f1"
                type="line"
              />
              <DePINChart
                title="Demand Over Time"
                data={result.aggregate}
                metric="demand"
                color="#10b981"
                type="area"
              />
              <DePINChart
                title="Number of Providers Over Time"
                data={result.aggregate}
                metric="numProviders"
                color="#f59e0b"
                type="line"
              />
              <DePINChart
                title="Total Capacity Over Time"
                data={result.aggregate}
                metric="totalCapacity"
                color="#8b5cf6"
                type="area"
              />
              <DePINChart
                title="Service Price Over Time"
                data={result.aggregate}
                metric="servicePrice"
                color="#ec4899"
                type="line"
                formatter={(v) => `$${fmtDec(v, 2)}`}
              />
            </section>

          </>
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}

