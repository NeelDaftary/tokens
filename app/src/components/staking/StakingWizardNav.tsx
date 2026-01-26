"use client";

import { STAKING_STEPS, type StakingStepId } from "./StakingWizardSteps";

interface StakingWizardNavProps {
  currentStep: StakingStepId;
  onStepChange: (step: StakingStepId) => void;
  canProceed?: boolean;
}

export default function StakingWizardNav({
  currentStep,
  onStepChange,
  canProceed = true,
}: StakingWizardNavProps) {
  const currentIndex = STAKING_STEPS.findIndex((s) => s.id === currentStep);

  const handleStepChange = (index: number) => {
    if (index >= 0 && index < STAKING_STEPS.length) {
      onStepChange(STAKING_STEPS[index].id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 w-full rounded-full bg-white/[0.08]">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / STAKING_STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STAKING_STEPS.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isPast = idx < currentIndex;
          const isFuture = idx > currentIndex;

          return (
            <button
              key={step.id}
              onClick={() => handleStepChange(idx)}
              disabled={isFuture}
              className={`flex flex-col items-center gap-2 transition-all ${
                isFuture ? "cursor-not-allowed opacity-40" : "cursor-pointer"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "border-blue-500 bg-blue-500 text-white"
                    : isPast
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-white/[0.08] bg-[rgba(15,20,28,0.5)] text-slate-500"
                }`}
              >
                {isPast ? "✓" : idx + 1}
              </div>
              <div
                className={`text-xs font-medium ${
                  isActive
                    ? "text-white"
                    : isPast
                    ? "text-green-400"
                    : "text-neutral-600"
                }`}
              >
                {step.shortLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
        <button
          onClick={() => handleStepChange(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Previous
        </button>

        <div className="text-sm text-neutral-400">
          Step {currentIndex + 1} of {STAKING_STEPS.length}
        </div>

        {currentIndex < STAKING_STEPS.length - 1 ? (
          <button
            onClick={() => handleStepChange(currentIndex + 1)}
            disabled={!canProceed}
            className="rounded bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        ) : (
          <button
            disabled={!canProceed}
            className="rounded bg-gradient-to-r from-green-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            View Results →
          </button>
        )}
      </div>
    </div>
  );
}
