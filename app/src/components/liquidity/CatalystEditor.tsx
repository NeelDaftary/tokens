"use client";

import type { Catalyst } from "@/types/liquidity";

type Props = {
  catalysts: Catalyst[];
  onChange: (catalysts: Catalyst[]) => void;
};

export default function CatalystEditor({ catalysts, onChange }: Props) {
  const handleAdd = () => {
    onChange([
      ...catalysts,
      { day: 7, multiplier: 1.5, durationDays: 3, label: "" },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(catalysts.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Catalyst, value: any) => {
    const updated = [...catalysts];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleAdd}
        className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
      >
        + Add catalyst
      </button>

      {catalysts.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-700 p-4 text-center text-xs text-neutral-400">
          No catalysts yet. Add volume spikes (e.g., listings, partnerships).
        </div>
      )}

      {catalysts.map((catalyst, idx) => (
        <div
          key={idx}
          className="grid grid-cols-5 gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Day</label>
            <input
              type="number"
              value={catalyst.day || ""}
              onChange={(e) =>
                handleChange(idx, "day", parseInt(e.target.value) || 0)
              }
              className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-white"
              placeholder="7"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Multiplier</label>
            <input
              type="number"
              step="0.1"
              value={catalyst.multiplier || ""}
              onChange={(e) =>
                handleChange(idx, "multiplier", parseFloat(e.target.value) || 1)
              }
              className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-white"
              placeholder="1.5"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Duration (days)</label>
            <input
              type="number"
              value={catalyst.durationDays || ""}
              onChange={(e) =>
                handleChange(idx, "durationDays", parseInt(e.target.value) || 1)
              }
              className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-white"
              placeholder="3"
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Label</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={catalyst.label || ""}
                onChange={(e) => handleChange(idx, "label", e.target.value)}
                className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-white"
                placeholder="e.g. Binance listing"
              />
              <button
                onClick={() => handleRemove(idx)}
                className="rounded px-2 text-red-400 hover:bg-red-400/10"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

