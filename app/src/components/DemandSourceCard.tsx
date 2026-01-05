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
      config: { ...source.config, [field]: value },
    });
  };

  const renderSimpleForm = () => {
    switch (source.type) {
      case "buybacks":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Monthly Buyback Amount (USD)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).monthlyBuybackUsd || 0}
                onChange={(e) => handleConfigUpdate("monthlyBuybackUsd", parseFloat(e.target.value))}
              />
            </label>
          </div>
        );

      case "staking":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Expected Staking Ratio (%)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).stakingRatio || 0}
                onChange={(e) => handleConfigUpdate("stakingRatio", parseFloat(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">APY (%)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).apy || 0}
                onChange={(e) => handleConfigUpdate("apy", parseFloat(e.target.value))}
              />
            </label>
          </div>
        );

      case "locking":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Expected Locked Supply (%)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).lockedSupplyPct || 0}
                onChange={(e) => handleConfigUpdate("lockedSupplyPct", parseFloat(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Average Lock Duration (months)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).avgLockDuration || 0}
                onChange={(e) => handleConfigUpdate("avgLockDuration", parseInt(e.target.value))}
              />
            </label>
          </div>
        );

      case "token_gated":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Expected Users</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).expectedUsers || 0}
                onChange={(e) => handleConfigUpdate("expectedUsers", parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Cost per User (tokens or USD)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).costPerUser || 0}
                onChange={(e) => handleConfigUpdate("costPerUser", parseFloat(e.target.value))}
              />
            </label>
          </div>
        );

      case "payment":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Monthly Transaction Volume (USD)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).monthlyVolume || 0}
                onChange={(e) => handleConfigUpdate("monthlyVolume", parseFloat(e.target.value))}
              />
            </label>
          </div>
        );

      case "collateral":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Projected TVL (USD)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).projectedTvl || 0}
                onChange={(e) => handleConfigUpdate("projectedTvl", parseFloat(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Collateralization Ratio (%)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).collateralizationRatio || 0}
                onChange={(e) => handleConfigUpdate("collateralizationRatio", parseFloat(e.target.value))}
              />
            </label>
          </div>
        );

      case "fee_discounts":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Monthly Fee Volume (USD)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).monthlyFeeVolume || 0}
                onChange={(e) => handleConfigUpdate("monthlyFeeVolume", parseFloat(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Discount Rate (%)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).discountRate || 0}
                onChange={(e) => handleConfigUpdate("discountRate", parseFloat(e.target.value))}
              />
            </label>
          </div>
        );

      case "bonding_curve":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Initial Liquidity (USD)</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).initialLiquidity || 0}
                onChange={(e) => handleConfigUpdate("initialLiquidity", parseFloat(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Price Curve Slope</span>
              <input
                type="number"
                step="0.01"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).curveSlope || 0}
                onChange={(e) => handleConfigUpdate("curveSlope", parseFloat(e.target.value))}
              />
            </label>
          </div>
        );

      case "gas":
        return (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-300">Expected Transactions per Month</span>
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-sm"
                value={(source.config as any).transactionsPerMonth || 0}
                onChange={(e) => handleConfigUpdate("transactionsPerMonth", parseInt(e.target.value))}
              />
            </label>
          </div>
        );

      default:
        return <div className="text-xs text-neutral-400">Simple mode not yet implemented for this source</div>;
    }
  };

  const renderAdvancedForm = () => {
    return (
      <div className="rounded border border-neutral-700 bg-neutral-900 p-3">
        <p className="text-xs text-neutral-400">Advanced mode coming soon - detailed parameters for {SOURCE_LABELS[source.type]}</p>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={source.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4"
          />
          <h3 className="text-sm font-semibold text-white">{SOURCE_LABELS[source.type]}</h3>
        </div>
        <button
          onClick={handleModeToggle}
          disabled={!source.enabled}
          className={`rounded px-2 py-1 text-xs transition ${
            mode === "advanced"
              ? "bg-purple-600 text-white"
              : "border border-neutral-700 text-neutral-300"
          } ${!source.enabled ? "opacity-50 cursor-not-allowed" : ""}`}
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

