export type RetentionCategory =
  | 'controlled_documents'
  | 'vendors'
  | 'risks'
  | 'ai_systems'
  | 'ai_incidents'
  | 'audit_events'
  | 'billing_records'
  | 'gdpr_requests';

export type RetentionPolicy = {
  category: RetentionCategory;
  label: string;
  /**
   * Proposed operational target used for policy review and evidence planning.
   * It is not a contractual promise and must not be treated as proof that
   * automatic deletion/expiry is enforced by the runtime or underlying providers.
   */
  retentionMonths: number;
  rationale: string;
  status: 'draft';
  enforcementStatus: 'not_proven';
  /**
   * PASS only after the period is approved for the applicable legal/commercial
   * posture and attributable runtime/provider evidence proves the intended handling.
   */
  enterpriseReady: false;
};

function draftPolicy(
  category: RetentionCategory,
  label: string,
  retentionMonths: number,
  rationale: string,
): RetentionPolicy {
  return {
    category,
    label,
    retentionMonths,
    rationale,
    status: 'draft',
    enforcementStatus: 'not_proven',
    enterpriseReady: false,
  };
}

export const RETENTION_POLICIES: RetentionPolicy[] = [
  draftPolicy(
    'controlled_documents',
    'Controlled documents',
    72,
    'Proposed policy target for compliance evidence and internal control records; counsel approval and enforcement evidence are required before contractual use.',
  ),
  draftPolicy(
    'vendors',
    'Vendor records',
    72,
    'Proposed policy target for third-party assessments, risk decisions and review history; counsel approval and enforcement evidence are required before contractual use.',
  ),
  draftPolicy(
    'risks',
    'Risk register',
    72,
    'Proposed policy target for risk decisions and mitigation history; counsel approval and enforcement evidence are required before contractual use.',
  ),
  draftPolicy(
    'ai_systems',
    'AI systems inventory',
    72,
    'Proposed policy target for AI governance records; applicability can vary with customer role, legal obligations and contract.',
  ),
  draftPolicy(
    'ai_incidents',
    'AI incident records',
    96,
    'Proposed policy target for incident evidence; authority, dispute, insurance and legal-hold requirements may require different treatment.',
  ),
  draftPolicy(
    'audit_events',
    'Audit events',
    84,
    'Proposed policy target for activity evidence; immutable-chain, investigation, customer and legal requirements must be reconciled before approval.',
  ),
  draftPolicy(
    'billing_records',
    'Billing records',
    120,
    'Proposed policy target only; accounting, tax and contractual retention must be confirmed for the provider entity and applicable jurisdictions.',
  ),
  draftPolicy(
    'gdpr_requests',
    'GDPR requests',
    36,
    'Proposed policy target for privacy-request handling evidence; limitation periods, disputes and minimisation requirements require qualified review.',
  ),
];

export type RetentionSummary = {
  totalPolicies: number;
  enterpriseReadyPolicies: number;
  readinessScore: number;
  minimumMonths: number;
  maximumMonths: number;
  nextActions: string[];
};

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/**
 * Computes the date implied by the current draft target for review/planning only.
 * This helper does not execute deletion, prove provider expiry, or establish a
 * contractual retention commitment.
 */
export function getRetentionUntil(category: RetentionCategory, createdAt: string | Date) {
  const policy = RETENTION_POLICIES.find((item) => item.category === category);
  if (!policy) return null;
  return addMonths(new Date(createdAt), policy.retentionMonths).toISOString();
}

export function getRetentionSummary(policies: RetentionPolicy[] = RETENTION_POLICIES): RetentionSummary {
  const totalPolicies = policies.length;
  const enterpriseReadyPolicies = policies.filter((policy) => policy.enterpriseReady).length;
  const retentionMonths = policies.map((policy) => policy.retentionMonths);
  const readinessScore = totalPolicies === 0 ? 0 : Math.round((enterpriseReadyPolicies / totalPolicies) * 100);

  const nextActions: string[] = [];
  if (readinessScore < 100) {
    nextActions.push('Obtain qualified legal/commercial approval for the proposed retention targets before treating them as customer commitments.');
    nextActions.push('Prove runtime/provider enforcement, backup ageing and deletion behavior with attributable evidence before marking a category enterprise-ready.');
  }
  if (!policies.some((policy) => policy.category === 'audit_events')) {
    nextActions.push('Define a draft retention target for audit events.');
  }
  if (!policies.some((policy) => policy.category === 'ai_incidents')) {
    nextActions.push('Define a draft retention target for AI incident records.');
  }
  if (nextActions.length === 0) {
    nextActions.push('Review retention policy annually and after major regulatory, provider, contract or data-model changes.');
    nextActions.push('Validate backup restore procedures against approved retained evidence categories.');
  }

  return {
    totalPolicies,
    enterpriseReadyPolicies,
    readinessScore,
    minimumMonths: retentionMonths.length ? Math.min(...retentionMonths) : 0,
    maximumMonths: retentionMonths.length ? Math.max(...retentionMonths) : 0,
    nextActions,
  };
}
