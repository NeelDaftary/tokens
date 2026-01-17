"use client";

import { useState } from "react";
import type { DealTranche, CallOptionStrikeTier } from "@/types/liquidity";

type Props = {
    tranches: DealTranche[];
    onChange: (tranches: DealTranche[]) => void;
};

export default function DealTrancheEditor({ tranches, onChange }: Props) {
    const handleAdd = () => {
        const newTranche: DealTranche = {
            id: `tranche-${Date.now()}`,
            name: `Tranche ${tranches.length + 1}`,
            loanSizePct: 1.0,
            interestRatePct: 0.1,
            termDays: 365,
            strikePriceTiers: [
                { condition: "Base Strike", strikePrice: "$0.15 (TGE + 50%)" },
            ],
            kpis: {
                tier1DepthUsd: 120000,
                tier2DepthUsd: 70000,
                tier3DepthUsd: 20000,
                uptimePct: 98,
            },
        };
        onChange([...tranches, newTranche]);
    };

    const handleUpdate = (index: number, updates: Partial<DealTranche>) => {
        const updated = [...tranches];
        updated[index] = { ...updated[index], ...updates };
        onChange(updated);
    };

    const handleUpdateKpi = (index: number, field: keyof DealTranche["kpis"], value: number) => {
        const updated = [...tranches];
        updated[index] = {
            ...updated[index],
            kpis: { ...updated[index].kpis, [field]: value },
        };
        onChange(updated);
    };

    const handleAddStrike = (index: number) => {
        const updated = [...tranches];
        updated[index].strikePriceTiers.push({ condition: "", strikePrice: "" });
        onChange(updated);
    };

    const handleUpdateStrike = (
        trancheIndex: number,
        strikeIndex: number,
        field: keyof CallOptionStrikeTier,
        value: string
    ) => {
        const updated = [...tranches];
        updated[trancheIndex].strikePriceTiers[strikeIndex][field] = value;
        onChange(updated);
    };

    const handleRemoveStrike = (trancheIndex: number, strikeIndex: number) => {
        const updated = [...tranches];
        updated[trancheIndex].strikePriceTiers.splice(strikeIndex, 1);
        onChange(updated);
    };

    const handleRemoveTranche = (index: number) => {
        const updated = tranches.filter((_, i) => i !== index);
        onChange(updated);
    }

    return (
        <div className="space-y-6">
            {tranches.map((tranche, idx) => (
                <div key={tranche.id} className="grid md:grid-cols-2 gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative">
                    <button
                        onClick={() => handleRemoveTranche(idx)}
                        className="absolute top-4 right-4 text-neutral-500 hover:text-red-400"
                    >
                        ✕
                    </button>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Loan + Call Option</h3>

                        <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800 space-y-3">
                            <label className="flex justify-between items-center text-sm">
                                <span className="text-neutral-400">Loaned Assets (Name)</span>
                                <input
                                    className="bg-transparent text-right text-blue-400 outline-none w-32"
                                    value={tranche.name}
                                    onChange={(e) => handleUpdate(idx, { name: e.target.value })}
                                />
                            </label>

                            <label className="flex justify-between items-center text-sm border-t border-neutral-800 pt-3">
                                <span className="text-neutral-400">Size of loan (% supply)</span>
                                <input
                                    type="number" step="0.1"
                                    className="bg-transparent text-right text-purple-400 outline-none w-20"
                                    value={tranche.loanSizePct}
                                    onChange={(e) => handleUpdate(idx, { loanSizePct: parseFloat(e.target.value) || 0 })}
                                />
                            </label>

                            <label className="flex justify-between items-center text-sm border-t border-neutral-800 pt-3">
                                <span className="text-neutral-400">Interest rate (%/yr)</span>
                                <input
                                    type="number" step="0.1"
                                    className="bg-transparent text-right text-pink-400 outline-none w-20"
                                    value={tranche.interestRatePct}
                                    onChange={(e) => handleUpdate(idx, { interestRatePct: parseFloat(e.target.value) || 0 })}
                                />
                            </label>
                        </div>

                        <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-neutral-300">Call Option Strike(s)</span>
                            </div>
                            <div className="space-y-2">
                                {tranche.strikePriceTiers.map((tier, sIdx) => (
                                    <div key={sIdx} className="flex gap-2 text-xs">
                                        <input
                                            placeholder="Condition (e.g. @ $150m FDV)"
                                            value={tier.condition}
                                            onChange={(e) => handleUpdateStrike(idx, sIdx, "condition", e.target.value)}
                                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300"
                                        />
                                        <input
                                            placeholder="Strike (e.g. 1/4 loan)"
                                            value={tier.strikePrice}
                                            onChange={(e) => handleUpdateStrike(idx, sIdx, "strikePrice", e.target.value)}
                                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-red-300"
                                        />
                                        <button onClick={() => handleRemoveStrike(idx, sIdx)} className="text-neutral-600 hover:text-red-400">✕</button>
                                    </div>
                                ))}
                                <button onClick={() => handleAddStrike(idx)} className="text-xs text-blue-500 hover:underline">+ Add Strike Tier</button>
                            </div>
                        </div>

                        <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800 flex justify-between items-center text-sm">
                            <span className="text-neutral-400">Term (Days)</span>
                            <input
                                type="number"
                                value={tranche.termDays}
                                onChange={(e) => handleUpdate(idx, { termDays: parseInt(e.target.value) || 0 })}
                                className="bg-transparent text-right text-green-400 outline-none w-20"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">KPIs</h3>
                        <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 h-full">
                            <div className="flex justify-between items-center text-neutral-400 text-xs mb-4">
                                <span>Wait Time / Depth</span>
                                <span className="text-right">+/- 2% Depth (USD)</span>
                            </div>

                            <div className="space-y-4">
                                <label className="flex justify-between items-center text-sm">
                                    <span className="text-neutral-300">Tier 1</span>
                                    <input
                                        type="number"
                                        value={tranche.kpis.tier1DepthUsd}
                                        onChange={(e) => handleUpdateKpi(idx, "tier1DepthUsd", parseInt(e.target.value) || 0)}
                                        className="text-right bg-transparent text-green-400 outline-none border-b border-neutral-800 focus:border-green-500 transition-colors w-24"
                                    />
                                </label>

                                <label className="flex justify-between items-center text-sm">
                                    <span className="text-neutral-300">Tier 2</span>
                                    <input
                                        type="number"
                                        value={tranche.kpis.tier2DepthUsd}
                                        onChange={(e) => handleUpdateKpi(idx, "tier2DepthUsd", parseInt(e.target.value) || 0)}
                                        className="text-right bg-transparent text-green-400 outline-none border-b border-neutral-800 focus:border-green-500 transition-colors w-24"
                                    />
                                </label>

                                <label className="flex justify-between items-center text-sm">
                                    <span className="text-neutral-300">Tier 3</span>
                                    <input
                                        type="number"
                                        value={tranche.kpis.tier3DepthUsd}
                                        onChange={(e) => handleUpdateKpi(idx, "tier3DepthUsd", parseInt(e.target.value) || 0)}
                                        className="text-right bg-transparent text-green-400 outline-none border-b border-neutral-800 focus:border-green-500 transition-colors w-24"
                                    />
                                </label>
                            </div>

                            <div className="mt-8 pt-4 border-t border-neutral-800">
                                <label className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-neutral-300">Uptime Requirement</span>
                                    <div className="flex items-center gap-1 text-purple-400">
                                        {">"}
                                        <input
                                            type="number"
                                            value={tranche.kpis.uptimePct}
                                            onChange={(e) => handleUpdateKpi(idx, "uptimePct", parseInt(e.target.value) || 0)}
                                            className="text-right bg-transparent outline-none w-10"
                                        />
                                        %
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <button
                onClick={handleAdd}
                className="w-full py-3 rounded-lg border border-dashed border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition-colors"
            >
                + Add Tranche
            </button>
        </div>
    );
}
