"use client";

import { useState, useMemo } from "react";
import type { StakingModel } from "@/types/staking";
import { computeStakingSeries } from "@/lib/stakingEngine";
import { stakingPresets } from "@/data/presets/stakingPresets";

import StakingWizardNav from "./StakingWizardNav";
import { STAKING_STEPS, type StakingStepId, getArchetypeFeatures, ARCHETYPE_INFO } from "./StakingWizardSteps";
import { applyPrePopulatedData, type StakingTabProps } from "./StakingWizardTypes";

// Step components
import StepArchetype from "./steps/StepArchetype";
import StepTokenBasics from "./steps/StepTokenBasics";
import StepResults from "./steps/StepResults";

interface StakingWizardProps extends StakingTabProps {}

export default function StakingWizard(props: StakingWizardProps) {
  const [currentStep, setCurrentStep] = useState<StakingStepId>("archetype");
  const [showResults, setShowResults] = useState(false);
  
  // Initialize model with pre-populated data
  const [model, setModel] = useState<StakingModel>(() => {
    const baseModel = stakingPresets[0].model;
    return applyPrePopulatedData(baseModel, props);
  });

  // Compute outputs (only when showing results for performance)
  const outputs = useMemo(() => {
    if (!showResults && currentStep !== "results") return null;
    try {
      return computeStakingSeries(model);
    } catch (error) {
      console.error("Staking computation error:", error);
      return null;
    }
  }, [model, showResults, currentStep]);

  const updateModel = (updates: Partial<StakingModel>) => {
    setModel((prev) => ({ ...prev, ...updates }));
    props.onModelChange?.({ ...model, ...updates });
  };

  const currentIndex = STAKING_STEPS.findIndex((s) => s.id === currentStep);

  const handleStepChange = (step: StakingStepId) => {
    if (step === "results") {
      setShowResults(true);
    }
    setCurrentStep(step);
  };

  // Validation for "Next" button
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case "archetype":
        return true; // Always valid
      case "token":
        return model.totalSupply > 0 && model.circulatingSupply0 > 0;
      case "rewards":
        return true; // Has defaults
      case "mechanics":
        return true; // Has defaults
      case "demand":
        return model.demand.baseParticipation >= 0 && model.demand.maxParticipation > 0;
      default:
        return true;
    }
  }, [currentStep, model]);

  const renderStep = () => {
    switch (currentStep) {
      case "archetype":
        return <StepArchetype model={model} updateModel={updateModel} />;
      
      case "token":
        return (
          <StepTokenBasics
            model={model}
            updateModel={updateModel}
            prePopulatedProps={props}
          />
        );
      
      case "rewards":
        return <StepRewardsPlaceholder model={model} updateModel={updateModel} />;
      
      case "mechanics":
        return <StepMechanicsPlaceholder model={model} updateModel={updateModel} />;
      
      case "demand":
        return <StepDemandPlaceholder model={model} updateModel={updateModel} />;
      
      case "results":
        if (!outputs) {
          return (
            <div className="p-8 text-center text-neutral-400">
              Unable to compute results. Please check your configuration.
            </div>
          );
        }
        return <StepResults model={model} outputs={outputs} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard navigation */}
      <StakingWizardNav
        currentStep={currentStep}
        onStepChange={handleStepChange}
        canProceed={canProceed}
      />

      {/* Step content */}
      <div className="glass-card p-6">
        {renderStep()}
      </div>
    </div>
  );
}

