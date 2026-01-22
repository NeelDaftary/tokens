"use client";

import { useState } from "react";
import type { DemandSourceConfig, DemandMode } from "@/types/demand";

interface DemandSourceCardProps {
  source: DemandSourceConfig;
  onUpdate: (updated: DemandSourceConfig) => void;
  onToggle: (enabled: boolean) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  buybacks: "Token Buybacks",
  staking: "Staking",
  locking: "Locking for Yield",
  token_gated: "Token Gated Features",
  payment: "Payment Token",
  collateral: "Collateral in DeFi",
  fee_discounts: "Fee Discounts",
  bonding_curve: "Bonding Curve Lockups",
  gas: "Gas Token",
};

export default function DemandSourceCard({ source, onUpdate, onToggle }: DemandSourceCardProps) {
  const [mode, setMode] = useState<DemandMode>(source.mode);

  const handleModeToggle = () => {
    const newMode: DemandMode = mode === "simple" ? "advanced" : "simple";
    setMode(newMode);
    onUpdate({ ...source, mode: newMode });
  };

  const handleConfigUpdate = (field: string, value: any) => {
    onUpdate({
      ...source,
      config: { ...source.config, [field]: value } as any,
    } as DemandSourceConfig);
  };

  const renderSimpleForm = () => {
    switch (source.type) {
      case "buybacks":
        return (
          <div className="space-y-4">
            {/* Revenue Model Selector */}
            <div className="space-y-2">
              <label className="text-label">Revenue Model</label>
              <select
                className="select-glass"
                value={(source.config as any).revenueModel || "target_end"}
                onChange={(e) => handleConfigUpdate("revenueModel", e.target.value)}
              >
                <option value="target_end">Target End Revenue</option>
                <option value="initial_growth">Initial + Growth</option>
                <option value="ramp_peak">Ramp → Peak → Stabilize</option>
              </select>
            </div>

            {/* Global Params */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Buyback Share (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={(source.config as any).buybackShare || 0}
                  onChange={(e) => handleConfigUpdate("buybackShare", parseFloat(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Burn Share (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={(source.config as any).burnShare || 0}
                  onChange={(e) => handleConfigUpdate("burnShare", parseFloat(e.target.value))}
                />
              </label>
            </div>

            <div className="border-t border-white/[0.06] pt-3">
              {/* Model Specific Inputs */}
              {(source.config as any).revenueModel === "target_end" || !(source.config as any).revenueModel ? (
                <div className="space-y-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Target End Revenue (USD/mo)</span>
                    <input
                      type="number"
                      className="input-glass"
                      value={(source.config as any).targetEndRevenue || 0}
                      onChange={(e) => handleConfigUpdate("targetEndRevenue", parseFloat(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Adoption Speed</span>
                    <select
                      className="input-glass"
                      value={(source.config as any).adoptionSpeed || "medium"}
                      onChange={(e) => handleConfigUpdate("adoptionSpeed", e.target.value)}
                    >
                      <option value="slow">Slow</option>
                      <option value="medium">Medium</option>
                      <option value="fast">Fast</option>
                    </select>
                  </label>
                </div>
              ) : (source.config as any).revenueModel === "initial_growth" ? (
                <div className="space-y-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Initial Revenue (USD/mo)</span>
                    <input
                      type="number"
                      className="input-glass"
                      value={(source.config as any).initialRevenue || 0}
                      onChange={(e) => handleConfigUpdate("initialRevenue", parseFloat(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Monthly Growth Rate (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      className="input-glass"
                      value={(source.config as any).growthRate || 0}
                      onChange={(e) => handleConfigUpdate("growthRate", parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-300">Peak Revenue</span>
                      <input
                        type="number"
                        className="input-glass"
                        value={(source.config as any).peakRevenue || 0}
                        onChange={(e) => handleConfigUpdate("peakRevenue", parseFloat(e.target.value))}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-300">Floor Revenue</span>
                      <input
                        type="number"
                        className="input-glass"
                        value={(source.config as any).floorRevenue || 0}
                        onChange={(e) => handleConfigUpdate("floorRevenue", parseFloat(e.target.value))}
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-300">Curve Shape (Peak Time / Decay)</span>
                      <span className="text-xs text-slate-400">{((source.config as any).curveShape || 0.5).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full accent-cyan-400"
                      value={(source.config as any).curveShape || 0.5}
                      onChange={(e) => handleConfigUpdate("curveShape", parseFloat(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 px-1">
                      <span>Late/Slow</span>
                      <span>Early/Fast</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        );

      case "staking":
        const stakingConfig = source.config as any;
        const rewardMechanism = stakingConfig.rewardMechanism || "emissions";
        
        return (
          <div className="space-y-4">
            {/* Staking Demand Parameters */}
            <div className="space-y-3">
              <label className="text-label">Staking Demand</label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Max Staking Ratio (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={stakingConfig.f_max || 0}
                  onChange={(e) => handleConfigUpdate("f_max", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Maximum % of circulating supply that becomes staked</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Adoption Speed</span>
                <select
                  className="input-glass"
                  value={stakingConfig.adoptionSpeed || "medium"}
                  onChange={(e) => handleConfigUpdate("adoptionSpeed", e.target.value)}
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Market Buy Share (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={stakingConfig.marketBuyShare ?? 50}
                  onChange={(e) => handleConfigUpdate("marketBuyShare", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Fraction of new staking bought from market (vs existing holdings)</span>
              </label>
            </div>

            <div className="border-t border-white/[0.06] pt-3">
              {/* Reward Mechanism Selector */}
              <div className="space-y-2 mb-3">
                <label className="text-label">Reward Mechanism</label>
                <select
                  className="select-glass"
                  value={rewardMechanism}
                  onChange={(e) => handleConfigUpdate("rewardMechanism", e.target.value)}
                >
                  <option value="emissions">Emissions (Token Minting)</option>
                  <option value="revenue_share">Revenue Share (Fee Distribution)</option>
                </select>
              </div>

              {/* Emissions Branch */}
              {rewardMechanism === "emissions" && (
                <div className="space-y-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Emission Schedule</span>
                    <select
                      className="input-glass"
                      value={stakingConfig.emissionSchedule || "medium"}
                      onChange={(e) => handleConfigUpdate("emissionSchedule", e.target.value)}
                    >
                      <option value="low">Low (2% annual)</option>
                      <option value="medium">Medium (5% annual)</option>
                      <option value="high">High (10% annual)</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  {stakingConfig.emissionSchedule === "custom" && (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-300">Annual Inflation Rate (%)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="input-glass"
                        value={stakingConfig.inflationRate || 0}
                        onChange={(e) => handleConfigUpdate("inflationRate", parseFloat(e.target.value))}
                      />
                    </label>
                  )}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Sell Fraction (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input-glass"
                      value={stakingConfig.sellFrac ?? 70}
                      onChange={(e) => handleConfigUpdate("sellFrac", parseFloat(e.target.value))}
                    />
                    <span className="text-[10px] text-slate-500">Fraction of rewards that stakers sell (creates sell pressure)</span>
                  </label>
                </div>
              )}

              {/* Revenue Share Branch */}
              {rewardMechanism === "revenue_share" && (
                <div className="space-y-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Revenue Share (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input-glass"
                      value={stakingConfig.revenueSharePct || 0}
                      onChange={(e) => handleConfigUpdate("revenueSharePct", parseFloat(e.target.value))}
                    />
                    <span className="text-[10px] text-slate-500">% of protocol fees allocated to stakers</span>
                  </label>
                  <div className="rounded border border-white/[0.06] bg-[rgba(15,20,28,0.5)] p-2">
                    <p className="text-[10px] text-neutral-400">
                      Note: Revenue share requires FeesUSD input from other modules. APY will be calculated based on staked amount and fee distribution.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "locking":
        const lockingConfig = source.config as any;
        return (
          <div className="space-y-4">
            {/* Locking Demand Parameters */}
            <div className="space-y-3">
              <label className="text-label">Locking Demand</label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Max Locked Ratio (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={lockingConfig.f_lock_max || 0}
                  onChange={(e) => handleConfigUpdate("f_lock_max", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Maximum % of circulating supply that becomes locked</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Adoption Speed</span>
                <select
                  className="input-glass"
                  value={lockingConfig.adoptionSpeed || "medium"}
                  onChange={(e) => handleConfigUpdate("adoptionSpeed", e.target.value)}
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Lock Duration</span>
                <select
                  className="input-glass"
                  value={lockingConfig.lockDurationPreset || "medium"}
                  onChange={(e) => {
                    handleConfigUpdate("lockDurationPreset", e.target.value);
                    // Clear custom duration when preset is selected
                    if (e.target.value !== "custom") {
                      handleConfigUpdate("lockDurationMonths", undefined);
                    }
                  }}
                >
                  <option value="short">Short (3 months)</option>
                  <option value="medium">Medium (12 months)</option>
                  <option value="long">Long (36 months)</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {lockingConfig.lockDurationPreset === "custom" && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Custom Lock Duration (months)</span>
                  <input
                    type="number"
                    min="1"
                    className="input-glass"
                    value={lockingConfig.lockDurationMonths || 12}
                    onChange={(e) => handleConfigUpdate("lockDurationMonths", parseInt(e.target.value))}
                  />
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Market Buy Share (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={lockingConfig.marketBuyShare ?? 50}
                  onChange={(e) => handleConfigUpdate("marketBuyShare", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Fraction of new locks bought from market</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={lockingConfig.enableUnlockApproximation || false}
                  onChange={(e) => handleConfigUpdate("enableUnlockApproximation", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs text-slate-300">Enable unlock approximation (leaky bucket effect)</span>
              </label>
            </div>
          </div>
        );

      case "token_gated":
        const gateConfig = source.config as any;
        const useAdoptionCurve = gateConfig.maxGatedUsers !== undefined && gateConfig.adoptionSpeed;
        
        return (
          <div className="space-y-4">
            {/* User Configuration */}
            <div className="space-y-3">
              <label className="text-label">Gated Users</label>
              {!useAdoptionCurve ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Number of Gated Users</span>
                  <input
                    type="number"
                    min="0"
                    className="input-glass"
                    value={gateConfig.gatedUsers || 0}
                    onChange={(e) => handleConfigUpdate("gatedUsers", parseInt(e.target.value))}
                  />
                </label>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Max Gated Users</span>
                    <input
                      type="number"
                      min="0"
                      className="input-glass"
                      value={gateConfig.maxGatedUsers || 0}
                      onChange={(e) => handleConfigUpdate("maxGatedUsers", parseInt(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Adoption Speed</span>
                    <select
                      className="input-glass"
                      value={gateConfig.adoptionSpeed || "medium"}
                      onChange={(e) => handleConfigUpdate("adoptionSpeed", e.target.value)}
                    >
                      <option value="slow">Slow</option>
                      <option value="medium">Medium</option>
                      <option value="fast">Fast</option>
                    </select>
                  </label>
                </>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useAdoptionCurve}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleConfigUpdate("maxGatedUsers", gateConfig.gatedUsers || 0);
                      handleConfigUpdate("adoptionSpeed", "medium");
                      handleConfigUpdate("gatedUsers", undefined);
                    } else {
                      handleConfigUpdate("gatedUsers", gateConfig.maxGatedUsers || 0);
                      handleConfigUpdate("maxGatedUsers", undefined);
                      handleConfigUpdate("adoptionSpeed", undefined);
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className="text-xs text-slate-300">Use adoption curve (saturation)</span>
              </label>
            </div>

            {/* Token Requirement */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Tokens Required per User</span>
                <input
                  type="number"
                  min="0"
                  className="input-glass"
                  value={gateConfig.tokensRequired || 0}
                  onChange={(e) => handleConfigUpdate("tokensRequired", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">H_gate: Minimum tokens required to access features</span>
              </label>
            </div>

            {/* Market Buy Share */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Market Buy Share (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={gateConfig.marketBuyShare ?? 50}
                  onChange={(e) => handleConfigUpdate("marketBuyShare", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Fraction of new holdings bought from market</span>
              </label>
            </div>
          </div>
        );

      case "payment":
        const paymentConfig = source.config as any;
        const spendBasis = paymentConfig.spendBasis || "direct";
        
        return (
          <div className="space-y-4">
            {/* Spend Basis Selection */}
            <div className="space-y-2">
              <label className="text-label">Spend Basis</label>
              <select
                className="select-glass"
                value={spendBasis}
                onChange={(e) => handleConfigUpdate("spendBasis", e.target.value)}
              >
                <option value="direct">Direct USD Spend</option>
                <option value="activity">Activity-Based (Users × Actions × USD/Action)</option>
              </select>
            </div>

            {/* Direct Spend */}
            {spendBasis === "direct" && (
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Monthly Spend USD</span>
                  <input
                    type="number"
                    min="0"
                    className="input-glass"
                    value={paymentConfig.spendUSD || 0}
                    onChange={(e) => handleConfigUpdate("spendUSD", parseFloat(e.target.value))}
                  />
                  <span className="text-[10px] text-slate-500">SpendUSD[t]: Monthly total value paid in tokens</span>
                </label>
              </div>
            )}

            {/* Activity-Based Spend */}
            {spendBasis === "activity" && (
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Active Users</span>
                  <input
                    type="number"
                    min="0"
                    className="input-glass"
                    value={paymentConfig.activeUsers || 0}
                    onChange={(e) => handleConfigUpdate("activeUsers", parseInt(e.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Actions per User</span>
                  <input
                    type="number"
                    min="0"
                    className="input-glass"
                    value={paymentConfig.actionsPerUser || 0}
                    onChange={(e) => handleConfigUpdate("actionsPerUser", parseFloat(e.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">USD per Action</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-glass"
                    value={paymentConfig.usdPerAction || 0}
                    onChange={(e) => handleConfigUpdate("usdPerAction", parseFloat(e.target.value))}
                  />
                </label>
              </div>
            )}

            {/* Buffer Days */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Buffer Days</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="input-glass"
                  value={paymentConfig.bufferDays ?? 7}
                  onChange={(e) => handleConfigUpdate("bufferDays", parseInt(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">B: Wallet inventory buffer (default 7-14 days)</span>
              </label>
            </div>

            {/* Pay Fees in Token */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={paymentConfig.enablePayFeesInToken || false}
                  onChange={(e) => handleConfigUpdate("enablePayFeesInToken", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs text-slate-300">Pay Protocol Fees in Token</span>
              </label>
              {paymentConfig.enablePayFeesInToken && (
                <div className="space-y-3 pl-6">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Opt-In Share (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input-glass"
                      value={paymentConfig.optInShare || 0}
                      onChange={(e) => handleConfigUpdate("optInShare", parseFloat(e.target.value))}
                    />
                    <span className="text-[10px] text-slate-500">Fraction of fees paid in token</span>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Discount (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input-glass"
                      value={paymentConfig.discountPay || 0}
                      onChange={(e) => handleConfigUpdate("discountPay", parseFloat(e.target.value))}
                    />
                    <span className="text-[10px] text-slate-500">d_pay: Discount for paying in token</span>
                  </label>
                  <div className="rounded border border-white/[0.06] bg-[rgba(15,20,28,0.5)] p-2">
                    <p className="text-[10px] text-neutral-400">
                      Note: Requires FeesUSD input from other modules. Net fees adjusted for buybacks/revshare elsewhere.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "collateral":
        const collatConfig = source.config as any;
        const useBorrowAdoption = collatConfig.borrowTarget !== undefined && collatConfig.adoptionSpeed;
        
        return (
          <div className="space-y-4">
            {/* Borrow Configuration */}
            <div className="space-y-3">
              <label className="text-label">Borrow Amount</label>
              {!useBorrowAdoption ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Borrow USD</span>
                  <input
                    type="number"
                    min="0"
                    className="input-glass"
                    value={collatConfig.borrowUSD || 0}
                    onChange={(e) => handleConfigUpdate("borrowUSD", parseFloat(e.target.value))}
                  />
                  <span className="text-[10px] text-slate-500">BorrowUSD[t]: Monthly borrow amount</span>
                </label>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Borrow Target USD</span>
                    <input
                      type="number"
                      min="0"
                      className="input-glass"
                      value={collatConfig.borrowTarget || 0}
                      onChange={(e) => handleConfigUpdate("borrowTarget", parseFloat(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Adoption Speed</span>
                    <select
                      className="input-glass"
                      value={collatConfig.adoptionSpeed || "medium"}
                      onChange={(e) => handleConfigUpdate("adoptionSpeed", e.target.value)}
                    >
                      <option value="slow">Slow</option>
                      <option value="medium">Medium</option>
                      <option value="fast">Fast</option>
                    </select>
                  </label>
                </>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useBorrowAdoption}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleConfigUpdate("borrowTarget", collatConfig.borrowUSD || 0);
                      handleConfigUpdate("adoptionSpeed", "medium");
                      handleConfigUpdate("borrowUSD", undefined);
                    } else {
                      handleConfigUpdate("borrowUSD", collatConfig.borrowTarget || 0);
                      handleConfigUpdate("borrowTarget", undefined);
                      handleConfigUpdate("adoptionSpeed", undefined);
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className="text-xs text-slate-300">Use adoption curve (saturation)</span>
              </label>
            </div>

            {/* Collateral Parameters */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Collateral Ratio</span>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  className="input-glass"
                  value={collatConfig.collateralRatio || 1.5}
                  onChange={(e) => handleConfigUpdate("collateralRatio", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">CR: e.g., 1.5 = 150% collateralization</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Market Cap Ceiling (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="input-glass"
                  value={collatConfig.mcapCeilingPct ?? 5}
                  onChange={(e) => handleConfigUpdate("mcapCeilingPct", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">c_mcap: Ceiling as % of market cap (default 2-10%)</span>
              </label>
            </div>

            {/* Market Buy Share */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Market Buy Share (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={collatConfig.marketBuyShare ?? 50}
                  onChange={(e) => handleConfigUpdate("marketBuyShare", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Fraction of new collateral bought from market</span>
              </label>
            </div>
          </div>
        );

      case "fee_discounts":
        const feeConfig = source.config as any;
        const approach = feeConfig.approach || "manual_tier";
        
        return (
          <div className="space-y-4">
            {/* Approach Selection */}
            <div className="space-y-2">
              <label className="text-label">Configuration Approach</label>
              <select
                className="select-glass"
                value={approach}
                onChange={(e) => handleConfigUpdate("approach", e.target.value)}
              >
                <option value="manual_tier">Manual Tier Uptake</option>
                <option value="segment_mapping">Segment Mapping</option>
              </select>
            </div>

            {/* Common: Active Users */}
            <div className="space-y-3">
              <label className="text-label">User Base</label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Active Users</span>
                <input
                  type="number"
                  min="0"
                  className="input-glass"
                  value={feeConfig.activeUsers || 0}
                  onChange={(e) => handleConfigUpdate("activeUsers", parseInt(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Number of active users U[t]</span>
              </label>
            </div>

            {/* Manual Tier Approach */}
            {approach === "manual_tier" && (
              <div className="space-y-3 border-t border-white/[0.06] pt-3">
                <label className="text-label">Tier Configuration</label>
                <div className="space-y-2">
                  {(feeConfig.tiers || [{ tokensRequired: 0, userPercentage: 0 }]).map((tier: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-2 gap-2 p-2 rounded border border-white/[0.06] bg-[rgba(15,20,28,0.5)]">
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-neutral-400">Tokens Required</span>
                        <input
                          type="number"
                          min="0"
                          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs"
                          value={tier.tokensRequired || 0}
                          onChange={(e) => {
                            const newTiers = [...(feeConfig.tiers || [])];
                            newTiers[idx] = { ...tier, tokensRequired: parseFloat(e.target.value) };
                            handleConfigUpdate("tiers", newTiers);
                          }}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-neutral-400">User %</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs"
                          value={tier.userPercentage || 0}
                          onChange={(e) => {
                            const newTiers = [...(feeConfig.tiers || [])];
                            newTiers[idx] = { ...tier, userPercentage: parseFloat(e.target.value) };
                            handleConfigUpdate("tiers", newTiers);
                          }}
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newTiers = [...(feeConfig.tiers || []), { tokensRequired: 0, userPercentage: 0 }];
                      handleConfigUpdate("tiers", newTiers);
                    }}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-slate-300 hover:bg-neutral-900 transition"
                  >
                    + Add Tier
                  </button>
                </div>
              </div>
            )}

            {/* Segment Mapping Approach */}
            {approach === "segment_mapping" && (
              <div className="space-y-3 border-t border-white/[0.06] pt-3">
                <label className="text-label">Segment Configuration</label>
                
                {/* Segment Shares */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400">Segment Distribution (%)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400">Retail</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs"
                        value={feeConfig.segmentShares?.retail || 0}
                        onChange={(e) => handleConfigUpdate("segmentShares", {
                          ...feeConfig.segmentShares,
                          retail: parseFloat(e.target.value),
                          pro: feeConfig.segmentShares?.pro || 0,
                          whale: feeConfig.segmentShares?.whale || 0,
                        })}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400">Pro</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs"
                        value={feeConfig.segmentShares?.pro || 0}
                        onChange={(e) => handleConfigUpdate("segmentShares", {
                          ...feeConfig.segmentShares,
                          retail: feeConfig.segmentShares?.retail || 0,
                          pro: parseFloat(e.target.value),
                          whale: feeConfig.segmentShares?.whale || 0,
                        })}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400">Whale</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs"
                        value={feeConfig.segmentShares?.whale || 0}
                        onChange={(e) => handleConfigUpdate("segmentShares", {
                          ...feeConfig.segmentShares,
                          retail: feeConfig.segmentShares?.retail || 0,
                          pro: feeConfig.segmentShares?.pro || 0,
                          whale: parseFloat(e.target.value),
                        })}
                      />
                    </label>
                  </div>
                </div>

                {/* Tier Requirements */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400">Tier Requirements (tokens)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400">Tier 1</span>
                      <input
                        type="number"
                        min="0"
                        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs"
                        value={feeConfig.tierRequirements?.tier1 || 0}
                        onChange={(e) => handleConfigUpdate("tierRequirements", {
                          ...feeConfig.tierRequirements,
                          tier1: parseFloat(e.target.value),
                          tier2: feeConfig.tierRequirements?.tier2 || 0,
                          tier3: feeConfig.tierRequirements?.tier3 || 0,
                        })}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400">Tier 2</span>
                      <input
                        type="number"
                        min="0"
                        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs"
                        value={feeConfig.tierRequirements?.tier2 || 0}
                        onChange={(e) => handleConfigUpdate("tierRequirements", {
                          ...feeConfig.tierRequirements,
                          tier1: feeConfig.tierRequirements?.tier1 || 0,
                          tier2: parseFloat(e.target.value),
                          tier3: feeConfig.tierRequirements?.tier3 || 0,
                        })}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400">Tier 3</span>
                      <input
                        type="number"
                        min="0"
                        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs"
                        value={feeConfig.tierRequirements?.tier3 || 0}
                        onChange={(e) => handleConfigUpdate("tierRequirements", {
                          ...feeConfig.tierRequirements,
                          tier1: feeConfig.tierRequirements?.tier1 || 0,
                          tier2: feeConfig.tierRequirements?.tier2 || 0,
                          tier3: parseFloat(e.target.value),
                        })}
                      />
                    </label>
                  </div>
                </div>

                {/* Segment Tier Choices */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400">Tier Choice per Segment</label>
                  <div className="space-y-2">
                    {["retail", "pro", "whale"].map((segment) => (
                      <label key={segment} className="flex items-center justify-between">
                        <span className="text-xs text-slate-300 capitalize">{segment}</span>
                        <select
                          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-xs w-32"
                          value={feeConfig.segmentTiers?.[segment as keyof typeof feeConfig.segmentTiers] || "none"}
                          onChange={(e) => handleConfigUpdate("segmentTiers", {
                            ...feeConfig.segmentTiers,
                            [segment]: e.target.value,
                          })}
                        >
                          <option value="none">None</option>
                          <option value="tier1">Tier 1</option>
                          <option value="tier2">Tier 2</option>
                          <option value="tier3">Tier 3</option>
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common: Market Buy Share */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Market Buy Share (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={feeConfig.marketBuyShare ?? 50}
                  onChange={(e) => handleConfigUpdate("marketBuyShare", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Fraction of new holdings bought from market</span>
              </label>
            </div>
          </div>
        );

      case "bonding_curve":
        const bondConfig = source.config as any;
        const useLaunchAdoption = bondConfig.launchPeak !== undefined && bondConfig.adoptionSpeed;
        
        return (
          <div className="space-y-4">
            {/* Launch Configuration */}
            <div className="space-y-3">
              <label className="text-label">Launches per Month</label>
              {!useLaunchAdoption ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Launches per Month</span>
                  <input
                    type="number"
                    min="0"
                    className="input-glass"
                    value={bondConfig.launchesPerMonth || 0}
                    onChange={(e) => handleConfigUpdate("launchesPerMonth", parseFloat(e.target.value))}
                  />
                  <span className="text-[10px] text-slate-500">N_launch[t]: Number of launches per month</span>
                </label>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Peak Launches per Month</span>
                    <input
                      type="number"
                      min="0"
                      className="input-glass"
                      value={bondConfig.launchPeak || 0}
                      onChange={(e) => handleConfigUpdate("launchPeak", parseFloat(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Adoption Speed</span>
                    <select
                      className="input-glass"
                      value={bondConfig.adoptionSpeed || "medium"}
                      onChange={(e) => handleConfigUpdate("adoptionSpeed", e.target.value)}
                    >
                      <option value="slow">Slow</option>
                      <option value="medium">Medium</option>
                      <option value="fast">Fast</option>
                    </select>
                  </label>
                </>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useLaunchAdoption}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleConfigUpdate("launchPeak", bondConfig.launchesPerMonth || 0);
                      handleConfigUpdate("adoptionSpeed", "medium");
                      handleConfigUpdate("launchesPerMonth", undefined);
                    } else {
                      handleConfigUpdate("launchesPerMonth", bondConfig.launchPeak || 0);
                      handleConfigUpdate("launchPeak", undefined);
                      handleConfigUpdate("adoptionSpeed", undefined);
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className="text-xs text-slate-300">Use adoption curve (saturation)</span>
              </label>
            </div>

            {/* Liquidity Seeding */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Seed Native Tokens per Launch</span>
                <input
                  type="number"
                  min="0"
                  className="input-glass"
                  value={bondConfig.seedNativePerLaunch || 0}
                  onChange={(e) => handleConfigUpdate("seedNativePerLaunch", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">L_seed_native: Average native tokens seeded per launch</span>
              </label>
            </div>

            {/* Stickiness */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-300">Stickiness / Locked Fraction (%)</span>
                  <span className="text-xs text-slate-400">{(bondConfig.stickiness || 0).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  className="w-full accent-cyan-400"
                  value={bondConfig.stickiness || 0}
                  onChange={(e) => handleConfigUpdate("stickiness", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">l_lock: Fraction of seeded liquidity that stays locked</span>
              </label>
            </div>

            {/* Optional Decay */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={bondConfig.enableDecay || false}
                  onChange={(e) => handleConfigUpdate("enableDecay", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs text-slate-300">Enable Decay/Unlock</span>
              </label>
              {bondConfig.enableDecay && (
                <label className="flex flex-col gap-1 pl-6">
                  <span className="text-xs text-slate-300">Unlock Half-Life (months)</span>
                  <input
                    type="number"
                    min="1"
                    className="input-glass"
                    value={bondConfig.unlockHalfLifeMonths || 120}
                    onChange={(e) => handleConfigUpdate("unlockHalfLifeMonths", parseInt(e.target.value))}
                  />
                  <span className="text-[10px] text-slate-500">Half-life for exponential decay (default very long)</span>
                </label>
              )}
            </div>

            {/* Market Buy Share */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Market Buy Share (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={bondConfig.marketBuyShare ?? 70}
                  onChange={(e) => handleConfigUpdate("marketBuyShare", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">Fraction of new locks bought from market</span>
              </label>
            </div>
          </div>
        );

      case "gas":
        const gasConfig = source.config as any;
        const useTxAdoption = gasConfig.txPeak !== undefined && gasConfig.adoptionSpeed;
        
        return (
          <div className="space-y-4">
            {/* Transaction Count Configuration */}
            <div className="space-y-3">
              <label className="text-label">Transaction Count</label>
              {!useTxAdoption ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Transactions per Month</span>
                  <input
                    type="number"
                    min="0"
                    className="input-glass"
                    value={gasConfig.txCount || 0}
                    onChange={(e) => handleConfigUpdate("txCount", parseInt(e.target.value))}
                  />
                  <span className="text-[10px] text-slate-500">tx_count[t]: Monthly transaction count</span>
                </label>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Peak Transactions per Month</span>
                    <input
                      type="number"
                      min="0"
                      className="input-glass"
                      value={gasConfig.txPeak || 0}
                      onChange={(e) => handleConfigUpdate("txPeak", parseInt(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Adoption Speed</span>
                    <select
                      className="input-glass"
                      value={gasConfig.adoptionSpeed || "medium"}
                      onChange={(e) => handleConfigUpdate("adoptionSpeed", e.target.value)}
                    >
                      <option value="slow">Slow</option>
                      <option value="medium">Medium</option>
                      <option value="fast">Fast</option>
                    </select>
                  </label>
                </>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useTxAdoption}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleConfigUpdate("txPeak", gasConfig.txCount || 0);
                      handleConfigUpdate("adoptionSpeed", "medium");
                      handleConfigUpdate("txCount", undefined);
                    } else {
                      handleConfigUpdate("txCount", gasConfig.txPeak || 0);
                      handleConfigUpdate("txPeak", undefined);
                      handleConfigUpdate("adoptionSpeed", undefined);
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className="text-xs text-slate-300">Use adoption curve (saturation)</span>
              </label>
            </div>

            {/* Fee Configuration */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="text-label">Fee per Transaction</label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Fee Preset</span>
                <select
                  className="input-glass"
                  value={gasConfig.feePreset || "medium"}
                  onChange={(e) => {
                    handleConfigUpdate("feePreset", e.target.value);
                    if (e.target.value !== "custom") {
                      handleConfigUpdate("feeNativePerTx", undefined);
                    }
                  }}
                >
                  <option value="low">Low (0.001 tokens/tx)</option>
                  <option value="medium">Medium (0.01 tokens/tx)</option>
                  <option value="high">High (0.1 tokens/tx)</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {gasConfig.feePreset === "custom" && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-300">Custom Fee per Transaction</span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    className="input-glass"
                    value={gasConfig.feeNativePerTx || 0}
                    onChange={(e) => handleConfigUpdate("feeNativePerTx", parseFloat(e.target.value))}
                  />
                </label>
              )}
            </div>

            {/* Burn Fraction */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Burn Fraction (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-glass"
                  value={gasConfig.burnFrac || 0}
                  onChange={(e) => handleConfigUpdate("burnFrac", parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-slate-500">burn_frac: Fraction of gas spent that is burned</span>
              </label>
            </div>

            {/* Optional Wallet Buffer */}
            <div className="border-t border-white/[0.06] pt-3">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={gasConfig.enableWalletBuffer || false}
                  onChange={(e) => handleConfigUpdate("enableWalletBuffer", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs text-slate-300">Enable Wallet Buffer (people hold gas)</span>
              </label>
              {gasConfig.enableWalletBuffer && (
                <label className="flex flex-col gap-1 pl-6">
                  <span className="text-xs text-slate-300">Buffer Days</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="input-glass"
                    value={gasConfig.bufferDays ?? 7}
                    onChange={(e) => handleConfigUpdate("bufferDays", parseInt(e.target.value))}
                  />
                </label>
              )}
            </div>
          </div>
        );

      default:
        return <div className="text-xs text-slate-400">Simple mode not yet implemented for this source</div>;
    }
  };

  const renderAdvancedForm = () => {
    return (
      <div className="glass-surface p-4">
        <p className="text-xs text-slate-400">Advanced mode coming soon - detailed parameters for {SOURCE_LABELS[source.type]}</p>
      </div>
    );
  };

  return (
    <div className="glass-card p-5 hover-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={source.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4"
          />
          <h3 className="text-sm font-semibold text-slate-100">{SOURCE_LABELS[source.type]}</h3>
        </div>
        <button
          onClick={handleModeToggle}
          disabled={!source.enabled}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 ${mode === "advanced"
              ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              : "border border-white/[0.1] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400 bg-[rgba(15,20,28,0.5)]"
            } ${!source.enabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
        >
          {mode === "simple" ? "Simple" : "Advanced"}
        </button>
      </div>

      {source.enabled && (
        <div className="mt-3">
          {mode === "simple" ? renderSimpleForm() : renderAdvancedForm()}
        </div>
      )}
    </div>
  );
}

