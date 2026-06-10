export const AI_SYSTEM_ROLES = ['provider', 'deployer', 'importer', 'distributor', 'other'] as const;
export const AI_SYSTEM_STATUSES = ['planned', 'pilot', 'production', 'retired'] as const;
export const AI_RISK_DOMAINS = [
  'general_productivity',
  'customer_support',
  'content_generation',
  'biometrics',
  'employment',
  'education',
  'credit_finance',
  'essential_services',
  'law_enforcement',
  'migration_border',
  'justice_democratic_processes',
  'safety_component',
  'critical_infrastructure',
] as const;

export type AiSystemRole = (typeof AI_SYSTEM_ROLES)[number];
export type AiSystemStatus = (typeof AI_SYSTEM_STATUSES)[number];
export type AiRiskDomain = (typeof AI_RISK_DOMAINS)[number];
export type AiActRiskLevel = 'prohibited_review' | 'high_risk_review' | 'limited_transparency' | 'minimal_or_low';

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

const highRiskDomains = new Set<AiRiskDomain>([
  'biometrics',
  'employment',
  'education',
  'credit_finance',
  'essential_services',
  'law_enforcement',
  'migration_border',
  'justice_democratic_processes',
  'safety_component',
  'critical_infrastructure',
]);

export function normalizeAiSystemRole(value: unknown): AiSystemRole {
  return AI_SYSTEM_ROLES.includes(value as AiSystemRole) ? (value as AiSystemRole) : 'deployer';
}

export function normalizeAiSystemStatus(value: unknown): AiSystemStatus {
  return AI_SYSTEM_STATUSES.includes(value as AiSystemStatus) ? (value as AiSystemStatus) : 'planned';
}

export function normalizeAiRiskDomain(value: unknown): AiRiskDomain {
  return AI_RISK_DOMAINS.includes(value as AiRiskDomain) ? (value as AiRiskDomain) : 'general_productivity';
}

export function classifyAiSystem(input: AiSystemClassificationInput): AiSystemClassification {
  if (input.manipulativeOrExploitative) {
    return {
      riskLevel: 'prohibited_review',
      summary: 'Potential prohibited-practice review required before use.',
      obligations: [
        'Freeze production rollout until legal/compliance review is completed.',
        'Document the intended purpose, affected groups and safeguards.',
        'Escalate to accountable owner and preserve evidence for audit trail.',
      ],
      nextActions: [
        'Open executive review.',
        'Record mitigation or discontinue the AI use case.',
        'Attach legal assessment and vendor evidence.',
      ],
    };
  }

  if (input.biometricIdentification || highRiskDomains.has(input.riskDomain)) {
    const roleSpecific = input.role === 'provider'
      ? 'Provider obligations may include risk management, data governance, technical documentation and post-market monitoring.'
      : 'Deployer obligations may include appropriate use, human oversight, monitoring, logs and impact assessment where applicable.';

    return {
      riskLevel: 'high_risk_review',
      summary: 'Likely high-risk or high-risk-adjacent AI system. Requires formal assessment.',
      obligations: [
        roleSpecific,
        'Assign accountable owner and maintain a documented risk assessment.',
        'Check whether GDPR DPIA, vendor due diligence and incident playbooks are required.',
      ],
      nextActions: [
        'Run provider/deployer role validation.',
        'Create risk entry and RACI owner.',
        'Prepare evidence pack before production use.',
      ],
    };
  }

  if (input.interactsWithPeople || input.generatesContent) {
    return {
      riskLevel: 'limited_transparency',
      summary: 'Limited-risk AI system with transparency obligations to review.',
      obligations: [
        'Assess whether users must be informed they are interacting with AI.',
        'Review synthetic content, deepfake or generated-content disclosure needs.',
        'Keep usage policy and owner approval evidence.',
      ],
      nextActions: [
        'Create transparency notice if needed.',
        'Attach vendor documentation.',
        'Schedule periodic review in the compliance calendar.',
      ],
    };
  }

  return {
    riskLevel: 'minimal_or_low',
    summary: 'Minimal or low-risk AI system based on the supplied answers.',
    obligations: [
      'Maintain inventory entry and accountable owner.',
      'Keep vendor documentation and internal acceptable-use policy available.',
      input.usesPersonalData ? 'Check GDPR lawful basis and data minimisation.' : 'Confirm no personal data is processed.',
    ],
    nextActions: [
      'Review if use case, data or vendor changes.',
      'Add employee guidance if system is broadly available.',
    ],
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
