"use client";

import { useEffect, useMemo, useState } from "react";
import domainPresets from "@/data/presets/domains.json";
import sellPresets from "@/data/presets/sellPresets.json";
import categoriesPreset from "@/data/presets/categories.json";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DemandSourceCard from "@/components/DemandSourceCard";
import SellPressureTable from "@/components/SellPressureTable";
import LiquidityTab from "@/components/LiquidityTab";
import StakingTab from "@/components/StakingTab";
import SimulatorSidebar from "@/components/SimulatorSidebar";
import type { DemandSourceConfig, SellPressureConfig } from "@/types/demand";
import { SELL_PRESSURE_PRESETS } from "@/types/demand";
import {
  computeDemandSeries,
  convertToCumulative,
  computeSellPressureSeries,
  computeNetPressure
} from "@/lib/demandCalculations";

type DistributionGroup = {
  name: string;
  allocationPct: number;
  type: string;
  category: string;
  notes?: string;
  tgeUnlockPct?: number;
  cliffMonths?: number;
  vestMonths?: number;
  unlockFrequency?: string;
  startMonth?: number;
  sellPreset?: string | null;
  costBasisUsd?: number | null;
  impliedFdvAtTge?: number | null;
  sellPctOfUnlocked?: number | null;
  includeInSellPressure?: boolean;
  color?: string;
};

type SavedProject = {
  id: string;
  name: string;
  domain: string;
  tokenSymbol: string;
  totalSupply: number | null;
  createdAt: string;
  distributionGroups: DistributionGroup[];
};

type UnlockRow = { month: number; unlocked: number; cumulative: number };

