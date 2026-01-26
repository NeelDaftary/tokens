"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StakingModel, StakingOutputs } from "@/types/staking";
import { runStressTest } from "@/lib/stakingEngine";

interface StepResultsProps {
  model: StakingModel;
  outputs: StakingOutputs;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

export default function StepResults({ model, outputs }: StepResultsProps) {
  const realAPY = outputs.metadata.avgRealAPY * 100;
  
  // Benchmark comparison
  const benchmarks = [
    { name: "US Treasury (10Y)", rate: 4.5, color: "text-slate-400", bg: "bg-slate-500" },
    { name: "USDC Lending", rate: 5.0, color: "text-blue-400", bg: "bg-blue-500" },
    { name: "ETH Staking", rate: 3.5, color: "text-purple-400", bg: "bg-purple-500" },
    { name: "SOL Staking", rate: 7.0, color: "text-green-400", bg: "bg-green-500" },
    { name: "Your Real APY", rate: realAPY, color: "text-cyan-400", bg: "bg-cyan-500", highlight: true },
  ].sort((a, b) => b.rate - a.rate);
  
  const maxRate = Math.max(...benchmarks.map(b => b.rate), 10);
  const competitiveCount = benchmarks.filter(b => !b.highlight && realAPY > b.rate).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Results Dashboard</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Analysis of your staking program based on the configured parameters.
        </p>
      </div>

      {/* Key Metrics */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Key Metrics</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Final Staking Ratio"
            value={fmtPct(outputs.metadata.finalStakingRatio)}
            subtext="of circulating supply"
            color="text-blue-400"
          />
          <MetricCard
            label="Advertised APR"
            value={fmtPct(outputs.metadata.avgNetAPR)}
            subtext="what most projects show"
            color="text-yellow-400"
          />
          <MetricCard
            label="Real APY"
            value={fmtPct(outputs.metadata.avgRealAPY)}
            subtext="after inflation dilution"
            color="text-cyan-400"
            highlight
          />
          <MetricCard
            label="Fee Coverage"
            value={`${outputs.metadata.avgFeeCoverage.toFixed(1)}%`}
            subtext="rewards from fees"
            color="text-green-400"
          />
        </div>
      </section>

      {/* Yield Comparison */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Yield Comparison</h3>
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">
              {competitiveCount === 4 ? "🏆" : competitiveCount >= 2 ? "✅" : competitiveCount >= 1 ? "⚠️" : "❌"}
            </span>
            <span className={`text-sm font-medium ${
              competitiveCount === 4 ? "text-green-400" 
              : competitiveCount >= 2 ? "text-cyan-400" 
              : competitiveCount >= 1 ? "text-yellow-400" 
              : "text-red-400"
            }`}>
              {competitiveCount === 4 ? "Excellent - Beats all benchmarks" 
               : competitiveCount >= 2 ? "Competitive - Beats most alternatives" 
               : competitiveCount >= 1 ? "Moderate - Beats some alternatives" 
               : "Below market - May struggle to attract capital"}
            </span>
          </div>
          
          <div className="space-y-3">
            {benchmarks.map((benchmark, idx) => (
              <div key={idx} className={benchmark.highlight ? 'p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30' : ''}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-medium ${benchmark.color}`}>
                    {benchmark.name} {benchmark.highlight && '✨'}
                  </span>
                  <span className={`text-xs font-mono ${benchmark.color}`}>
                    {benchmark.rate.toFixed(2)}%
                  </span>
                </div>
                <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${benchmark.bg} ${benchmark.highlight ? 'opacity-100' : 'opacity-60'} rounded-full`}
                    style={{ width: `${Math.max(0, (benchmark.rate / maxRate) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Staking Ratio Chart */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Staking Ratio Over Time</h3>
        <div className="h-[280px] p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={outputs.steps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="t" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis 
                stroke="#9ca3af" 
                tick={{ fill: "#9ca3af", fontSize: 11 }} 
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#d1d5db" }}
                formatter={(v: any) => [`${(v * 100).toFixed(2)}%`, ""]}
              />
              <Legend />
              <Line type="monotone" dataKey="stakingRatio" stroke="#3b82f6" name="Actual" strokeWidth={2} />
              <Line type="monotone" dataKey="targetStakingRatio" stroke="#10b981" name="Target" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* APR vs Real APY Chart */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Advertised APR vs Real APY</h3>
        <div className="h-[280px] p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={outputs.steps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="t" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis 
                stroke="#9ca3af" 
                tick={{ fill: "#9ca3af", fontSize: 11 }} 
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#d1d5db" }}
                formatter={(v: any) => [`${(v * 100).toFixed(2)}%`, ""]}
              />
              <Legend />
              <Line type="monotone" dataKey="netAPR" stroke="#eab308" name="Net APR (Advertised)" strokeWidth={2} />
              <Line type="monotone" dataKey="realAPY" stroke="#22d3ee" name="Real APY" strokeWidth={3} />
              <Line type="monotone" dataKey="inflationDragPct" stroke="#f97316" name="Inflation Drag" strokeWidth={1} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Cohorts */}
      {outputs.cohorts.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-white">Cohort Yields</h3>
          <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-left text-xs text-neutral-400">
                  <th className="px-4 py-3">Cohort</th>
                  <th className="px-4 py-3">Net APR</th>
                  <th className="px-4 py-3">Participation</th>
                </tr>
              </thead>
              <tbody>
                {outputs.cohorts.map((cohort, idx) => (
                  <tr key={idx} className="border-b border-white/[0.06]">
                    <td className="px-4 py-3 text-white">{cohort.cohort}</td>
                    <td className="px-4 py-3 text-green-400">{fmtPct(cohort.netAPR)}</td>
                    <td className="px-4 py-3 text-neutral-300">{fmtPct(cohort.participationPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Stress Tests */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-white">Stress Tests</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["rate_hike", "fee_drawdown", "price_crash", "slash_event"] as const).map((testType) => (
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
              className="px-4 py-3 rounded-lg text-sm bg-white/[0.03] border border-white/[0.08] text-neutral-300 hover:bg-white/[0.06] hover:text-white transition-all"
            >
              {testType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  color,
  highlight,
}: {
  label: string;
  value: string;
  subtext: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`
      p-4 rounded-lg
      ${highlight 
        ? "bg-cyan-500/10 border border-cyan-500/30" 
        : "bg-white/[0.02] border border-white/[0.06]"
      }
    `}>
      <div className="text-xs text-neutral-400 uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-neutral-500">{subtext}</div>
    </div>
  );
}
