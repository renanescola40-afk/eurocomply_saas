import {
  AI_RISK_DOMAINS,
  AI_SYSTEM_ROLES,
  AI_SYSTEM_STATUSES,
  evaluateAiActSystem,
  normalizeAiRiskDomain,
  normalizeAiSystemRole,
  normalizeAiSystemStatus,
  type AiActRiskLevel,
  type AiRiskDomain,
  type AiSystemRole,
  type AiSystemStatus,
} from './decision-engine';

export {
  AI_RISK_DOMAINS,
  AI_SYSTEM_ROLES,
  AI_SYSTEM_STATUSES,
  normalizeAiRiskDomain,
  normalizeAiSystemRole,
  normalizeAiSystemStatus,
};

export type { AiActRiskLevel, AiRiskDomain, AiSystemRole, AiSystemStatus };

export type AiSystemClassificationInput = {
  role: AiSystemRole;
  riskDomain: AiRiskDomain;
  usesPersonalData: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  biometricIdentification: boolean;
  manipulativeOrExploitative: boolean;
};

export type AiSystemClassification = {
  riskLevel: AiActRiskLevel;
  summary: string;
  obligations: string[];
  nextActions: string[];
};

export function classifyAiSystem(input: AiSystemClassificationInput): AiSystemClassification {
  const decision = evaluateAiActSystem({
    ...input,
    vendorName: null,
    useCase: null,
  });

  return {
    riskLevel: decision.riskLevel,
    summary: decision.summary,
    obligations: decision.obligations,
    nextActions: decision.nextActions,
  };
}

export function riskLevelLabel(level: AiActRiskLevel) {
  switch (level) {
    case 'prohibited_review':
      return 'Prohibited-practice review';
    case 'high_risk_review':
      return 'High-risk review';
    case 'limited_transparency':
      return 'Limited risk / transparency';
    case 'minimal_or_low':
      return 'Minimal or low risk';
  }
}
