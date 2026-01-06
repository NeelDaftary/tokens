import { ResponsiveContainer, AreaChart, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line } from 'recharts';
import type { AggregatedStep } from '@/types/depin';

interface DePINChartProps {
  title: string;
  data: AggregatedStep[];
  metric: keyof AggregatedStep;
  color: string;
  type: 'area' | 'line';
  formatter?: (value: number) => string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const fmtDec = (n: number, decimals: number = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);

export default function DePINChart({ title, data, metric, color, type, formatter = fmt }: DePINChartProps) {
  const chartData = data.map((s) => {
    const stats = s[metric] as any;
    if (typeof stats === 'object' && stats.mean !== undefined) {
      if (type === 'area') {
        return {
          t: s.timestep,
          mean: stats.mean,
          upper: stats.mean + stats.std,
          lower: Math.max(0, stats.mean - stats.std),
        };
      } else {
        return {
          t: s.timestep,
          mean: stats.mean,
          p10: stats.p10,
          p90: stats.p90,
        };
      }
    }
    return { t: s.timestep, value: stats };
  });

  const Chart = type === 'area' ? AreaChart : LineChart;
  const colorWithAlpha = color + '80';
  const colorFaded = color + '50';

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <Chart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis 
            dataKey="t" 
            stroke="#9ca3af" 
            tick={{ fill: "#9ca3af", fontSize: 11 }} 
            label={{ value: "Week", position: "insideBottom", offset: -5, fill: "#9ca3af" }} 
          />
          <YAxis 
            stroke="#9ca3af" 
            tick={{ fill: "#9ca3af", fontSize: 11 }} 
            tickFormatter={(v) => formatter(v)} 
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "4px" }}
            labelStyle={{ color: "#d1d5db" }}
            formatter={(value: any) => [formatter(value), ""]}
          />
          {type === 'area' ? (
            <>
              <Area type="monotone" dataKey="upper" fill={colorWithAlpha} stroke="none" />
              <Area type="monotone" dataKey="mean" fill={color} stroke={color} strokeWidth={2} />
              <Area type="monotone" dataKey="lower" fill={colorWithAlpha} stroke="none" />
            </>
          ) : (
            <>
              <Line type="monotone" dataKey="p90" stroke={colorFaded} strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="mean" stroke={color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p10" stroke={colorFaded} strokeWidth={1} dot={false} />
            </>
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

