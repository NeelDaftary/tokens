"use client";

import { SellPressureConfig } from "@/types/demand";
import { SELL_PRESSURE_PRESETS } from "@/types/demand";

interface SellPressureTableProps {
  configs: SellPressureConfig[];
  totalSupply: number;
  onUpdateConfig: (index: number, updates: Partial<SellPressureConfig>) => void;
  distributionColors: string[];
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(0);
}

export default function SellPressureTable({
  configs,
  totalSupply,
  onUpdateConfig,
  distributionColors,
}: SellPressureTableProps) {
  const handlePresetChange = (index: number, preset: string) => {
    const presetKey = preset as keyof typeof SELL_PRESSURE_PRESETS;
    const presetDef = SELL_PRESSURE_PRESETS[presetKey];
    
    onUpdateConfig(index, {
      preset: presetKey,
      customSellPct: null, // Reset custom percentage when preset changes
    });
  };

  const handleCostBasisChange = (index: number, costBasis: number) => {
    const config = configs[index];
    const newImpliedFdv = costBasis > 0 && totalSupply > 0 ? costBasis * totalSupply : null;
    
    onUpdateConfig(index, {
      costBasisUsd: costBasis,
      impliedFdv: config.impliedFdvManual ? config.impliedFdv : newImpliedFdv,
    });
  };

  const handleImpliedFdvChange = (index: number, fdv: number) => {
    onUpdateConfig(index, {
      impliedFdv: fdv,
      impliedFdvManual: true,
    });
  };

  const handleToggleEnabled = (index: number, enabled: boolean) => {
    onUpdateConfig(index, { enabled });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/[0.08]">
            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
              Group Name/Allocation %
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
              Cost Basis Tokens
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
              Implied FDV
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
              Type of Sell Pressure
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
              Potential Source of Sell Pressure
            </th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config, idx) => {
            const color = distributionColors[idx % distributionColors.length];
            const impliedFdvDisplay = config.impliedFdv 
              ? `$ ${formatLargeNumber(config.impliedFdv)}`
              : "$ 0";
            
            return (
              <tr
                key={config.groupId}
                className={`border-b border-white/[0.06] ${
                  !config.enabled ? "opacity-50" : ""
                }`}
              >
                {/* Group Name / Allocation % */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-1 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {config.groupName}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Cost Basis */}
                <td className="px-4 py-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none z-10">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.0001"
                      value={config.costBasisUsd || ""}
                      onChange={(e) =>
                        handleCostBasisChange(idx, parseFloat(e.target.value) || 0)
                      }
                      disabled={!config.enabled}
                      className="input-glass focus:border-cyan-500"
                      style={{ paddingLeft: '2rem' }}
                      placeholder="0"
                    />
                  </div>
                </td>

                {/* Implied FDV */}
                <td className="px-4 py-3">
                  <div className="glass-surface px-4 py-2 text-sm text-slate-400">
                    {impliedFdvDisplay}
                  </div>
                </td>

                {/* Type of Sell Pressure */}
                <td className="px-4 py-3">
                  <select
                    value={config.preset}
                    onChange={(e) => handlePresetChange(idx, e.target.value)}
                    disabled={!config.enabled}
                    className="select-glass cursor-pointer focus:border-cyan-500"
                  >
                    {Object.entries(SELL_PRESSURE_PRESETS).map(([key, def]) => (
                      <option key={key} value={key}>
                        {def.label}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Potential Source of Sell Pressure */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleEnabled(idx, !config.enabled)}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      config.enabled
                        ? "bg-green-900/30 text-green-400"
                        : "bg-red-900/30 text-red-400"
                    }`}
                  >
                    {config.enabled ? (
                      <>
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Yes
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        No
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

