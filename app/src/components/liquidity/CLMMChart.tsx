"use client";

import { useMemo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { LiquidityBand } from "@/types/liquidity";

export default function CLMMChart({ bands }: { bands: LiquidityBand[] }) {
    const data = useMemo(() => {
        const enabledBands = bands.filter((b) => b.enabled);
        if (enabledBands.length === 0) return [];

        // 1. Collect all boundary points
        const points = new Set<number>();
        enabledBands.forEach((b) => {
            points.add(b.minPrice);
            points.add(b.maxPrice);
        });

        // Add buffer points
        const minP = Math.min(...Array.from(points));
        const maxP = Math.max(...Array.from(points));
        const span = maxP - minP;
        const padding = span * 0.2 || 0.1; // fallback if span is 0 (single point?)

        points.add(Math.max(0, minP - padding));
        points.add(maxP + padding);

        const sortedPoints = Array.from(points).sort((a, b) => a - b);

        // 2. Create intervals and calculate density
        const chartData = [];

        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const p0 = sortedPoints[i];
            const p1 = sortedPoints[i + 1];
            const mid = (p0 + p1) / 2;

            // Calculate density at this interval
            // Density = Sum(Amount / (Max - Min)) for all bands covering mid
            let density = 0;
            enabledBands.forEach(b => {
                if (mid >= b.minPrice && mid <= b.maxPrice) {
                    const width = b.maxPrice - b.minPrice;
                    if (width > 0) {
                        density += b.amountUsd / width;
                    }
                }
            });

            // We plot points exactly at p0 and p1 having this density to create "steps"
            // But AreaChart smooths unless we use 'step'.
            // To force steps in Recharts Area, we can use step prop or specific data points.
            // Better: just push mid-point? No, Area needs start/end.
            // Let's use 'stepAfter' or duplicate points.
            // Recharts <Area type="step" /> works.

            // We add the start of the interval
            chartData.push({ price: p0, density });
            // We add the end of the interval (same density) to close the step?
            // Actually type="step" is easiest. But strictly step usually means "value follows until next point".
            // So {price: p0, density} is enough.
            // But the last point needs to be 0?
        }

        // Add the final point to close the area
        const lastP = sortedPoints[sortedPoints.length - 1];
        chartData.push({ price: lastP, density: 0 });

        return chartData;
    }, [bands]);

    const fmtUsd = (val: number) => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
        return `$${val?.toFixed(0)}`;
    };

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center text-xs text-neutral-500 h-full">
                Add bands to visualize liquidity
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorLiquidity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                    dataKey="price"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="#525252"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val.toFixed(2)}
                />
                <YAxis
                    stroke="#525252"
                    fontSize={10}
                    tickFormatter={fmtUsd}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "#171717",
                        borderColor: "#262626",
                        borderRadius: "0.5rem",
                    }}
                    formatter={(val: number) => [
                        `$${Math.round(val).toLocaleString()}`,
                        "Density ($/price)",
                    ]}
                    labelFormatter={(label) => `Price ${Number(label).toFixed(4)}`}
                />
                <Area
                    type="stepAfter"
                    dataKey="density"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLiquidity)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
