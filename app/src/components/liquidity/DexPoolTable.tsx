"use client";

import { useState } from "react";
import type { DexPoolPlan, PoolType, QuoteAssetType, LiquidityBand } from "@/types/liquidity";
import { DEFAULT_DEPTH_TARGETS } from "@/types/liquidity";
import V2LiquidityHeatmap from "./V2LiquidityHeatmap";
import CLMMChart from "./CLMMChart";
import DepthTargetsEditor from "./DepthTargetsEditor";

type Props = {
  pools: DexPoolPlan[];
  onChange: (pools: DexPoolPlan[]) => void;
};

const POOL_TYPES: PoolType[] = ["V2", "CLMM", "CLOB"];
const QUOTE_ASSETS: QuoteAssetType[] = ["Stable", "ETH", "SOL", "OtherVolatile"];

export default function DexPoolTable({ pools, onChange }: Props) {
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);

  const handleAdd = () => {
    const newPool: DexPoolPlan = {
      id: `pool${Date.now()}`,
      poolType: "V2",
      chain: "EVM",
      quoteAssetType: "Stable",
      dexBudgetSharePct: 0,
      primaryPool: pools.length === 0,
      // Defaults
      slippageBps: 50,
      transactionSizeUsd: 10000,
      liquidityBands: [{ minPrice: 0.95, maxPrice: 1.05, amountUsd: 10000, enabled: true }],
      clobDepthBps: 200,
      clobDepthTargets: DEFAULT_DEPTH_TARGETS,
    };
    onChange([...pools, newPool]);
  };

  const handleRemove = (index: number) => {
    const updated = pools.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((p) => p.primaryPool)) {
      updated[0].primaryPool = true;
    }
    onChange(updated);
  };

  const handleChange = (index: number, field: keyof DexPoolPlan, value: any) => {
    const updated = [...pools];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "primaryPool" && value === true) {
      updated.forEach((p, i) => {
        if (i !== index) p.primaryPool = false;
      });
    }

    onChange(updated);
  };

  const handleBandChange = (poolIndex: number, bands: LiquidityBand[]) => {
    const updated = [...pools];
    updated[poolIndex] = { ...updated[poolIndex], liquidityBands: bands };
    onChange(updated);
  };

  const totalShare = pools.reduce((sum, p) => sum + p.dexBudgetSharePct, 0);
  const isValid = Math.abs(totalShare - 100) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handleAdd}
          className="btn-secondary btn-sm"
        >
          + Add pool
        </button>
        {!isValid && pools.length > 0 && (
          <span className="text-xs font-medium text-red-400">
            Budget shares must sum to 100% (current: {totalShare.toFixed(1)}%)
          </span>
        )}
        {isValid && pools.length > 0 && (
          <span className="text-xs text-green-400">✓ Shares sum to 100%</span>
        )}
      </div>

      {pools.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/[0.1] p-8 text-center text-sm text-slate-400">
          No DEX pools yet. Click "+ Add pool" to get started.
        </div>
      )}

      {pools.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs text-white">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-300">
                <th className="px-2 py-2">Actions</th>
                <th className="px-2 py-2">Pool Type</th>
                <th className="px-2 py-2">Chain</th>
                <th className="px-2 py-2">Quote Asset</th>
                <th className="px-2 py-2">Budget %</th>
                <th className="px-2 py-2">Primary</th>
                <th className="px-2 py-2 w-20">Settings</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool, idx) => (
                <>
                  <tr key={pool.id} className="border-b border-white/[0.06] bg-[rgba(15,20,28,0.3)]">
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleRemove(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={pool.poolType}
                        onChange={(e) =>
                          handleChange(idx, "poolType", e.target.value)
                        }
                        className="input-glass text-sm"
                      >
                        {POOL_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={pool.chain}
                        onChange={(e) =>
                          handleChange(idx, "chain", e.target.value)
                        }
                        className="input-glass text-sm"
                      >
                        <option value="EVM">EVM</option>
                        <option value="Solana">Solana</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={pool.quoteAssetType}
                        onChange={(e) =>
                          handleChange(idx, "quoteAssetType", e.target.value)
                        }
                        className="input-glass text-sm"
                      >
                        {QUOTE_ASSETS.map((asset) => (
                          <option key={asset} value={asset}>
                            {asset}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={pool.dexBudgetSharePct || ""}
                        onChange={(e) =>
                          handleChange(
                            idx,
                            "dexBudgetSharePct",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-16 input-glass text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={pool.primaryPool}
                        onChange={(e) =>
                          handleChange(idx, "primaryPool", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-white/[0.1] bg-[rgba(15,20,28,0.5)] text-cyan-400 accent-cyan-400"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => setExpandedPoolId(expandedPoolId === pool.id ? null : pool.id)}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {expandedPoolId === pool.id ? "Close" : "Config"}
                      </button>
                    </td>
                  </tr>
                  {expandedPoolId === pool.id && (
                    <tr className="bg-[rgba(15,20,28,0.5)]">
                      <td colSpan={7} className="p-4 border-b border-white/[0.06]">

                        {/* V2 CONFIG */}
                        {pool.poolType === "V2" && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-white text-sm">V2 Pool Configuration</h4>
                            <div className="flex gap-6">
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-neutral-400">Target Slippage (bps)</span>
                                <input
                                  type="number"
                                  value={pool.slippageBps || 50}
                                  onChange={(e) => handleChange(idx, "slippageBps", parseInt(e.target.value))}
                                  className="input-glass text-sm w-32"
                                />
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-neutral-400">Tx Size ($)</span>
                                <input
                                  type="number"
                                  value={pool.transactionSizeUsd || 10000}
                                  onChange={(e) => handleChange(idx, "transactionSizeUsd", parseInt(e.target.value))}
                                  className="input-glass text-sm w-32"
                                />
                              </label>
                            </div>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-neutral-400">LP Fee (%)</span>
                              <input
                                type="number"
                                step="0.01"
                                value={pool.lpFeePct !== undefined ? pool.lpFeePct * 100 : 0.3}
                                onChange={(e) => handleChange(idx, "lpFeePct", parseFloat(e.target.value) / 100)}
                                className="input-glass text-sm w-24"
                              />
                            </label>

                            {/* Heatmap visualization */}
                            <div className="mt-4">
                              <V2LiquidityHeatmap lpFeePct={pool.lpFeePct ?? 0.003} />
                            </div>
                          </div>
                        )}

                        {/* CLMM CONFIG */}
                        {pool.poolType === "CLMM" && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-white text-sm">CLMM Liquidity Bands</h4>
                            <div className="space-y-2">
                              {(pool.liquidityBands || []).map((band, bIdx) => (
                                <div key={bIdx} className="flex items-center gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={band.enabled}
                                    onChange={(e) => {
                                      const newBands = [...(pool.liquidityBands || [])];
                                      newBands[bIdx].enabled = e.target.checked;
                                      handleBandChange(idx, newBands);
                                    }}
                                  />
                                  <span>Range:</span>
                                  <input
                                    type="number" step="0.01"
                                    value={band.minPrice}
                                    onChange={(e) => {
                                      const newBands = [...(pool.liquidityBands || [])];
                                      newBands[bIdx].minPrice = parseFloat(e.target.value);
                                      handleBandChange(idx, newBands);
                                    }}
                                    className="w-16 input-glass text-sm"
                                  />
                                  <span>to</span>
                                  <input
                                    type="number" step="0.01"
                                    value={band.maxPrice}
                                    onChange={(e) => {
                                      const newBands = [...(pool.liquidityBands || [])];
                                      newBands[bIdx].maxPrice = parseFloat(e.target.value);
                                      handleBandChange(idx, newBands);
                                    }}
                                    className="w-16 input-glass text-sm"
                                  />
                                  <span>Price</span>
                                  <span>| Depth: $</span>
                                  <input
                                    type="number"
                                    value={band.amountUsd}
                                    onChange={(e) => {
                                      const newBands = [...(pool.liquidityBands || [])];
                                      newBands[bIdx].amountUsd = parseFloat(e.target.value);
                                      handleBandChange(idx, newBands);
                                    }}
                                    className="w-20 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-white"
                                  />
                                  <button
                                    onClick={() => {
                                      const newBands = (pool.liquidityBands || []).filter((_, i) => i !== bIdx);
                                      handleBandChange(idx, newBands);
                                    }}
                                    className="text-red-400 ml-2"
                                  >✕</button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const newBands = [...(pool.liquidityBands || []), { minPrice: 0.9, maxPrice: 1.1, amountUsd: 10000, enabled: true }];
                                  handleBandChange(idx, newBands);
                                }}
                                className="text-blue-400 text-xs hover:underline"
                              >+ Add Band</button>
                              {/* CLMM Chart */}
                              <div className="h-48 w-full mt-4 bg-neutral-950 rounded border border-neutral-800 p-2">
                                <CLMMChart bands={pool.liquidityBands || []} />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CLOB CONFIG */}
                        {pool.poolType === "CLOB" && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-white text-sm">CLOB Configuration</h4>
                            <div className="rounded border border-neutral-800 bg-neutral-900/50 p-2">
                              <DepthTargetsEditor
                                targets={pool.clobDepthTargets || DEFAULT_DEPTH_TARGETS}
                                onChange={(newTargets) => handleChange(idx, "clobDepthTargets", newTargets)}
                              />
                            </div>
                          </div>
                        )}
                      </td >
                    </tr >
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div >
      )
      }

      {
        pools.length > 1 && (
          <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-3 text-xs text-yellow-400">
            ⚠️ Splitting onchain liquidity across multiple pools increases
            required inventory to achieve the same depth near mid.
          </div>
        )
      }
    </div >
  );
}

