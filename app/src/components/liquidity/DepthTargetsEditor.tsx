"use client";

import type { DepthTarget } from "@/types/liquidity";

type Props = {
  targets: DepthTarget[];
  onChange: (targets: DepthTarget[]) => void;
};

export default function DepthTargetsEditor({ targets, onChange }: Props) {
  const handleToggle = (index: number) => {
    const updated = [...targets];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    onChange(updated);
  };

  const handleAmountChange = (index: number, value: number) => {
    const updated = [...targets];
    updated[index] = {
      ...updated[index],
      depthUsd: value,
    };
    onChange(updated);
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    if (!num && num !== 0) return "";
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-3">
      {targets.map((target, idx) => (
        <div
          key={target.bandBps}
          className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
        >
          <input
            type="checkbox"
            checked={target.enabled}
            onChange={() => handleToggle(idx)}
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-white">
              ±{target.bandBps} bps
            </div>
            <div className="text-xs text-neutral-400">
              Depth within ±{(target.bandBps / 100).toFixed(2)}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400">$</span>
            <input
              type="text"
              value={target.enabled ? formatNumber(target.depthUsd) : ""}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/,/g, "");
                const parsed = parseFloat(cleaned) || 0;
                handleAmountChange(idx, Math.max(0, parsed));
              }}
              disabled={!target.enabled}
              className="w-32 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white disabled:opacity-50"
              placeholder="0"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

