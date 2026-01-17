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
import type { LiquidityModel } from "@/types/liquidity";

export default function VolumeDecayChart({ model }: { model: LiquidityModel }) {
    const data = useMemo(() => {
        const points = [];
        const peak = model.peakDayVolumeUsd;
        const end = model.decayToDay;
        const endVal = peak * (model.decayToPct / 100);

        for (let day = 1; day <= Math.max(end, 30); day++) {
            let volume = 0;
            if (day >= end) {
                volume = endVal;
            } else {
                if (model.decayFunction === "Linear") {
                    volume = peak - ((peak - endVal) * (day - 1)) / (end - 1);
                } else {
                    // Exponential decay: V = V0 * e^(-kt)
                    // Solve for k: Vend = V0 * e^(-k * (end-1))
                    // k = -ln(Vend/V0) / (end-1)
                    const k = -Math.log(endVal / peak) / (end - 1);
                    volume = peak * Math.exp(-k * (day - 1));
                }
            }
            points.push({ day, volume });
        }
        return points;
    }, [model.peakDayVolumeUsd, model.decayToPct, model.decayToDay, model.decayFunction]);

    // Changes:
    // 1. Updated fmtUsd to handle Billions (B).
    // 2. Increased YAxis width to avoid cropping.
    // 3. Removed interval="preserveStartEnd" from XAxis and added tickCount/minTickGap for consistent spacing.

    const fmtUsd = (val: number) => {
        if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
        return `$${val}`;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                    dataKey="day"
                    stroke="#525252"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                />
                <YAxis
                    stroke="#525252"
                    fontSize={12}
                    tickFormatter={fmtUsd}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "#171717",
                        borderColor: "#262626",
                        borderRadius: "0.5rem",
                    }}
                    formatter={(val: number) => [
                        `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                        "Volume",
                    ]}
                    labelFormatter={(label) => `Day ${label}`}
                />
                <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVolume)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
