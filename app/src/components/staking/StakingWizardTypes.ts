// Staking Wizard Types and Props

import type { StakingModel, StakingOutputs } from "@/types/staking";
import type { StakingStepId } from "./StakingWizardSteps";

// Props passed from parent (page.tsx) with pre-populated data
export interface StakingTabProps {
  // Pre-populated from Emissions tab
  tokenSymbol?: string;
  totalSupply?: number;
  circulatingSupplyAtTge?: number;
  initialPrice?: number;
  
  // Optional callback when staking model changes (for cross-tab sync)
  onModelChange?: (model: StakingModel) => void;
}

// Internal wizard state
export interface StakingWizardState {
  currentStep: StakingStepId;
  model: StakingModel;
  outputs: StakingOutputs | null;
  isComputing: boolean;
  error: string | null;
}

// Defaults when no props provided
export const DEFAULT_TOKEN_BASICS = {
  tokenSymbol: "TOKEN",
  totalSupply: 1_000_000_000,
  circulatingSupply0: 200_000_000,
  initialPrice: 1.0,
};

// Helper to merge pre-populated props into model
export function applyPrePopulatedData(
  model: StakingModel,
  props: StakingTabProps
): StakingModel {
  return {
    ...model,
    tokenSymbol: props.tokenSymbol || model.tokenSymbol,
    totalSupply: props.totalSupply || model.totalSupply,
    circulatingSupply0: props.circulatingSupplyAtTge || model.circulatingSupply0,
    initialPrice: props.initialPrice || model.initialPrice,
  };
}

// Helper to check if token basics are pre-populated
export function hasPrePopulatedData(props: StakingTabProps): boolean {
  return !!(props.totalSupply || props.tokenSymbol || props.initialPrice);
}
