import {
  AI_SYSTEM_ROLES,
  evaluateAiSystemRole,
  type AiSystemRole,
  type RoleConfidence,
  type RoleNextStep,
  type RoleSignal,
  type RoleWizardAssessment,
  type RoleWizardInput,
} from '@/server/ai-governance/decision-engine';

export const AI_GOVERNANCE_ROLES = AI_SYSTEM_ROLES;

export type AiGovernanceRole = AiSystemRole;
export type { RoleConfidence, RoleNextStep, RoleSignal, RoleWizardAssessment, RoleWizardInput };

export function evaluateAiGovernanceRole(input: RoleWizardInput): RoleWizardAssessment {
  return evaluateAiSystemRole(input);
}
