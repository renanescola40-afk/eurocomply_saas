import {
  AI_ACT_LEGAL_RULES,
  listApplicableAiActRules,
  validateAiActLegalRules,
  type AiActLegalRole,
  type AiActRuleCategory,
} from './legal-rules';

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

export const AI_ACT_DECISION_ENGINE_VERSION = '2026-07-17.1';
export const AI_ACT_RULESET_VERSION = AI_ACT_LEGAL_RULES.reduce(
  (latest, rule) => (rule.version > latest ? rule.version : latest),
  '0',
);

export type AiSystemRole = (typeof AI_SYSTEM_ROLES)[number];
export type AiSystemStatus = (typeof AI_SYSTEM_STATUSES)[number];
export type AiRiskDomain = (typeof AI_RISK_DOMAINS)[number];
export type AiActRiskLevel = 'prohibited_review' | 'high_risk_review' | 'limited_transparency' | 'minimal_or_low';
export type AiActDecision = 'block_and_escalate' | 'formal_high_risk_assessment' | 'transparency_review' | 'inventory_and_monitor';
export type AiActRegistryReviewState = 'fresh' | 'review_due';
export type RoleConfidence = 'low' | 'medium' | 'high';

export type RoleSignal =
  | 'selected_provider'
  | 'selected_deployer'
  | 'selected_importer'
  | 'selected_distributor'
  | 'third_party_vendor'
  | 'customer_facing_use'
  | 'internal_use'
  | 'substantial_modification_review'
  | 'high_risk_domain'
  | 'transparency_surface'
  | 'biometric_or_prohibited_review';

export type RoleNextStep =
  | 'confirm_contractual_role'
  | 'document_intended_purpose'
  | 'collect_vendor_evidence'
  | 'run_high_risk_assessment'
  | 'prepare_transparency_notice'
  | 'assign_accountable_owner'
  | 'escalate_legal_review'
  | 'check_import_distribution_chain';

export type RoleWizardInput = {
  role?: string | null;
  vendorName?: string | null;
  useCase?: string | null;
  riskDomain?: string | null;
  usesPersonalData?: boolean;
  interactsWithPeople?: boolean;
  generatesContent?: boolean;
  biometricIdentification?: boolean;
  manipulativeOrExploitative?: boolean;
};

export type RoleWizardAssessment = {
  recommendedRole: AiSystemRole;
  confidence: RoleConfidence;
  needsLegalReview: boolean;
  signals: RoleSignal[];
  nextSteps: RoleNextStep[];
};

export type AiActDecisionInput = {
  role: AiSystemRole;
  riskDomain: AiRiskDomain;
  usesPersonalData: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  biometricIdentification: boolean;
  manipulativeOrExploitative: boolean;
  vendorName?: string | null;
  useCase?: string | null;
  onDate?: string;
};

export type CanonicalAiActDecision = {
  engineVersion: string;
  rulesetVersion: string;
  assessedOn: string;
  registryVerifiedAt: string;
  registryReviewState: AiActRegistryReviewState;
  riskLevel: AiActRiskLevel;
  decision: AiActDecision;
  summary: string;
  obligations: string[];
  nextActions: string[];
  roleAssessment: RoleWizardAssessment;
  relevantRuleCategories: AiActRuleCategory[];
  appliedRuleIds: string[];
  futureRuleIds: string[];
  pendingRuleIds: string[];
  legalReviewRequired: boolean;
  reasons: string[];
  evidenceBoundary: string;
};