// ========== Step: Rewards Setup ==========
function StepRewardsPlaceholder({ model, updateModel }: { model: StakingModel; updateModel: (updates: Partial<StakingModel>) => void }) {
  const features = getArchetypeFeatures(model.archetype);
  const archetypeInfo = ARCHETYPE_INFO.find(a => a.id === model.archetype);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Rewards Setup</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Configure reward sources for {archetypeInfo?.name || model.archetype}.
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Inflation - shown for all archetypes */}
        <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
          <h3 className="text-sm font-medium text-white">Inflation Rewards</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={model.rewards.inflation.enabled}
              onChange={(e) =>
                updateModel({
                  rewards: {
                    ...model.rewards,
                    inflation: { ...model.rewards.inflation, enabled: e.target.checked },
                  },
                })
              }
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-neutral-300">Enable inflation rewards</span>
          </label>
          {model.rewards.inflation.enabled && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-400">Annual Inflation Rate (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={model.rewards.inflation.annualInflationRate * 100}
                  onChange={(e) =>
                    updateModel({
                      rewards: {
                        ...model.rewards,
                        inflation: {
                          ...model.rewards.inflation,
                          annualInflationRate: parseFloat(e.target.value) / 100,
                        },
                      },
                    })
                  }
                  className="input-glass"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-400">% to Stakers</span>
                <input
                  type="number"
                  step="1"
                  value={model.rewards.inflation.distributionToStakersPct * 100}
                  onChange={(e) =>
                    updateModel({
                      rewards: {
                        ...model.rewards,
                        inflation: {
                          ...model.rewards.inflation,
                          distributionToStakersPct: parseFloat(e.target.value) / 100,
                        },
                      },
                    })
                  }
                  className="input-glass"
                />
              </label>
            </>
          )}
        </section>

        {/* Fee Rewards - shown for all archetypes */}
        <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
          <h3 className="text-sm font-medium text-white">Fee Rewards</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={model.rewards.fees.enabled}
              onChange={(e) =>
                updateModel({
                  rewards: {
                    ...model.rewards,
                    fees: { ...model.rewards.fees, enabled: e.target.checked },
                  },
                })
              }
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-neutral-300">Enable fee rewards</span>
          </label>
          {model.rewards.fees.enabled && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-400">Fees per {model.timeStep} (USD)</span>
                <input
                  type="number"
                  value={model.rewards.fees.feesPerStep || 0}
                  onChange={(e) =>
                    updateModel({
                      rewards: {
                        ...model.rewards,
                        fees: {
                          ...model.rewards.fees,
                          feesPerStep: parseFloat(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  className="input-glass"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-400">% to Stakers</span>
                <input
                  type="number"
                  step="1"
                  value={model.rewards.fees.feeShareToStakersPct * 100}
                  onChange={(e) =>
                    updateModel({
                      rewards: {
                        ...model.rewards,
                        fees: {
                          ...model.rewards.fees,
                          feeShareToStakersPct: parseFloat(e.target.value) / 100,
                        },
                      },
                    })
                  }
                  className="input-glass"
                />
              </label>
            </>
          )}
        </section>

        {/* MEV Rewards - only for consensus, liquid_staking, restaking */}
        {features.showMevRewards && (
          <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
            <h3 className="text-sm font-medium text-white">MEV Rewards</h3>
            <p className="text-xs text-neutral-500">
              Additional value from block production (tips, arbitrage, etc.)
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">MEV per {model.timeStep} (USD)</span>
              <input
                type="number"
                value={model.consensus?.mevPerStep || 0}
                onChange={(e) =>
                  updateModel({
                    consensus: {
                      ...model.consensus!,
                      mevPerStep: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
          </section>
        )}

        {/* Gauges & Bribes - only for ve_governance */}
        {features.showGaugesAndBribes && (
          <section className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-4">
            <h3 className="text-sm font-medium text-cyan-400">🗳️ Gauges & Bribes</h3>
            <p className="text-xs text-neutral-400">
              Vote-escrow specific rewards from directing emissions
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Emissions directed by gauges (%)</span>
              <input
                type="number"
                step="1"
                value={(model.veGovernance?.emissionsDirectedByGaugesPct || 0) * 100}
                onChange={(e) =>
                  updateModel({
                    veGovernance: {
                      ...model.veGovernance!,
                      emissionsDirectedByGaugesPct: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Bribe Yield (% annual)</span>
              <input
                type="number"
                step="0.1"
                value={(model.veGovernance?.bribeYieldAnnual || 0) * 100}
                onChange={(e) =>
                  updateModel({
                    veGovernance: {
                      ...model.veGovernance!,
                      bribeYieldAnnual: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Fee share to lockers (%)</span>
              <input
                type="number"
                step="1"
                value={(model.veGovernance?.feeShareToLockersPct || 0) * 100}
                onChange={(e) =>
                  updateModel({
                    veGovernance: {
                      ...model.veGovernance!,
                      feeShareToLockersPct: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
          </section>
        )}

        {/* LST Yield - only for liquid_staking */}
        {features.showLstYield && (
          <section className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-4">
            <h3 className="text-sm font-medium text-blue-400">💧 LST Yield Boost</h3>
            <p className="text-xs text-neutral-400">
              Additional DeFi yield from using liquid staking tokens
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Extra DeFi Yield (% annual)</span>
              <input
                type="number"
                step="0.1"
                value={(model.liquidStaking?.extraDefiYieldAnnual || 0) * 100}
                onChange={(e) =>
                  updateModel({
                    liquidStaking: {
                      ...model.liquidStaking!,
                      extraDefiYieldAnnual: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
          </section>
        )}

        {/* Restaking Yield - only for restaking */}
        {features.showRestakingYield && (
          <section className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-4">
            <h3 className="text-sm font-medium text-purple-400">🔄 Restaking Yield</h3>
            <p className="text-xs text-neutral-400">
              Incremental yield from securing additional services (AVS)
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Incremental Yield (% annual)</span>
              <input
                type="number"
                step="0.1"
                value={(model.restaking?.incrementalYieldAnnual || 0) * 100}
                onChange={(e) =>
                  updateModel({
                    restaking: {
                      ...model.restaking!,
                      incrementalYieldAnnual: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Max Restake (% of stake)</span>
              <input
                type="number"
                step="1"
                value={(model.restaking?.maxRestakePctOfStake || 0) * 100}
                onChange={(e) =>
                  updateModel({
                    restaking: {
                      ...model.restaking!,
                      maxRestakePctOfStake: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
          </section>
        )}
      </div>
    </div>
  );
}

// ========== Step: Mechanics & Risk ==========
function StepMechanicsPlaceholder({ model, updateModel }: { model: StakingModel; updateModel: (updates: Partial<StakingModel>) => void }) {
  const features = getArchetypeFeatures(model.archetype);
  const archetypeInfo = ARCHETYPE_INFO.find(a => a.id === model.archetype);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Mechanics & Risk</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Configure {features.unbondingLabel.toLowerCase()}, lockups, and risk parameters for {archetypeInfo?.name || model.archetype}.
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Unbonding/Cooldown - shown for consensus, defi, liquid_staking, restaking */}
        {features.showUnbondingPeriod && (
          <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
            <h3 className="text-sm font-medium text-white">{features.unbondingLabel}</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">{features.unbondingLabel} ({model.timeStep}s)</span>
              <input
                type="number"
                value={model.staking.unbondingSteps}
                onChange={(e) =>
                  updateModel({
                    staking: { ...model.staking, unbondingSteps: parseInt(e.target.value) || 0 },
                  })
                }
                className="input-glass"
              />
            </label>
            <p className="text-xs text-neutral-500">
              {model.archetype === "consensus" && "Time validators must wait before accessing unstaked tokens."}
              {model.archetype === "defi" && "Cooldown period before exiting staking positions."}
              {model.archetype === "liquid_staking" && "Time to process withdrawals when exiting via LST redemption."}
              {model.archetype === "restaking" && "Combined unbonding from base staking and AVS withdrawal."}
            </p>
          </section>
        )}

        {/* Exit Queue - only for consensus and liquid_staking */}
        {features.showExitQueue && (
          <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
            <h3 className="text-sm font-medium text-white">Exit Queue</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={model.unstakingQueue?.enabled || false}
                onChange={(e) =>
                  updateModel({
                    unstakingQueue: {
                      enabled: e.target.checked,
                      maxExitPerStepPct: model.unstakingQueue?.maxExitPerStepPct || 0.02,
                      baseProcessingSteps: model.unstakingQueue?.baseProcessingSteps || 1,
                      queueMultiplierAtCongestion: model.unstakingQueue?.queueMultiplierAtCongestion || 5,
                    },
                  })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-neutral-300">Enable exit queue modeling</span>
            </label>
            {model.unstakingQueue?.enabled && (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-xs text-neutral-400">Max exit per {model.timeStep} (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={(model.unstakingQueue.maxExitPerStepPct || 0) * 100}
                    onChange={(e) =>
                      updateModel({
                        unstakingQueue: {
                          ...model.unstakingQueue!,
                          maxExitPerStepPct: parseFloat(e.target.value) / 100,
                        },
                      })
                    }
                    className="input-glass"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs text-neutral-400">Queue multiplier at congestion</span>
                  <input
                    type="number"
                    step="1"
                    value={model.unstakingQueue.queueMultiplierAtCongestion || 5}
                    onChange={(e) =>
                      updateModel({
                        unstakingQueue: {
                          ...model.unstakingQueue!,
                          queueMultiplierAtCongestion: parseFloat(e.target.value) || 5,
                        },
                      })
                    }
                    className="input-glass"
                  />
                </label>
              </>
            )}
          </section>
        )}

        {/* Operator Commission - only for consensus, liquid_staking, restaking */}
        {features.showOperatorCommission && (
          <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
            <h3 className="text-sm font-medium text-white">Operator Commission</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Commission Rate (%)</span>
              <input
                type="number"
                step="0.1"
                value={model.staking.operatorCommissionPct * 100}
                onChange={(e) =>
                  updateModel({
                    staking: { ...model.staking, operatorCommissionPct: parseFloat(e.target.value) / 100 },
                  })
                }
                className="input-glass"
              />
            </label>
            <p className="text-xs text-neutral-500">
              Percentage of staking rewards taken by validators/operators before distribution.
            </p>
          </section>
        )}

        {/* Lock Durations - only for defi and ve_governance */}
        {features.showLockDurations && (
          <section className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-4">
            <h3 className="text-sm font-medium text-cyan-400">
              {model.archetype === "ve_governance" ? "🗳️ Vote-Escrow Lock Durations" : "🔒 Lock Duration Boosts"}
            </h3>
            <p className="text-xs text-neutral-400">
              {model.archetype === "ve_governance" 
                ? "Longer locks = more voting power and rewards"
                : "Optional lock periods with yield multipliers"
              }
            </p>
            
            {model.archetype === "ve_governance" && model.veGovernance?.lockDurations && (
              <div className="space-y-2">
                {model.veGovernance.lockDurations.map((lock, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-400 w-20">{lock.steps} {model.timeStep}s</span>
                    <span className="text-cyan-400">{lock.votingPowerMultiplier}x voting power</span>
                  </div>
                ))}
              </div>
            )}

            {model.archetype === "ve_governance" && (
              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-400">Early Exit Penalty (%)</span>
                <input
                  type="number"
                  step="1"
                  value={(model.veGovernance?.earlyExitPenaltyPct || 0) * 100}
                  onChange={(e) =>
                    updateModel({
                      veGovernance: {
                        ...model.veGovernance!,
                        earlyExitPenaltyPct: parseFloat(e.target.value) / 100,
                      },
                    })
                  }
                  className="input-glass"
                />
              </label>
            )}

            {model.archetype === "defi" && (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-xs text-neutral-400">Default Lock ({model.timeStep}s)</span>
                  <input
                    type="number"
                    value={model.staking.lockupOptions[0]?.lockSteps || 0}
                    onChange={(e) => {
                      const newLockups = [...model.staking.lockupOptions];
                      if (newLockups.length === 0) {
                        newLockups.push({ lockSteps: parseInt(e.target.value) || 0, boost: 1 });
                      } else {
                        newLockups[0] = { ...newLockups[0], lockSteps: parseInt(e.target.value) || 0 };
                      }
                      updateModel({
                        staking: { ...model.staking, lockupOptions: newLockups },
                      });
                    }}
                    className="input-glass"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs text-neutral-400">Lock Boost Multiplier</span>
                  <input
                    type="number"
                    step="0.1"
                    value={model.staking.lockupOptions[0]?.boost || 1}
                    onChange={(e) => {
                      const newLockups = [...model.staking.lockupOptions];
                      if (newLockups.length === 0) {
                        newLockups.push({ lockSteps: 0, boost: parseFloat(e.target.value) || 1 });
                      } else {
                        newLockups[0] = { ...newLockups[0], boost: parseFloat(e.target.value) || 1 };
                      }
                      updateModel({
                        staking: { ...model.staking, lockupOptions: newLockups },
                      });
                    }}
                    className="input-glass"
                  />
                </label>
              </>
            )}
          </section>
        )}

        {/* Slashing Risk - only for consensus, liquid_staking, restaking */}
        {features.showSlashingRisk && (
          <section className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 space-y-4">
            <h3 className="text-sm font-medium text-red-400">⚠️ {features.riskLabel}</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Slash Probability (% annual)</span>
              <input
                type="number"
                step="0.01"
                value={model.risk.slashProbAnnual * 100}
                onChange={(e) =>
                  updateModel({
                    risk: { ...model.risk, slashProbAnnual: parseFloat(e.target.value) / 100 },
                  })
                }
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Slash Severity (%)</span>
              <input
                type="number"
                step="0.1"
                value={model.risk.slashSeverityPct * 100}
                onChange={(e) =>
                  updateModel({
                    risk: { ...model.risk, slashSeverityPct: parseFloat(e.target.value) / 100 },
                  })
                }
                className="input-glass"
              />
            </label>

            {/* Correlated slashing for restaking */}
            {model.archetype === "restaking" && (
              <>
                <div className="border-t border-red-500/20 pt-3 mt-3">
                  <span className="text-xs text-red-400 font-medium">Correlated Slashing (AVS)</span>
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-xs text-neutral-400">Correlated Slash Probability (% annual)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(model.restaking?.correlatedSlashProbAnnual || 0) * 100}
                    onChange={(e) =>
                      updateModel({
                        restaking: {
                          ...model.restaking!,
                          correlatedSlashProbAnnual: parseFloat(e.target.value) / 100,
                        },
                      })
                    }
                    className="input-glass"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs text-neutral-400">Correlated Slash Severity (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={(model.restaking?.correlatedSlashSeverityPct || 0) * 100}
                    onChange={(e) =>
                      updateModel({
                        restaking: {
                          ...model.restaking!,
                          correlatedSlashSeverityPct: parseFloat(e.target.value) / 100,
                        },
                      })
                    }
                    className="input-glass"
                  />
                </label>
              </>
            )}
          </section>
        )}

        {/* Smart Contract Risk - for DeFi (non-slashing risk) */}
        {model.archetype === "defi" && (
          <section className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-4">
            <h3 className="text-sm font-medium text-orange-400">⚠️ Smart Contract Risk</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Annual Risk Probability (%)</span>
              <input
                type="number"
                step="0.1"
                value={model.risk.smartContractRiskAnnual * 100}
                onChange={(e) =>
                  updateModel({
                    risk: { ...model.risk, smartContractRiskAnnual: parseFloat(e.target.value) / 100 },
                  })
                }
                className="input-glass"
              />
            </label>
            <p className="text-xs text-neutral-500">
              Probability of smart contract exploit or failure.
            </p>
          </section>
        )}

        {/* Liquidity Discount - for liquid_staking */}
        {model.archetype === "liquid_staking" && (
          <section className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-4">
            <h3 className="text-sm font-medium text-blue-400">💧 Liquidity Risk</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Expected Discount Band (%)</span>
              <input
                type="number"
                step="0.1"
                value={(model.liquidStaking?.expectedDiscountBandPct || 0) * 100}
                onChange={(e) =>
                  updateModel({
                    liquidStaking: {
                      ...model.liquidStaking!,
                      expectedDiscountBandPct: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Liquidity Discount (%)</span>
              <input
                type="number"
                step="0.1"
                value={model.risk.liquidityDiscountPct * 100}
                onChange={(e) =>
                  updateModel({
                    risk: { ...model.risk, liquidityDiscountPct: parseFloat(e.target.value) / 100 },
                  })
                }
                className="input-glass"
              />
            </label>
            <p className="text-xs text-neutral-500">
              Expected LST trading discount relative to underlying asset.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

// ========== Step: Demand Model ==========
function StepDemandPlaceholder({ model, updateModel }: { model: StakingModel; updateModel: (updates: Partial<StakingModel>) => void }) {
  const features = getArchetypeFeatures(model.archetype);
  const archetypeInfo = ARCHETYPE_INFO.find(a => a.id === model.archetype);

  // Archetype-specific participation guidance
  const getParticipationGuidance = () => {
    switch (model.archetype) {
      case "consensus":
        return {
          baseLabel: "Baseline staking ratio - sticky institutional validators",
          maxLabel: "Maximum achievable participation rate",
          baseHint: "L1 PoS typically sees 30-70% participation",
          maxHint: "Ethereum ~27%, Cosmos chains 40-70%, Solana ~70%",
        };
      case "defi":
        return {
          baseLabel: "Minimum participation from loyal users",
          maxLabel: "Maximum participation at attractive yields",
          baseHint: "DeFi staking varies wildly (5-50%)",
          maxHint: "High yields can attract mercenary capital quickly",
        };
      case "liquid_staking":
        return {
          baseLabel: "Base LST adoption among stakers",
          maxLabel: "Maximum LST penetration of total stake",
          baseHint: "Lido has ~30% of ETH staking market",
          maxHint: "LST adoption typically 20-40% of stake",
        };
      case "restaking":
        return {
          baseLabel: "Core restakers seeking extra yield",
          maxLabel: "Maximum restaking participation",
          baseHint: "Restaking is newer, adoption still growing",
          maxHint: "Limited by AVS demand and slashing risk tolerance",
        };
      case "ve_governance":
        return {
          baseLabel: "Committed long-term lockers",
          maxLabel: "Maximum ve token lockup rate",
          baseHint: "Curve has ~40% of CRV locked as veCRV",
          maxHint: "ve models typically see 30-60% lock rates",
        };
      default:
        return {
          baseLabel: "Base participation rate",
          maxLabel: "Maximum participation rate",
          baseHint: "",
          maxHint: "",
        };
    }
  };

  const guidance = getParticipationGuidance();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Demand Model</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Configure how {model.archetype === "ve_governance" ? "locking" : "staking"} participation responds to yields for {archetypeInfo?.name || model.archetype}.
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Participation */}
        <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
          <h3 className="text-sm font-medium text-white">
            {model.archetype === "ve_governance" ? "Lock Participation" : "Staking Participation"}
          </h3>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">{guidance.baseLabel} (%)</span>
            <input
              type="number"
              step="1"
              value={model.demand.baseParticipation * 100}
              onChange={(e) =>
                updateModel({
                  demand: { ...model.demand, baseParticipation: parseFloat(e.target.value) / 100 },
                })
              }
              className="input-glass"
            />
            {guidance.baseHint && (
              <span className="text-xs text-neutral-500">{guidance.baseHint}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">{guidance.maxLabel} (%)</span>
            <input
              type="number"
              step="1"
              value={model.demand.maxParticipation * 100}
              onChange={(e) =>
                updateModel({
                  demand: { ...model.demand, maxParticipation: parseFloat(e.target.value) / 100 },
                })
              }
              className="input-glass"
            />
            {guidance.maxHint && (
              <span className="text-xs text-neutral-500">{guidance.maxHint}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Adjustment Speed (per {model.timeStep})</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={model.demand.adjustmentSpeed}
              onChange={(e) =>
                updateModel({
                  demand: { ...model.demand, adjustmentSpeed: parseFloat(e.target.value) || 0 },
                })
              }
              className="input-glass"
            />
            <span className="text-xs text-neutral-500">
              How quickly participation adjusts (0 = sticky, 1 = instant)
            </span>
          </label>
        </section>

        {/* Elasticity */}
        <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
          <h3 className="text-sm font-medium text-white">Yield Elasticity</h3>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Opportunity Cost (% annual)</span>
            <input
              type="number"
              step="0.1"
              value={model.demand.opportunityCostAnnual * 100}
              onChange={(e) =>
                updateModel({
                  demand: { ...model.demand, opportunityCostAnnual: parseFloat(e.target.value) / 100 },
                })
              }
              className="input-glass"
            />
            <span className="text-xs text-neutral-500">
              {model.archetype === "defi" 
                ? "Competing DeFi yields (lending, LPing)" 
                : model.archetype === "ve_governance"
                ? "Alternative yield vs locking tokens"
                : "Risk-free rate or alternative staking yields"
              }
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Elasticity Preset</span>
            <select
              value={model.demand.elasticityPreset}
              onChange={(e) =>
                updateModel({
                  demand: { ...model.demand, elasticityPreset: e.target.value as "low" | "medium" | "high" | "custom" },
                })
              }
              className="input-glass"
            >
              <option value="low">Low (sticky, institutional)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="high">High (mercenary, yield-sensitive)</option>
            </select>
            <span className="text-xs text-neutral-500">
              {model.archetype === "consensus" && "L1 validators tend to be low elasticity (institutional)"}
              {model.archetype === "defi" && "DeFi stakers are often high elasticity (yield chasers)"}
              {model.archetype === "liquid_staking" && "LST users vary - some sticky, some yield farming"}
              {model.archetype === "restaking" && "Restakers seek incremental yield, moderate elasticity"}
              {model.archetype === "ve_governance" && "ve lockers are committed, low elasticity"}
            </span>
          </label>
        </section>

        {/* Risk Penalty */}
        <section className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
          <h3 className="text-sm font-medium text-white">Risk Penalty</h3>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Combined Risk Penalty (% annual)</span>
            <input
              type="number"
              step="0.1"
              value={model.demand.riskPenaltyAnnual * 100}
              onChange={(e) =>
                updateModel({
                  demand: { ...model.demand, riskPenaltyAnnual: parseFloat(e.target.value) / 100 },
                })
              }
              className="input-glass"
            />
            <span className="text-xs text-neutral-500">
              {features.showSlashingRisk 
                ? "Discount stakers apply for slashing, downtime, smart contract risk"
                : "Discount stakers apply for lockup illiquidity and smart contract risk"
              }
            </span>
          </label>
        </section>

        {/* Lockup Penalty Model - relevant for ve_governance and defi */}
        {features.showLockDurations && (
          <section className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-4">
            <h3 className="text-sm font-medium text-cyan-400">
              {model.archetype === "ve_governance" ? "🗳️ Lock Duration Penalty" : "🔒 Lockup Demand Impact"}
            </h3>
            <p className="text-xs text-neutral-400">
              How lockup requirements affect participation demand
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Penalty per lock {model.timeStep} (%)</span>
              <input
                type="number"
                step="0.1"
                value={model.demand.lockupPenaltyModel.penaltyPerLockStep * 100}
                onChange={(e) =>
                  updateModel({
                    demand: {
                      ...model.demand,
                      lockupPenaltyModel: {
                        ...model.demand.lockupPenaltyModel,
                        penaltyPerLockStep: parseFloat(e.target.value) / 100,
                      },
                    },
                  })
                }
                className="input-glass"
              />
              <span className="text-xs text-neutral-500">
                Longer locks reduce participation demand by this amount per {model.timeStep}
              </span>
            </label>
          </section>
        )}

        {/* LST Adoption Curve - for liquid_staking */}
        {model.archetype === "liquid_staking" && (
          <section className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-4">
            <h3 className="text-sm font-medium text-blue-400">💧 LST Adoption Curve</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Max LST Adoption (% of stakers)</span>
              <input
                type="number"
                step="1"
                value={(model.liquidStaking?.adoptionMaxPctOfStakers || 0) * 100}
                onChange={(e) =>
                  updateModel({
                    liquidStaking: {
                      ...model.liquidStaking!,
                      adoptionMaxPctOfStakers: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400">Adoption Speed (per {model.timeStep})</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={model.liquidStaking?.adoptionSpeed || 0}
                onChange={(e) =>
                  updateModel({
                    liquidStaking: {
                      ...model.liquidStaking!,
                      adoptionSpeed: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="input-glass"
              />
            </label>
          </section>
        )}
      </div>
    </div>
  );
}
