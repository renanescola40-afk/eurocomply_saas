export type VendorAssuranceCategory =
  | 'cloud_hosting'
  | 'database_platform'
  | 'payments'
  | 'monitoring'
  | 'email_delivery'
  | 'ai_services'
  | 'legal_operations';

export type VendorAssuranceControl = {
  id: VendorAssuranceCategory;
  provider: string;
  purpose: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  reviewCadence: 'quarterly' | 'semiannual' | 'annual';
  evidence: string[];
  status: 'ready' | 'tracked' | 'needs_review';
  nextAction: string;
};

export const VENDOR_ASSURANCE_CONTROLS: VendorAssuranceControl[] = [
  {
    id: 'cloud_hosting',
    provider: 'Vercel',
    purpose: 'Application hosting, deployment and edge delivery.',
    criticality: 'critical',
    reviewCadence: 'quarterly',
    evidence: ['Public status page', 'deployment history', 'security posture documentation'],
    status: 'tracked',
    nextAction: 'Keep deployment, availability and incident notes attached to the evidence pack.',
  },
  {
    id: 'database_platform',
    provider: 'Supabase',
    purpose: 'Database, authentication, row-level security and private storage.',
    criticality: 'critical',
    reviewCadence: 'quarterly',
    evidence: ['RLS policies', 'migration history', 'storage bucket configuration', 'backup posture'],
    status: 'tracked',
    nextAction: 'Validate production migrations and private storage policies after each schema release.',
  },
  {
    id: 'payments',
    provider: 'Stripe',
    purpose: 'Checkout, subscription billing, invoices and customer portal.',
    criticality: 'high',
    reviewCadence: 'semiannual',
    evidence: ['webhook configuration', 'billing event logs', 'customer portal configuration'],
    status: 'tracked',
    nextAction: 'Review webhook signing, event coverage and customer portal configuration before launch.',
  },
  {
    id: 'monitoring',
    provider: 'Sentry',
    purpose: 'Application error monitoring and release diagnostics.',
    criticality: 'high',
    reviewCadence: 'semiannual',
    evidence: ['instrumentation configuration', 'release/source map settings', 'incident review links'],
    status: 'needs_review',
    nextAction: 'Configure production auth token, org and project for release/source map tracking.',
  },
  {
    id: 'email_delivery',
    provider: 'Transactional email provider',
    purpose: 'User invitations, operational notifications and account messages.',
    criticality: 'medium',
    reviewCadence: 'annual',
    evidence: ['sending domain configuration', 'template inventory', 'suppression/abuse handling'],
    status: 'needs_review',
    nextAction: 'Document the production email provider and confirm account security settings.',
  },
  {
    id: 'ai_services',
    provider: 'AI service providers',
    purpose: 'Optional assisted compliance analysis, summaries or classification support.',
    criticality: 'high',
    reviewCadence: 'semiannual',
    evidence: ['data minimisation rules', 'feature gating', 'provider configuration notes'],
    status: 'needs_review',
    nextAction: 'Document which AI providers are active and how customer data is minimised.',
  },
  {
    id: 'legal_operations',
    provider: 'Legal and compliance partners',
    purpose: 'Optional legal review, customer DPA support and compliance advisory workflows.',
    criticality: 'medium',
    reviewCadence: 'annual',
    evidence: ['engagement scope', 'confidentiality terms', 'customer-facing process notes'],
    status: 'tracked',
    nextAction: 'Keep partner scope and customer-facing disclaimers current.',
  },
];

export type VendorAssuranceSummary = {
  score: number;
  status: 'foundation' | 'operational' | 'enterprise_ready';
  totalControls: number;
  readyControls: number;
  trackedControls: number;
  needsReview: number;
  criticalOpenItems: number;
  nextActions: string[];
};

export function calculateVendorAssuranceScore(controls: VendorAssuranceControl[] = VENDOR_ASSURANCE_CONTROLS) {
  if (controls.length === 0) return 0;

  const weighted = controls.reduce((total, control) => {
    const base = control.status === 'ready' ? 1 : control.status === 'tracked' ? 0.72 : 0.25;
    const weight = control.criticality === 'critical' ? 1.4 : control.criticality === 'high' ? 1.2 : control.criticality === 'medium' ? 1 : 0.8;
    return total + base * weight;
  }, 0);

  const max = controls.reduce((total, control) => {
    const weight = control.criticality === 'critical' ? 1.4 : control.criticality === 'high' ? 1.2 : control.criticality === 'medium' ? 1 : 0.8;
    return total + weight;
  }, 0);

  return Math.round((weighted / max) * 100);
}

export function getVendorAssuranceStatus(score: number): VendorAssuranceSummary['status'] {
  if (score >= 88) return 'enterprise_ready';
  if (score >= 65) return 'operational';
  return 'foundation';
}

export function getVendorAssuranceSummary(controls: VendorAssuranceControl[] = VENDOR_ASSURANCE_CONTROLS): VendorAssuranceSummary {
  const score = calculateVendorAssuranceScore(controls);
  const readyControls = controls.filter((control) => control.status === 'ready').length;
  const trackedControls = controls.filter((control) => control.status === 'tracked').length;
  const needsReview = controls.filter((control) => control.status === 'needs_review').length;
  const criticalOpenItems = controls.filter((control) => control.status !== 'ready' && control.criticality === 'critical').length;
  const nextActions = controls
    .filter((control) => control.status !== 'ready')
    .sort((a, b) => {
      const rank = { critical: 4, high: 3, medium: 2, low: 1 } as const;
      return rank[b.criticality] - rank[a.criticality];
    })
    .slice(0, 5)
    .map((control) => control.nextAction);

  return {
    score,
    status: getVendorAssuranceStatus(score),
    totalControls: controls.length,
    readyControls,
    trackedControls,
    needsReview,
    criticalOpenItems,
    nextActions: nextActions.length > 0 ? nextActions : ['Maintain vendor evidence and review subprocessors on the planned cadence.'],
  };
}
