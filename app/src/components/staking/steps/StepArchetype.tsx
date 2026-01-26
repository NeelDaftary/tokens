"use client";

import type { StakingModel, StakingArchetype } from "@/types/staking";
import { ARCHETYPE_INFO, getArchetypeFeatures } from "../StakingWizardSteps";
import { stakingPresets } from "@/data/presets/stakingPresets";

interface StepArchetypeProps {
  model: StakingModel;
  updateModel: (updates: Partial<StakingModel>) => void;
}

export default function StepArchetype({ model, updateModel }: StepArchetypeProps) {
  const handleArchetypeChange = (archetype: StakingArchetype) => {
    // Find a preset for this archetype
    const preset = stakingPresets.find((p) => p.model.archetype === archetype);
    if (preset) {
      // Load preset but preserve any user-set token basics
      updateModel({
        ...preset.model,
        tokenSymbol: model.tokenSymbol,
        totalSupply: model.totalSupply,
        circulatingSupply0: model.circulatingSupply0,
        initialPrice: model.initialPrice,
      });
    } else {
      updateModel({ archetype });
    }
  };

  const handleLoadPreset = (presetName: string) => {
    const preset = stakingPresets.find((p) => p.name === presetName);
    if (preset) {
      updateModel({
        ...preset.model,
        tokenSymbol: model.tokenSymbol,
        totalSupply: model.totalSupply,
        circulatingSupply0: model.circulatingSupply0,
        initialPrice: model.initialPrice,
      });
    }
  };

  const features = getArchetypeFeatures(model.archetype);
  const presetsForArchetype = stakingPresets.filter(
    (p) => p.model.archetype === model.archetype
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Select Staking Archetype</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Choose the staking model that best matches your protocol. This determines which features and parameters are relevant.
        </p>
      </div>

      {/* Archetype Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ARCHETYPE_INFO.map((arch) => {
          const isSelected = model.archetype === arch.id;
          
          return (
            <button
              key={arch.id}
              onClick={() => handleArchetypeChange(arch.id)}
              className={`
                p-4 rounded-xl text-left transition-all
                ${isSelected
                  ? "bg-cyan-500/15 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                  : "bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]"
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{arch.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isSelected ? "text-cyan-400" : "text-white"}`}>
                    {arch.name}
                  </div>
                  <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                    {arch.description}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {arch.examples}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-cyan-400">✓</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Features Preview */}
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <h3 className="text-sm font-medium text-white mb-3">
          Features for {ARCHETYPE_INFO.find(a => a.id === model.archetype)?.name}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <FeatureTag label="Exit Queue" enabled={features.showExitQueue} />
          <FeatureTag label={features.unbondingLabel} enabled={features.showUnbondingPeriod} />
          <FeatureTag label="Lock Durations" enabled={features.showLockDurations} />
          <FeatureTag label="Operator Commission" enabled={features.showOperatorCommission} />
          <FeatureTag label={features.riskLabel} enabled={features.showSlashingRisk} />
          <FeatureTag label="MEV Rewards" enabled={features.showMevRewards} />
          <FeatureTag label="Gauges & Bribes" enabled={features.showGaugesAndBribes} />
          <FeatureTag label="LST Yield Boost" enabled={features.showLstYield} />
          <FeatureTag label="Restaking Yield" enabled={features.showRestakingYield} />
        </div>
      </div>

      {/* Presets for selected archetype */}
      {presetsForArchetype.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Quick Start Presets</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {presetsForArchetype.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleLoadPreset(preset.name)}
                className={`
                  p-3 rounded-lg text-left transition-all
                  ${model.name === preset.name
                    ? "bg-cyan-500/10 border border-cyan-500/30"
                    : "bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]"
                  }
                `}
              >
                <div className="text-sm font-medium text-white">{preset.name}</div>
                <div className="text-xs text-neutral-400 mt-1">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hybrid Mode Toggle */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <input
          type="checkbox"
          id="hybridMode"
          checked={model.hybridMode}
          onChange={(e) => updateModel({ hybridMode: e.target.checked })}
          className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-cyan-500 focus:ring-cyan-500"
        />
        <label htmlFor="hybridMode" className="flex-1">
          <span className="text-sm font-medium text-white">Hybrid Mode</span>
          <p className="text-xs text-neutral-400 mt-0.5">
            Combine multiple staking archetypes (e.g., LST + Restaking)
          </p>
        </label>
      </div>
    </div>
  );
}

function FeatureTag({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={`
      flex items-center gap-2 px-2 py-1 rounded
      ${enabled 
        ? "bg-green-500/10 text-green-400" 
        : "bg-white/[0.02] text-neutral-500"
      }
    `}>
      <span>{enabled ? "✓" : "○"}</span>
      <span>{label}</span>
    </div>
  );
}
