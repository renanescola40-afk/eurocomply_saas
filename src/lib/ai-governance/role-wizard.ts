export const AI_GOVERNANCE_ROLES = ['provider', 'deployer', 'importer', 'distributor', 'other'] as const;
export type AiGovernanceRole = (typeof AI_GOVERNANCE_ROLES)[number];

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
  recommendedRole: AiGovernanceRole;
  confidence: RoleConfidence;
  needsLegalReview: boolean;
  signals: RoleSignal[];
  nextSteps: RoleNextStep[];
};

const highRiskDomains = new Set([
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

function normalizeRole(value: unknown): AiGovernanceRole {
  return AI_GOVERNANCE_ROLES.includes(value as AiGovernanceRole) ? (value as AiGovernanceRole) : 'deployer';
}

function hasCustomerFacingIntent(useCase: string) {
  return /customer|client|external|public|sell|resell|white\s*label|api|marketplace|end[-\s]?user|utilizador|cliente|público|publico|vender|revender/i.test(useCase);
}

function hasInternalUseIntent(useCase: string) {
  return /internal|employee|staff|team|backoffice|support|agent|agent[e]?|equipa|funcion[aá]rio|colaborador|interno/i.test(useCase);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function evaluateAiGovernanceRole(input: RoleWizardInput): RoleWizardAssessment {
  const selectedRole = normalizeRole(input.role);
  const useCase = input.useCase ?? '';
  const hasVendor = Boolean(input.vendorName?.trim());
  const customerFacing = hasCustomerFacingIntent(useCase);
  const internalUse = hasInternalUseIntent(useCase);
  const highRiskDomain = highRiskDomains.has(input.riskDomain ?? '');
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
  if (internalUse || hasVendor) signals.push('internal_use');
  if (highRiskDomain) signals.push('high_risk_domain');
  if (transparencySurface) signals.push('transparency_surface');
  if (severeReview) signals.push('biometric_or_prohibited_review');

  let recommendedRole: AiGovernanceRole = selectedRole;
  let confidence: RoleConfidence = selectedRole === 'other' ? 'low' : 'medium';

  if (selectedRole === 'importer' || selectedRole === 'distributor') {
    recommendedRole = selectedRole;
    confidence = 'high';
    nextSteps.push('check_import_distribution_chain', 'collect_vendor_evidence');
  } else if (selectedRole === 'provider') {
    recommendedRole = 'provider';
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
    confidence = internalUse || hasVendor ? 'medium' : 'low';
    if (hasVendor) nextSteps.push('collect_vendor_evidence');
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