export const HIGH_RISK_DOMAINS = new Set<AiRiskDomain>([
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

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAssessmentDate(value?: string) {
  const candidate = value ?? todayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(new Date(`${candidate}T00:00:00.000Z`).getTime())) {
    throw new Error('ai_act_assessment_date_invalid');
  }
  return candidate;
}

function hasCustomerFacingIntent(useCase: string) {
  return /customer|client|external|public|sell|resell|white\s*label|api|marketplace|end[-\s]?user|utilizador|cliente|público|publico|vender|revender/i.test(useCase);
}

function hasInternalUseIntent(useCase: string) {
  return /internal|employee|staff|team|backoffice|support|agent|agent[e]?|equipa|funcion[aá]rio|colaborador|interno/i.test(useCase);
}

function legalRolesFor(role: AiSystemRole): AiActLegalRole[] {
  if (role === 'provider' || role === 'deployer' || role === 'importer' || role === 'distributor') return [role];
  return ['provider', 'deployer'];
}

function relevantCategories(input: AiActDecisionInput, legalRoles: AiActLegalRole[]) {
  const categories: AiActRuleCategory[] = [];
  if (legalRoles.includes('provider') || legalRoles.includes('deployer')) categories.push('ai_literacy');
  if (input.manipulativeOrExploitative) categories.push('prohibited_practice');
  if (input.biometricIdentification || HIGH_RISK_DOMAINS.has(input.riskDomain)) {
    categories.push('high_risk_standalone', 'high_risk_product');
  }
  if (input.interactsWithPeople || input.generatesContent) categories.push('transparency');
  return unique(categories);
}

function baseDecision(input: AiActDecisionInput) {
  if (input.manipulativeOrExploitative) {
    return {
      riskLevel: 'prohibited_review' as const,
      decision: 'block_and_escalate' as const,
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

  if (input.biometricIdentification || HIGH_RISK_DOMAINS.has(input.riskDomain)) {
    const roleSpecific = input.role === 'provider'
      ? 'Provider obligations may include risk management, data governance, technical documentation and post-market monitoring.'
      : 'Deployer obligations may include appropriate use, human oversight, monitoring, logs and impact assessment where applicable.';

    return {
      riskLevel: 'high_risk_review' as const,
      decision: 'formal_high_risk_assessment' as const,
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
      riskLevel: 'limited_transparency' as const,
      decision: 'transparency_review' as const,
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
    riskLevel: 'minimal_or_low' as const,
    decision: 'inventory_and_monitor' as const,
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

export function normalizeAiSystemRole(value: unknown): AiSystemRole {
  return AI_SYSTEM_ROLES.includes(value as AiSystemRole) ? (value as AiSystemRole) : 'deployer';
}

export function normalizeAiSystemStatus(value: unknown): AiSystemStatus {
  return AI_SYSTEM_STATUSES.includes(value as AiSystemStatus) ? (value as AiSystemStatus) : 'planned';
}

export function normalizeAiRiskDomain(value: unknown): AiRiskDomain {
  return AI_RISK_DOMAINS.includes(value as AiRiskDomain) ? (value as AiRiskDomain) : 'general_productivity';
}

export function evaluateAiSystemRole(input: RoleWizardInput): RoleWizardAssessment {
  const selectedRole = normalizeAiSystemRole(input.role);
  const useCase = input.useCase ?? '';
  const hasVendor = Boolean(input.vendorName?.trim());
  const customerFacing = hasCustomerFacingIntent(useCase);
  const internalUse = hasInternalUseIntent(useCase);
  const highRiskDomain = HIGH_RISK_DOMAINS.has(normalizeAiRiskDomain(input.riskDomain));
  const transparencySurface = Boolean(input.interactsWithPeople || input.generatesContent);
  const severeReview = Boolean(input.biometricIdentification || input.manipulativeOrExploitative);

  const signals: RoleSignal[] = [];
  const nextSteps: RoleNextStep[] = ['assign_accountable_owner', 'document_intended_purpose', 'confirm_contractual_role'];

  if (selectedRole === 'provider') signals.push('selected_provider');
  if (selectedRole === 'deployer') signals.push('selected_deployer');
  if (selectedRole === 'importer') signals.push('selected_importer');
  if (selectedRole === 'distributor') signals.push('selected_distributor');
  if (hasVendor) signals.push('third_party_vendor');
  if (customerFacing) signals.push('customer_facing_use');
  if (internalUse) signals.push('internal_use');
  if (highRiskDomain) signals.push('high_risk_domain');
  if (transparencySurface) signals.push('transparency_surface');
  if (severeReview) signals.push('biometric_or_prohibited_review');

  let recommendedRole: AiSystemRole = selectedRole;
  let confidence: RoleConfidence = selectedRole === 'other' ? 'low' : 'medium';

  if (selectedRole === 'importer' || selectedRole === 'distributor') {
    confidence = 'high';
    nextSteps.push('check_import_distribution_chain', 'collect_vendor_evidence');
  } else if (selectedRole === 'provider') {
    confidence = customerFacing ? 'high' : 'medium';
    nextSteps.push('collect_vendor_evidence');
    if (customerFacing) nextSteps.push('prepare_transparency_notice');
  } else if (hasVendor && !customerFacing) {
    recommendedRole = 'deployer';
    confidence = 'high';
    nextSteps.push('collect_vendor_evidence');
  } else if (customerFacing && !hasVendor) {
    recommendedRole = 'provider';
    confidence = 'medium';
    signals.push('substantial_modification_review');
    nextSteps.push('collect_vendor_evidence', 'prepare_transparency_notice');
  } else {
    recommendedRole = 'deployer';
    confidence = internalUse ? 'medium' : 'low';
  }

  if (highRiskDomain) nextSteps.push('run_high_risk_assessment');
  if (transparencySurface) nextSteps.push('prepare_transparency_notice');
  if (severeReview) nextSteps.push('escalate_legal_review');

  const needsLegalReview = confidence === 'low' || severeReview || highRiskDomain || signals.includes('substantial_modification_review');

  return {
    recommendedRole,
    confidence,
    needsLegalReview,
    signals: unique(signals),
    nextSteps: unique(nextSteps),
  };
}

export function evaluateAiActSystem(input: AiActDecisionInput): CanonicalAiActDecision {
  if (validateAiActLegalRules().length > 0) {
    throw new Error('ai_act_legal_registry_invalid');
  }

  const assessedOn = normalizeAssessmentDate(input.onDate);
  const roleAssessment = evaluateAiSystemRole(input);
  const legalRoles = unique([
    ...legalRolesFor(input.role),
    ...legalRolesFor(roleAssessment.recommendedRole),
  ]);
  const categories = relevantCategories(input, legalRoles);
  const applicableRules = listApplicableAiActRules({ roles: legalRoles, categories, onDate: assessedOn });
  const futureRules = listApplicableAiActRules({ roles: legalRoles, categories, onDate: assessedOn, includeFuture: true })
    .filter((rule) => rule.appliesFrom !== null && rule.appliesFrom > assessedOn);
  const pendingRules = listApplicableAiActRules({
    roles: legalRoles,
    categories,
    onDate: assessedOn,
    includeFuture: true,
    includePending: true,
  }).filter((rule) => rule.status === 'adopted_pending_effect');
  const registryReviewState: AiActRegistryReviewState = AI_ACT_LEGAL_RULES.some((rule) => rule.reviewBy < assessedOn)
    ? 'review_due'
    : 'fresh';
  const registryVerifiedAt = AI_ACT_LEGAL_RULES.reduce(
    (latest, rule) => (rule.source.verifiedAt > latest ? rule.source.verifiedAt : latest),
    '0',
  );
  const base = baseDecision(input);

  const reasons = unique([
    input.manipulativeOrExploitative ? 'manipulative_or_exploitative_signal' : '',
    input.biometricIdentification ? 'biometric_identification_signal' : '',
    HIGH_RISK_DOMAINS.has(input.riskDomain) ? 'annex_domain_signal' : '',
    input.interactsWithPeople ? 'human_interaction_signal' : '',
    input.generatesContent ? 'generated_content_signal' : '',
    input.usesPersonalData ? 'personal_data_signal' : '',
    roleAssessment.confidence === 'low' ? 'role_confirmation_required' : '',
    registryReviewState === 'review_due' ? 'registry_review_due' : '',
    applicableRules.some((rule) => rule.legalReviewRequired) ? 'applicable_rule_requires_legal_review' : '',
  ].filter(Boolean));

  const obligations = unique([
    ...base.obligations,
    ...applicableRules.map((rule) => `${rule.article}: ${rule.obligation}`),
  ]);
  const nextActions = unique([
    ...base.nextActions,
    ...futureRules.map((rule) => `Prepare for ${rule.article} before ${rule.appliesFrom}.`),
    ...pendingRules.map((rule) => `Track official publication before treating ${rule.article} as legally effective.`),
    ...(registryReviewState === 'review_due' ? ['Refresh the legal-rules registry before relying on this classification.'] : []),
  ]);
  const legalReviewRequired = base.riskLevel === 'prohibited_review'
    || base.riskLevel === 'high_risk_review'
    || roleAssessment.needsLegalReview
    || registryReviewState === 'review_due'
    || applicableRules.some((rule) => rule.legalReviewRequired);

  return {
    engineVersion: AI_ACT_DECISION_ENGINE_VERSION,
    rulesetVersion: AI_ACT_RULESET_VERSION,
    assessedOn,
    registryVerifiedAt,
    registryReviewState,
    riskLevel: base.riskLevel,
    decision: base.decision,
    summary: base.summary,
    obligations,
    nextActions,
    roleAssessment,
    relevantRuleCategories: categories,
    appliedRuleIds: applicableRules.map((rule) => rule.id),
    futureRuleIds: futureRules.map((rule) => rule.id),
    pendingRuleIds: pendingRules.map((rule) => rule.id),
    legalReviewRequired,
    reasons,
    evidenceBoundary: 'Decision support only; this output is not a legal determination, certification or compliance guarantee.',
  };
}