const DEFAULT_TOTAL_SUPPLY = 1_000_000_000;
const HORIZON_MONTHS = 36;
const COLORS = [
  "#2563eb",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#06b6d4",
  "#eab308",
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

function withColors(groups: DistributionGroup[]) {
  return groups.map((g, idx) => ({
    ...g,
    color: g.color || COLORS[idx % COLORS.length],
  }));
}

function normalizeAllocations(groups: DistributionGroup[]) {
  const total = groups.reduce((acc, g) => acc + (g.allocationPct || 0), 0);
  if (!total) return groups;
  return groups.map((g) => ({
    ...g,
    allocationPct: parseFloat(((g.allocationPct / total) * 100).toFixed(2)),
  }));
}

function groupStats(groups: DistributionGroup[]) {
  const total = groups.reduce((acc, g) => acc + (g.allocationPct || 0), 0);
  const internal = groups.filter((g) => g.type === "INTERNAL").length;
  const external = groups.filter((g) => g.type === "EXTERNAL").length;
  return { total, internal, external, count: groups.length };
}

function computeUnlockSeries(
  groups: DistributionGroup[],
  totalSupply: number,
  horizon: number
) {
  const byGroup = groups.map((g) => {
    const tokensAllocated = (g.allocationPct / 100) * totalSupply;
    const tge = tokensAllocated * ((g.tgeUnlockPct ?? 0) / 100);
    const remaining = tokensAllocated - tge;
    const cliff = g.cliffMonths ?? 0;
    const vest = g.vestMonths ?? 0;
    const monthly =
      vest > 0 ? remaining / vest : 0; // monthly granularity for MVP
    const series: UnlockRow[] = [];
    let cumulative = tge;
    series.push({ month: 0, unlocked: tge, cumulative });
    for (let m = 1; m <= horizon; m++) {
      const unlocked =
        m <= cliff ? 0 : vest > 0 && m - cliff <= vest ? monthly : 0;
      cumulative += unlocked;
      series.push({ month: m, unlocked, cumulative });
    }
    return { name: g.name, series };
  });

  const totalSeries: UnlockRow[] = [];
  for (let m = 0; m <= horizon; m++) {
    const unlocked = byGroup.reduce(
      (acc, g) => acc + (g.series[m]?.unlocked ?? 0),
      0
    );
    const cumulative = byGroup.reduce(
      (acc, g) => acc + (g.series[m]?.cumulative ?? 0),
      0
    );
    totalSeries.push({ month: m, unlocked, cumulative });
  }

  return { byGroup, totalSeries };
}

export default function Home() {
  const [domain, setDomain] = useState<keyof typeof domainPresets>("DEFI");
  const [name, setName] = useState("New Token Project");
  const [tokenSymbol, setTokenSymbol] = useState("TOK");
  const [totalSupply, setTotalSupply] = useState<number | null>(
    DEFAULT_TOTAL_SUPPLY
  );
  const [unknownSupply, setUnknownSupply] = useState(false);
  const [groups, setGroups] = useState<DistributionGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [horizonMonths, setHorizonMonths] = useState(36);
  const [pieChartMode, setPieChartMode] = useState<"endState" | "instantaneous">("endState");
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [activeTab, setActiveTab] = useState<"emissions" | "demand" | "liquidity" | "staking">("emissions");
  const [isSimulatorSidebarOpen, setIsSimulatorSidebarOpen] = useState(false);

  // Demand tab state
  const [demandHorizonMonths, setDemandHorizonMonths] = useState(36);
  const [demandUnit, setDemandUnit] = useState<"tokens" | "usd">("tokens");
  const [demandViewMode, setDemandViewMode] = useState<"cumulative" | "period">("period");
  const [demandSources, setDemandSources] = useState<DemandSourceConfig[]>([]);

  // Sell pressure state
  const [sellPressureConfigs, setSellPressureConfigs] = useState<SellPressureConfig[]>([]);
  const [currentTokenPrice, setCurrentTokenPrice] = useState(1);

  // Initialize demand sources
  useEffect(() => {
    if (demandSources.length === 0) {
      setDemandSources([
        { id: "1", type: "buybacks", enabled: false, mode: "simple", config: { revenueModel: "target_end", buybackShare: 0, burnShare: 100, targetEndRevenue: 0, adoptionSpeed: "medium" } },
        { id: "2", type: "staking", enabled: false, mode: "simple", config: { f_max: 0, adoptionSpeed: "medium", marketBuyShare: 50, rewardMechanism: "emissions", emissionSchedule: "medium", sellFrac: 70 } },
        { id: "3", type: "locking", enabled: false, mode: "simple", config: { f_lock_max: 0, adoptionSpeed: "medium", lockDurationPreset: "medium", marketBuyShare: 50, enableUnlockApproximation: false } },
        { id: "4", type: "token_gated", enabled: false, mode: "simple", config: { gatedUsers: 0, tokensRequired: 0, marketBuyShare: 50 } },
        { id: "5", type: "payment", enabled: false, mode: "simple", config: { spendBasis: "direct", spendUSD: 0, bufferDays: 7, enablePayFeesInToken: false } },
        { id: "6", type: "collateral", enabled: false, mode: "simple", config: { borrowUSD: 0, collateralRatio: 1.5, mcapCeilingPct: 5, marketBuyShare: 50 } },
        { id: "7", type: "fee_discounts", enabled: false, mode: "simple", config: { approach: "manual_tier", activeUsers: 0, tiers: [{ tokensRequired: 0, userPercentage: 0 }], marketBuyShare: 50 } },
        { id: "8", type: "bonding_curve", enabled: false, mode: "simple", config: { launchesPerMonth: 0, seedNativePerLaunch: 0, stickiness: 0, enableDecay: false, marketBuyShare: 70 } },
        { id: "9", type: "gas", enabled: false, mode: "simple", config: { txCount: 0, feePreset: "medium", burnFrac: 0, enableWalletBuffer: false } },
      ]);
    }
  }, [demandSources.length]);

  // Sync sell pressure configs with distribution groups
  useEffect(() => {
    if (groups.length === 0) {
      setSellPressureConfigs([]);
      return;
    }

    setSellPressureConfigs((prevConfigs) => {
      const newConfigs: SellPressureConfig[] = groups.map((group, idx) => {
        // Try to find existing config for this group
        const existing = prevConfigs.find((c) => c.groupName === group.name);

        if (existing) {
          return existing;
        }

        // Create new config with defaults
        return {
          groupId: `group-${idx}`,
          groupName: group.name,
          costBasisUsd: 0,
          impliedFdv: null,
          impliedFdvManual: false,
          preset: "moderate",
          customSellPct: null,
          enabled: true,
          useProfitMultiplier: true,
          usePriceDependent: false,
        };
      });

      return newConfigs;
    });
  }, [groups]);

  // load default preset
  useEffect(() => {
    const preset = domainPresets[domain] as { groups: DistributionGroup[] };
    if (preset) {
      setGroups(
        withColors(
          preset.groups.map((g) => ({
            ...g,
            sellPreset: g.sellPreset ?? "CONSERVATIVE",
            includeInSellPressure:
              g.includeInSellPressure === false ? false : true,
          }))
        )
      );
    }
  }, [domain]);

  const stats = useMemo(() => groupStats(groups), [groups]);
  const unlocks = useMemo(
    () =>
      computeUnlockSeries(
        groups,
        unknownSupply ? DEFAULT_TOTAL_SUPPLY : totalSupply || DEFAULT_TOTAL_SUPPLY,
        horizonMonths
      ),
    [groups, totalSupply, unknownSupply, horizonMonths]
  );

  const instantaneousDistribution = useMemo(() => {
    if (pieChartMode === "endState") return [];
    const month = selectedMonth;
    const totalCirculating = unlocks.totalSeries[month]?.cumulative || 0;
    if (totalCirculating === 0) return [];
    return groups.map((g, idx) => {
      const groupData = unlocks.byGroup.find((bg) => bg.name === g.name);
      const cumulative = groupData?.series[month]?.cumulative || 0;
      return {
        ...g,
        allocationPct: (cumulative / totalCirculating) * 100,
      };
    }).filter(g => g.allocationPct > 0);
  }, [pieChartMode, selectedMonth, unlocks, groups]);

  // Compute demand series
  const demandData = useMemo(() => {
    const supply = unknownSupply ? DEFAULT_TOTAL_SUPPLY : totalSupply || DEFAULT_TOTAL_SUPPLY;
    // Use a simple token price estimate (could be from market cap model later)
    const estimatedPrice = 1; // $1 per token as default
    const rawDemand = computeDemandSeries(demandSources, demandHorizonMonths, supply, estimatedPrice);

    // Apply view mode (cumulative or period)
    if (demandViewMode === "cumulative") {
      return {
        bySource: rawDemand.bySource.map(src => ({
          ...src,
          series: convertToCumulative(src.series),
        })),
        totalSeries: convertToCumulative(rawDemand.totalSeries),
      };
    }

    return rawDemand;
  }, [demandSources, demandHorizonMonths, totalSupply, unknownSupply, demandViewMode]);

  // Compute sell pressure series
  const sellPressureData = useMemo(() => {
    if (sellPressureConfigs.length === 0 || groups.length === 0) {
      return {
        byGroup: [],
        totalSeries: [],
        metadata: { totalSellPressure: 0, peakSellMonth: 0, avgMonthlySell: 0 },
      };
    }

    return computeSellPressureSeries(
      sellPressureConfigs,
      unlocks.byGroup,
      currentTokenPrice,
      demandHorizonMonths
    );
  }, [sellPressureConfigs, unlocks.byGroup, currentTokenPrice, demandHorizonMonths]);

  // Compute net pressure
  const netPressureData = useMemo(() => {
    return computeNetPressure(
      demandData.totalSeries,
      sellPressureData.totalSeries,
      demandHorizonMonths
    );
  }, [demandData.totalSeries, sellPressureData.totalSeries, demandHorizonMonths]);

  const totalError = Math.abs(100 - stats.total) > 0.01;

  const handleNormalize = () => {
    setGroups((prev) => normalizeAllocations(prev));
  };

  const handleUpdateGroup = (
    index: number,
    field: keyof DistributionGroup,
    value: string | number | boolean
  ) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  const handleUpdateSellPressureConfig = (
    index: number,
    updates: Partial<SellPressureConfig>
  ) => {
    setSellPressureConfigs((prev) =>
      prev.map((config, i) => (i === index ? { ...config, ...updates } : config))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          domain,
          tokenSymbol,
          totalSupply: unknownSupply ? null : totalSupply,
          distributionGroups: groups,
          demandModel: {
            sources: demandSources,
            horizonMonths: demandHorizonMonths,
            unit: demandUnit,
            viewMode: demandViewMode,
          },
          sellPressureModel: {
            configs: sellPressureConfigs,
            currentTokenPrice,
          },
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save project");
      }
      setMessage("Saved project to local DB.");
      await fetchProjects();
    } catch (err) {
      setMessage("Save failed. Check console.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const fetchProjects = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/projects");
      const data = (await res.json()) as SavedProject[];
      setSavedProjects(data);
    } catch (err) {
      console.error("Failed to list projects", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleLoadProject = (p: any) => {
    setName(p.name);
    setDomain(p.domain as keyof typeof domainPresets);
    setTokenSymbol(p.tokenSymbol);
    setTotalSupply(p.totalSupply ?? DEFAULT_TOTAL_SUPPLY);
    setUnknownSupply(p.totalSupply === null || p.totalSupply === undefined);
    setGroups(
      withColors(
        (p.distributionGroups || []).map((g: any) => ({
          ...g,
          sellPreset: g.sellPreset ?? "CONSERVATIVE",
          includeInSellPressure:
            g.includeInSellPressure === false ? false : true,
        }))
      )
    );

    // Load demand data if available
    if (p.demandModel) {
      try {
        const demandData = typeof p.demandModel === "string" ? JSON.parse(p.demandModel) : p.demandModel;
        if (demandData.sources) setDemandSources(demandData.sources);
        if (demandData.horizonMonths) setDemandHorizonMonths(demandData.horizonMonths);
        if (demandData.unit) setDemandUnit(demandData.unit);
        if (demandData.viewMode) setDemandViewMode(demandData.viewMode);
      } catch (err) {
        console.error("Failed to parse demand model", err);
      }
    }

    // Load sell pressure data if available
    if (p.sellPressureModel) {
      try {
        const sellData = typeof p.sellPressureModel === "string" ? JSON.parse(p.sellPressureModel) : p.sellPressureModel;
        if (sellData.configs) setSellPressureConfigs(sellData.configs);
        if (sellData.currentTokenPrice) setCurrentTokenPrice(sellData.currentTokenPrice);
      } catch (err) {
        console.error("Failed to parse sell pressure model", err);
      }
    }

    setMessage(`Loaded project "${p.name}"`);
  };

  return (
    <div className="min-h-screen bg-[#06080D] text-slate-50">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-white">
            Token Design Toolkit
          </h1>

          <div className="flex gap-2 border-b border-white/[0.08]">
            <button
              onClick={() => setActiveTab("emissions")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "emissions"
                ? "border-b-2 border-blue-500 text-white"
                : "text-neutral-400 hover:text-neutral-200"
                }`}
            >
              Distribution & Emissions
            </button>
            <button
              onClick={() => setActiveTab("demand")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "demand"
                ? "border-b-2 border-blue-500 text-white"
                : "text-neutral-400 hover:text-neutral-200"
                }`}
            >
              Token Demand
            </button>
            <button
              onClick={() => setActiveTab("liquidity")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "liquidity"
                ? "border-b-2 border-blue-500 text-white"
                : "text-neutral-400 hover:text-neutral-200"
                }`}
            >
              Liquidity Planner
            </button>
            <button
              onClick={() => setActiveTab("staking")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "staking"
                ? "border-b-2 border-blue-500 text-white"
                : "text-neutral-400 hover:text-neutral-200"
                }`}
            >
              Staking
            </button>
          </div>
        </header>

        {activeTab === "liquidity" && (
          <LiquidityTab
            initialLaunchMarketCap={undefined} // Could link to Valuation tab if it existed
            initialCirculatingSupply={
              unlocks.totalSeries[0]?.cumulative // TGE circulating
            }
            initialFloatPct={
              totalSupply
                ? ((unlocks.totalSeries[0]?.cumulative || 0) / totalSupply) * 100
                : undefined
            }
          />
        )}

        {activeTab === "emissions" && (
          <>
            <section className="grid gap-6 md:grid-cols-4">
              <div className="glass-card p-5">
                <h2 className="text-sm font-semibold text-white">Project</h2>
                <div className="mt-3 flex flex-col gap-3 text-sm">
                  <label className="flex flex-col gap-1">
                    <span className="text-neutral-200">Name</span>
                    <input
                      className="input-glass"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-neutral-200">Token symbol</span>
                    <input
                      className="input-glass"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-neutral-200">Total supply</span>
                    <input
                      type="text"
                      className="input-glass"
                      value={
                        unknownSupply
                          ? ""
                          : totalSupply
                            ? totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })
                            : ""
                      }
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/,/g, "");
                        setTotalSupply(
                          cleaned === "" ? null : parseFloat(cleaned) || null
                        );
                      }}
                      disabled={unknownSupply}
                    />
                    <label className="mt-1 flex items-center gap-2 text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        checked={unknownSupply}
                        onChange={(e) => setUnknownSupply(e.target.checked)}
                      />
                      Max supply unknown/unbounded
                    </label>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-neutral-200">Domain preset</span>
                    <select
                      className="input-glass"
                      value={domain}
                      onChange={(e) =>
                        setDomain(e.target.value as keyof typeof domainPresets)
                      }
                    >
                      {Object.keys(domainPresets).map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn-primary"
                    onClick={handleNormalize}
                    disabled={groups.length === 0}
                  >
                    Normalize allocations
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save project"}
                  </button>
                  {message ? (
                    <p className="text-xs text-neutral-200">{message}</p>
                  ) : null}

                  <div className="mt-6 border-t border-white/[0.06] pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-neutral-200">
                        Saved projects
                      </h3>
                      <button
                        className="text-[11px] text-neutral-300 underline"
                        onClick={fetchProjects}
                        disabled={loadingList}
                      >
                        {loadingList ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                    <div className="mt-2 space-y-2 text-xs text-neutral-200">
                      {savedProjects.length === 0 ? (
                        <p className="text-neutral-500">None yet.</p>
                      ) : (
                        savedProjects.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between glass-surface px-3 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">
                                {p.name}
                              </span>
                              <span className="text-[11px] text-neutral-400">
                                {p.domain} · {p.tokenSymbol}
                              </span>
                            </div>
                            <button
                              className="rounded-lg border border-white/[0.1] px-2 py-1 text-[11px] text-slate-200 bg-[rgba(15,20,28,0.5)]"
                              onClick={() => handleLoadProject(p)}
                            >
                              Load
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-5 md:col-span-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">
                    Distribution groups
                  </h2>
                  {totalError ? (
                    <span className="text-xs font-medium text-red-400">
                      Allocations must total 100% (current: {stats.total.toFixed(2)}
                      %)
                    </span>
                  ) : (
                    <span className="text-xs text-green-400">
                      Allocations sum to 100%
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-200">
                  <button
                    className="select-glass"
                    onClick={() =>
                      setGroups((prev) => [
                        ...prev,
                        {
                          name: "New Group",
                          allocationPct: 5,
                          type: "EXTERNAL",
                          category: categoriesPreset[0] || "Uncategorized",
                          tgeUnlockPct: 0,
                          cliffMonths: 0,
                          vestMonths: 12,
                          unlockFrequency: "MONTHLY",
                          startMonth: 0,
                          sellPreset: "CONSERVATIVE",
                          includeInSellPressure: true,
                        },
                      ])
                    }
                  >
                    + Add group
                  </button>
                  <span className="text-neutral-400">
                    Edit rows; delete via “✕”.
                  </span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-white">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-300">
                        <th className="px-2 py-2">Actions</th>
                        <th className="px-2 py-2">Name</th>
                        <th className="px-2 py-2">Alloc %</th>
                        <th className="px-2 py-2">Category</th>
                        <th className="px-2 py-2">Color</th>
                        <th className="px-2 py-2">TGE %</th>
                        <th className="px-2 py-2">Cliff</th>
                        <th className="px-2 py-2">Vest (mo)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g, i) => (
                        <tr key={i} className="border-b border-white/[0.06]">
                          <td className="px-2 py-2">
                            <button
                              className="text-red-400"
                              onClick={() =>
                                setGroups((prev) => prev.filter((_, idx) => idx !== i))
                              }
                            >
                              ✕
                            </button>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className="input-glass text-sm"
                              style={{ width: '210px' }}
                              value={g.name}
                              onChange={(e) =>
                                handleUpdateGroup(i, "name", e.target.value)
                              }
                            />
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="input-glass text-sm text-center"
                              style={{ width: '65px', padding: '0.5rem 0.25rem' }}
                              value={g.allocationPct}
                              onChange={(e) =>
                                handleUpdateGroup(
                                  i,
                                  "allocationPct",
                                  parseFloat(e.target.value)
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              className="input-glass text-sm"
                              value={g.category}
                              onChange={(e) =>
                                handleUpdateGroup(i, "category", e.target.value)
                              }
                            >
                              {categoriesPreset.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="color"
                              className="h-8 input-glass text-sm"
                              style={{ width: '45px' }}
                              value={g.color || COLORS[i % COLORS.length]}
                              onChange={(e) =>
                                handleUpdateGroup(i, "color", e.target.value)
                              }
                            />
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="input-glass text-sm text-center"
                              style={{ width: '65px', padding: '0.5rem 0.25rem' }}
                              value={g.tgeUnlockPct ?? 0}
                              onChange={(e) =>
                                handleUpdateGroup(
                                  i,
                                  "tgeUnlockPct",
                                  parseFloat(e.target.value)
                                )
                              }
                            />
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="input-glass text-sm text-center"
                              style={{ width: '65px', padding: '0.5rem 0.25rem' }}
                              value={g.cliffMonths ?? 0}
                              onChange={(e) =>
                                handleUpdateGroup(
                                  i,
                                  "cliffMonths",
                                  parseInt(e.target.value || "0", 10)
                                )
                              }
                            />
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="input-glass text-sm text-center"
                              style={{ width: '65px', padding: '0.5rem 0.25rem' }}
                              value={g.vestMonths ?? 0}
                              onChange={(e) =>
                                handleUpdateGroup(
                                  i,
                                  "vestMonths",
                                  parseInt(e.target.value || "0", 10)
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-white">Distribution Over time</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-neutral-200">
                    <span>Months:</span>
                    <input
                      type="number"
                      min="12"
                      max="120"
                      className="w-20 input-glass text-sm"
                      value={horizonMonths}
                      onChange={(e) => {
                        const val = parseInt(e.target.value || "36", 10);
                        setHorizonMonths(Math.max(12, Math.min(120, val)));
                        if (selectedMonth > val) setSelectedMonth(val);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {groups.map((g, idx) => (
                  <div
                    key={g.name}
                    className="flex items-center gap-2 glass-surface px-3 py-2 text-slate-200"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: g.color || COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-[11px]">{g.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-1">
                <div className="h-[24rem] glass-surface p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-neutral-200">
                      Distribution (pie)
                    </div>
                    <button
                      className={`rounded px-2 py-1 text-[10px] transition ${pieChartMode === "instantaneous"
                        ? "bg-blue-600 text-white"
                        : "border border-white/[0.1] text-slate-400"
                        }`}
                      onClick={() =>
                        setPieChartMode((prev) =>
                          prev === "endState" ? "instantaneous" : "endState"
                        )
                      }
                    >
                      {pieChartMode === "endState" ? "End State" : "Instantaneous"}
                    </button>
                  </div>

                  {pieChartMode === "instantaneous" && (
                    <div className="mt-2 flex flex-col gap-1">
                      <label className="text-[10px] text-neutral-400">
                        Month: {selectedMonth}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={horizonMonths}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                        className="w-full"
                      />
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height={pieChartMode === "instantaneous" ? 290 : 350}>
                    <PieChart>
                      <Pie
                        data={pieChartMode === "endState" ? groups : instantaneousDistribution}
                        dataKey="allocationPct"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        label={(entry: any) =>
                          pieChartMode === "endState"
                            ? `${entry.allocationPct?.toFixed(2)}%`
                            : entry.name
                        }
                        labelLine={true}
                      >
                        {(pieChartMode === "endState" ? groups : instantaneousDistribution).map((g, idx) => (
                          <Cell
                            key={g.name}
                            fill={g.color || COLORS[idx % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined, name: string | undefined) => {
                          if (value === undefined) return '';
                          return [`${value.toFixed(2)}%`, name || ''];
                        }}
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '4px',
                          color: '#f3f4f6'
                        }}
                        labelStyle={{ color: '#f3f4f6' }}
                        itemStyle={{ color: '#f3f4f6' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-[28rem] glass-surface p-4">
                  <div className="text-xs font-semibold text-neutral-200">
                    Unlocks over time (stacked cumulative, {horizonMonths} months)
                  </div>
                  <ResponsiveContainer width="100%" height={410}>
                    <BarChart
                      data={unlocks.totalSeries.slice(0, horizonMonths + 1).map((row, idx) => {
                        const obj: Record<string, number | string> = {
                          month: `M${idx}`,
                        };
                        groups.forEach((g) => {
                          const found = unlocks.byGroup.find(
                            (bg) => bg.name === g.name
                          );
                          obj[g.name] = found?.series[idx]?.cumulative ?? 0;
                        });
                        return obj;
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="month"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        tickFormatter={(value) => {
                          if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
                          if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                          if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
                          return value.toString();
                        }}
                      />
                      <Tooltip
                        formatter={(value: number | undefined, name: string | undefined) => {
                          if (value === undefined) return '';
                          return [fmt(value), name || ''];
                        }}
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '4px' }}
                        labelStyle={{ color: '#d1d5db' }}
                      />
                      {groups.map((g, idx) => (
                        <Bar
                          key={g.name}
                          dataKey={g.name}
                          stackId="a"
                          fill={g.color || COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "demand" && (
          <>
            <section className="glass-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-white">Token Demand Settings</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-neutral-200">
                    <span>Time Horizon (months):</span>
                    <input
                      type="number"
                      min="12"
                      max="120"
                      className="w-20 input-glass text-sm"
                      value={demandHorizonMonths}
                      onChange={(e) => {
                        const val = parseInt(e.target.value || "36", 10);
                        setDemandHorizonMonths(Math.max(12, Math.min(120, val)));
                      }}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDemandUnit("tokens")}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${demandUnit === "tokens"
                        ? "bg-blue-600 text-white"
                        : "border border-white/[0.1] text-slate-400 hover:text-white hover:border-cyan-500/30"
                        }`}
                    >
                      Tokens
                    </button>
                    <button
                      onClick={() => setDemandUnit("usd")}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${demandUnit === "usd"
                        ? "bg-blue-600 text-white"
                        : "border border-white/[0.1] text-slate-400 hover:text-white hover:border-cyan-500/30"
                        }`}
                    >
                      USD
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDemandViewMode("period")}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${demandViewMode === "period"
                        ? "bg-blue-600 text-white"
                        : "border border-white/[0.1] text-slate-400 hover:text-white hover:border-cyan-500/30"
                        }`}
                    >
                      Per-Period
                    </button>
                    <button
                      onClick={() => setDemandViewMode("cumulative")}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${demandViewMode === "cumulative"
                        ? "bg-blue-600 text-white"
                        : "border border-white/[0.1] text-slate-400 hover:text-white hover:border-cyan-500/30"
                        }`}
                    >
                      Cumulative
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-neutral-200">
                <p className="text-xs text-neutral-400">
                  Configure demand sources below to model token buy pressure over time
                </p>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Demand Sources</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {demandSources.map((source) => (
                  <DemandSourceCard
                    key={source.id}
                    source={source}
                    onUpdate={(updated) => {
                      setDemandSources((prev) =>
                        prev.map((s) => (s.id === updated.id ? updated : s))
                      );
                    }}
                    onToggle={(enabled) => {
                      setDemandSources((prev) =>
                        prev.map((s) => (s.id === source.id ? { ...s, enabled } : s))
                      );
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-sm font-semibold text-white mb-4">
                Token Demand Visualization ({demandViewMode === "cumulative" ? "Cumulative" : "Per-Period"})
              </h2>

              {demandData.bySource.length === 0 ? (
                <div className="glass-surface p-8 text-center">
                  <p className="text-sm text-neutral-400">
                    Enable demand sources above to see the demand chart
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-3 text-xs">
                    {demandData.bySource.map((src, idx) => (
                      <div
                        key={src.type}
                        className="flex items-center gap-2 glass-surface px-3 py-2 text-slate-200"
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: `hsl(${120 + idx * 15}, 70%, ${45 + idx * 5}%)` }}
                        />
                        <span className="text-[11px]">{src.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-[28rem] glass-surface p-4">
                    <ResponsiveContainer width="100%" height={410}>
                      <BarChart
                        data={demandData.totalSeries.slice(0, demandHorizonMonths + 1).map((row, idx) => {
                          const obj: Record<string, number | string> = {
                            month: `M${idx}`,
                          };
                          demandData.bySource.forEach((src) => {
                            const dataPoint = src.series[idx];
                            obj[src.name] = demandUnit === "tokens" ? (dataPoint?.tokens || 0) : (dataPoint?.usd || 0);
                          });
                          return obj;
                        })}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis
                          dataKey="month"
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af', fontSize: 11 }}
                        />
                        <YAxis
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af', fontSize: 11 }}
                          tickFormatter={(value) => {
                            if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
                            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                            if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
                            return value.toString();
                          }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined, name: string | undefined) => {
                            if (value === undefined) return '';
                            return [fmt(value), name || ''];
                          }}
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '4px' }}
                          labelStyle={{ color: '#d1d5db' }}
                        />
                        {demandData.bySource.map((src, idx) => (
                          <Bar
                            key={src.name}
                            dataKey={src.name}
                            stackId="a"
                            fill={`hsl(${120 + idx * 15}, 70%, ${45 + idx * 5}%)`}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 glass-surface p-4">
                    <h3 className="text-xs font-semibold text-white mb-2">Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-neutral-200">
                      <div>
                        <div className="text-[11px] uppercase text-neutral-500">Total Demand</div>
                        <div className="font-semibold">
                          {demandUnit === "tokens"
                            ? fmt(demandData.totalSeries[demandHorizonMonths]?.tokens || 0)
                            : `$${fmt(demandData.totalSeries[demandHorizonMonths]?.usd || 0)}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-neutral-500">Active Sources</div>
                        <div className="font-semibold">{demandData.bySource.length}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-neutral-500">Horizon</div>
                        <div className="font-semibold">{demandHorizonMonths} months</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-neutral-500">View Mode</div>
                        <div className="font-semibold capitalize">{demandViewMode}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Sell Pressure Section */}
            <section className="glass-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Modeling Sell Pressure: Cost Basis and Potential Sources of Sell Pressure
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Configure sell pressure for each distribution group. Profit multipliers and price-dependent factors will be applied to base rates.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-neutral-200">
                  <span>Current Token Price ($):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-24 input-glass text-sm"
                    value={currentTokenPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value || "1");
                      setCurrentTokenPrice(Math.max(0.01, val));
                    }}
                  />
                </label>
              </div>

              <SellPressureTable
                configs={sellPressureConfigs}
                totalSupply={unknownSupply ? DEFAULT_TOTAL_SUPPLY : totalSupply || DEFAULT_TOTAL_SUPPLY}
                onUpdateConfig={handleUpdateSellPressureConfig}
                distributionColors={groups.map((g) => g.color || COLORS[0])}
              />
            </section>

            {/* Sell Pressure Charts */}
            <section className="glass-card p-5">
              <h2 className="text-sm font-semibold text-white mb-4">
                Market Pressure Analysis
              </h2>

              {/* Chart 1: Token Demand (already shown above, just label it) */}
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">
                  1. Token Demand (Buy Pressure)
                </h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Already displayed in the demand visualization above
                </p>
              </div>

              {/* Chart 2: Sell Pressure */}
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">
                  2. Sell Pressure (Token Sales)
                </h3>
                {sellPressureData.byGroup.length === 0 ? (
                  <div className="glass-surface p-8 text-center">
                    <p className="text-sm text-neutral-400">
                      No sell pressure data. Configure distribution groups and sell pressure settings above.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap gap-3 text-xs">
                      {sellPressureData.byGroup.map((group, idx) => (
                        <div
                          key={group.groupId}
                          className="flex items-center gap-2 glass-surface px-3 py-2 text-slate-200"
                        >
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: `hsl(${0 + idx * 8}, 65%, ${45 + idx * 4}%)` }}
                          />
                          <span className="text-[11px]">{group.groupName}</span>
                        </div>
                      ))}
                    </div>

                    <div className="h-[28rem] glass-surface p-4">
                      <ResponsiveContainer width="100%" height={410}>
                        <BarChart
                          data={sellPressureData.totalSeries.slice(0, demandHorizonMonths + 1).map((row, idx) => {
                            const obj: Record<string, number | string> = {
                              month: `M${idx}`,
                            };
                            sellPressureData.byGroup.forEach((group) => {
                              const dataPoint = group.series[idx];
                              obj[group.groupName] = demandUnit === "tokens" ? (dataPoint?.tokens || 0) : (dataPoint?.usd || 0);
                            });
                            return obj;
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis
                            dataKey="month"
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                          />
                          <YAxis
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                            tickFormatter={(value) => {
                              if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
                              if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                              if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
                              return value.toString();
                            }}
                          />
                          <Tooltip
                            formatter={(value: number | undefined, name: string | undefined) => {
                              if (value === undefined) return '';
                              return [fmt(value), name || ''];
                            }}
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '4px' }}
                            labelStyle={{ color: '#d1d5db' }}
                          />
                          {sellPressureData.byGroup.map((group, idx) => (
                            <Bar
                              key={group.groupId}
                              dataKey={group.groupName}
                              stackId="a"
                              fill={`hsl(${0 + idx * 8}, 65%, ${45 + idx * 4}%)`}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>

              {/* Chart 3: Net Pressure */}
              <div>
                <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">
                  3. Net Market Pressure (Demand - Sell)
                </h3>
                {netPressureData.series.length === 0 ? (
                  <div className="glass-surface p-8 text-center">
                    <p className="text-sm text-neutral-400">
                      No net pressure data available
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="h-[28rem] glass-surface p-4">
                      <ResponsiveContainer width="100%" height={410}>
                        <BarChart
                          data={netPressureData.series.slice(0, demandHorizonMonths + 1).map((row) => ({
                            month: `M${row.month}`,
                            net: demandUnit === "tokens" ? row.net : row.net * currentTokenPrice,
                            demand: demandUnit === "tokens" ? row.demand : row.demand * currentTokenPrice,
                            sellPressure: demandUnit === "tokens" ? row.sellPressure : row.sellPressure * currentTokenPrice,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis
                            dataKey="month"
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                          />
                          <YAxis
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                            tickFormatter={(value) => {
                              const absValue = Math.abs(value);
                              if (absValue >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
                              if (absValue >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                              if (absValue >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
                              return value.toString();
                            }}
                          />
                          <Tooltip
                            formatter={(value: number | undefined, name: string | undefined) => {
                              if (value === undefined) return '';
                              const label = name === 'net' ? 'Net Pressure' : name === 'demand' ? 'Total Demand' : 'Total Sell';
                              return [fmt(value), label];
                            }}
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '4px' }}
                            labelStyle={{ color: '#d1d5db' }}
                          />
                          <Bar
                            dataKey="net"
                          >
                            {netPressureData.series.slice(0, demandHorizonMonths + 1).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.net >= 0 ? 'hsl(120, 60%, 45%)' : 'hsl(0, 65%, 50%)'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 glass-surface p-4">
                      <h3 className="text-xs font-semibold text-white mb-2">Net Pressure Insights</h3>
                      <div className="grid grid-cols-2 gap-4 text-xs text-neutral-200 md:grid-cols-4">
                        <div>
                          <div className="text-[11px] uppercase text-neutral-500">Net Pressure</div>
                          <div className={`font-semibold ${netPressureData.metadata.netPressure >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {netPressureData.metadata.netPressure >= 0 ? '+' : ''}{fmt(netPressureData.metadata.netPressure)} tokens
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-neutral-500">Demand/Sell Ratio</div>
                          <div className="font-semibold">
                            {netPressureData.metadata.demandSellRatio === Infinity
                              ? '∞'
                              : netPressureData.metadata.demandSellRatio.toFixed(2)}x
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-neutral-500">Market Sentiment</div>
                          <div className="font-semibold">
                            {netPressureData.metadata.demandSellRatio > 1.2 ? (
                              <span className="text-green-400">Bullish</span>
                            ) : netPressureData.metadata.demandSellRatio < 0.8 ? (
                              <span className="text-red-400">Bearish</span>
                            ) : (
                              <span className="text-yellow-400">Neutral</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-neutral-500">Equilibrium</div>
                          <div className="font-semibold">
                            {netPressureData.metadata.equilibriumMonth !== null
                              ? `Month ${netPressureData.metadata.equilibriumMonth}`
                              : 'Not reached'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Comprehensive Summary Stats Panel */}
            <section className="glass-card p-5">
              <h2 className="text-sm font-semibold text-white mb-4">
                Market Dynamics Summary
              </h2>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Demand Card */}
                <div className="glass-surface p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-1">Total Demand</div>
                  <div className="text-lg font-bold text-green-400">{fmt(netPressureData.metadata.totalDemand)}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">tokens over {demandHorizonMonths}mo</div>
                </div>

                {/* Total Sell Pressure Card */}
                <div className="glass-surface p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-1">Total Sell Pressure</div>
                  <div className="text-lg font-bold text-red-400">{fmt(netPressureData.metadata.totalSellPressure)}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">tokens over {demandHorizonMonths}mo</div>
                </div>

                {/* Avg Monthly Demand Card */}
                <div className="glass-surface p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-1">Avg Monthly Demand</div>
                  <div className="text-lg font-bold text-white">
                    {fmt(netPressureData.metadata.totalDemand / (demandHorizonMonths + 1))}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">tokens per month</div>
                </div>

                {/* Avg Monthly Sell Card */}
                <div className="glass-surface p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-1">Avg Monthly Sell</div>
                  <div className="text-lg font-bold text-white">
                    {fmt(sellPressureData.metadata.avgMonthlySell)}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">tokens per month</div>
                </div>

                {/* Peak Sell Month Card */}
                <div className="glass-surface p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-1">Peak Sell Month</div>
                  <div className="text-lg font-bold text-orange-400">
                    Month {sellPressureData.metadata.peakSellMonth}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">highest sell pressure</div>
                </div>

                {/* Highest Risk Group Card */}
                <div className="glass-surface p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-1">Highest Risk Group</div>
                  <div className="text-sm font-bold text-white truncate">
                    {(() => {
                      const riskGroup = sellPressureConfigs
                        .filter(c => c.enabled && c.preset !== 'not_seller')
                        .sort((a, b) => {
                          const aRisk = SELL_PRESSURE_PRESETS[a.preset].defaultRate;
                          const bRisk = SELL_PRESSURE_PRESETS[b.preset].defaultRate;
                          return bRisk - aRisk;
                        })[0];
                      return riskGroup ? riskGroup.groupName : 'N/A';
                    })()}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">most aggressive seller</div>
                </div>

                {/* Lowest Risk Group Card */}
                <div className="glass-surface p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-1">Lowest Risk Group</div>
                  <div className="text-sm font-bold text-white truncate">
                    {(() => {
                      const safestGroup = sellPressureConfigs
                        .filter(c => c.enabled)
                        .sort((a, b) => {
                          const aRisk = SELL_PRESSURE_PRESETS[a.preset].defaultRate;
                          const bRisk = SELL_PRESSURE_PRESETS[b.preset].defaultRate;
                          return aRisk - bRisk;
                        })[0];
                      return safestGroup ? safestGroup.groupName : 'N/A';
                    })()}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">most conservative</div>
                </div>

                {/* Market Sentiment Score Card */}
                <div className="glass-surface p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-1">Sentiment Score</div>
                  <div className="text-lg font-bold">
                    {(() => {
                      const ratio = netPressureData.metadata.demandSellRatio;
                      const score = ratio === Infinity ? 100 : Math.min(100, Math.max(0, (ratio - 0.5) * 50));
                      const color = score > 60 ? 'text-green-400' : score > 40 ? 'text-yellow-400' : 'text-red-400';
                      return <span className={color}>{score.toFixed(0)}/100</span>;
                    })()}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">market health indicator</div>
                </div>
              </div>
            </section>
          </>
        )}



        {activeTab === "staking" && (
          <StakingTab />
        )}
      </main>

      {/* Vertical Simulator Button - Fixed Right Edge */}
      <button
        onClick={() => setIsSimulatorSidebarOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 rotate-90 origin-center rounded-t-lg border border-blue-600 bg-blue-600/10 px-6 py-3 text-sm font-medium text-blue-400 shadow-lg transition-all hover:bg-blue-600/20 hover:shadow-xl"
        style={{ transformOrigin: 'center center' }}
      >
        Simulators
      </button>

      {/* Simulator Sidebar */}
      <SimulatorSidebar
        isOpen={isSimulatorSidebarOpen}
        onClose={() => setIsSimulatorSidebarOpen(false)}
      />
    </div>
  );
}
