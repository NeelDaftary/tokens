"use client";

import StakingWizard from "./staking/StakingWizard";
import type { StakingTabProps } from "./staking/StakingWizardTypes";

export default function StakingTab(props: StakingTabProps) {
  return <StakingWizard {...props} />;
}
