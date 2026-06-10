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
  retentionMonths: number;
  rationale: string;
  enterpriseReady: boolean;
};

export const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    category: 'controlled_documents',
    label: 'Controlled documents',
    retentionMonths: 72,
    rationale: 'Compliance evidence and internal control records should remain available for audit cycles and customer due diligence.',
    enterpriseReady: true,
  },
  {
    category: 'vendors',
    label: 'Vendor records',
    retentionMonths: 72,
    rationale: 'Third-party assessments, risk decisions and review history support procurement and operational accountability.',
    enterpriseReady: true,
  },
  {
    category: 'risks',
    label: 'Risk register',
    retentionMonths: 72,
    rationale: 'Risk decisions and mitigation history should be preserved for recurring compliance reviews.',
    enterpriseReady: true,
  },
  {
    category: 'ai_systems',
    label: 'AI systems inventory',
    retentionMonths: 72,
    rationale: 'AI governance records should preserve role classification, risk domains and obligation history.',
    enterpriseReady: true,
  },
  {
    category: 'ai_incidents',
    label: 'AI incident records',
    retentionMonths: 96,
    rationale: 'Incident records need longer preservation because they may support authority communications and post-incident reviews.',
    enterpriseReady: true,
  },
  {
    category: 'audit_events',
    label: 'Audit events',
    retentionMonths: 84,
    rationale: 'Activity evidence supports investigations, audit reconstruction and internal control monitoring.',
    enterpriseReady: true,
  },
  {
    category: 'billing_records',
    label: 'Billing records',
    retentionMonths: 120,
    rationale: 'Commercial records may need to be retained for tax, accounting and contract history.',
    enterpriseReady: true,
  },
  {
    category: 'gdpr_requests',
    label: 'GDPR requests',
    retentionMonths: 36,
    rationale: 'Privacy requests should preserve handling evidence while avoiding unnecessary long-term retention.',
    enterpriseReady: true,
  },
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
    nextActions.push('Review retention categories without enterprise-ready coverage.');
  }
  if (!policies.some((policy) => policy.category === 'audit_events')) {
    nextActions.push('Define retention for audit events.');
  }
  if (!policies.some((policy) => policy.category === 'ai_incidents')) {
    nextActions.push('Define retention for AI incident records.');
  }
  if (nextActions.length === 0) {
    nextActions.push('Review retention policy annually and after major regulatory changes.');
    nextActions.push('Validate backup restore procedures against retained evidence categories.');
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
