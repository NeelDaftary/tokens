"use client";

import { useMemo } from "react";

type Props = {
    lpFeePct: number; // e.g. 0.03 for 3%, 0.003 for 0.3%
};

// Heatmap configuration
const TRADE_SIZES = [1000, 2100, 5000, 10000, 20000, 50000, 100000, 200000, 300000];
const SLIPPAGES_BPS = [10, 30, 50, 80, 100, 150, 200, 300, 400, 500]; // 0.1% to 5.0%

export default function V2LiquidityHeatmap({ lpFeePct }: Props) {
    // Logic: 
    // TVL = 2 * (TradeSize / Slippage) * (1 - Fee)?
    // User spreadsheet matches: 1.94 factor for 3% fee (0.03). 2 * (1-0.03) = 1.94.
    // So Formula: TVL = 2 * TradeSize / Slippage * (1 - lpFeePct)

    const factor = 2 * (1 - lpFeePct);

    // Helper to format currency
    const fmt = (val: number) => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
        return `$${val?.toLocaleString()}`;
    };

    const getHeatmapColor = (val: number) => {
        // Determine color intensity based on value magnitude
        // This is arbitrary, relative to expected range $100k - $100M
        if (val < 100_000) return "bg-green-900/40 text-green-300";
        if (val < 500_000) return "bg-green-800/40 text-green-200";
        if (val < 2_000_000) return "bg-yellow-800/40 text-yellow-200";
        if (val < 10_000_000) return "bg-orange-800/40 text-orange-200";
        return "bg-red-900/40 text-red-200";
    };

    return (
        <div className="overflow-x-auto rounded border border-neutral-800 bg-neutral-900/50 p-4">
            <h5 className="mb-4 text-xs font-semibold text-neutral-300">
                Estimated V2 Liquidity Requirement (TVL)
                <span className="ml-2 font-normal text-neutral-500">
                    Based on Trade Size & Target Slippage (Fee: {(lpFeePct * 100).toFixed(1)}%)
                </span>
            </h5>

            <table className="w-full text-right text-[10px] sm:text-xs">
                <thead>
                    <tr>
                        <th className="bg-neutral-950 p-2 text-left text-neutral-400">
                            Trade Size
                        </th>
                        {SLIPPAGES_BPS.map((bps) => (
                            <th key={bps} className="bg-neutral-950 p-2 text-neutral-400">
                                {(bps / 100).toFixed(1)}%
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {TRADE_SIZES.map((size) => (
                        <tr key={size} className="hover:bg-neutral-800/30">
                            <td className="border-b border-neutral-800 bg-neutral-950 p-2 text-left font-medium text-blue-400">
                                ${size.toLocaleString()}
                            </td>
                            {SLIPPAGES_BPS.map((bps) => {
                                const slipPct = bps / 10000;
                                // Avoid divide by zero
                                const tvl = slipPct > 0 ? (size / slipPct) * factor : 0;
                                return (
                                    <td
                                        key={bps}
                                        className={`border-b border-neutral-800 p-2 ${getHeatmapColor(tvl)}`}
                                        title={`Trade: $${size}, Slip: ${(bps / 100)}% -> TVL: $${tvl.toLocaleString()}`}
                                    >
                                        {fmt(tvl)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
