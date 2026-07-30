export const PROCUREMENT_PACK_VERSION = '2026-07-30';

export type ProcurementControlStatus = 'implemented' | 'configured' | 'evidence-required' | 'not-claimed';

export type ProcurementControl = {
  id: string;
  title: string;
  status: ProcurementControlStatus;
  summary: string;
  evidence: string[];
};

export type ProcurementProvider = {
  name: string;
  purpose: string;
  status: 'core' | 'conditional' | 'optional';
  regionDisclosure: string;
};

export const procurementControls: ProcurementControl[] = [
  {
    id: 'tenant-isolation',
    title: 'Tenant isolation',
    status: 'implemented',
    summary: 'Organization-scoped authorization and Supabase Row Level Security form the tenant-isolation model.',
    evidence: ['Organization membership checks', 'Server-side authorization', 'Forced RLS coverage for tenant tables'],
  },
  {
    id: 'access-control',
    title: 'Role-based access control',
    status: 'implemented',
    summary: 'Permissions are evaluated against organization membership and role-aware authorization rules.',
    evidence: ['Authenticated private routes', 'Role and permission checks', 'Server-only privileged operations'],
  },
  {
    id: 'auditability',
    title: 'Auditability',
    status: 'implemented',
    summary: 'Critical governance and administrative activity is recorded to support investigation and review.',
    evidence: ['Audit events', 'Activity history', 'Integrity controls where implemented'],
  },
  {
    id: 'encryption',
    title: 'Encryption and managed infrastructure',
    status: 'configured',
    summary: 'Transport and storage protection rely on the configured managed-cloud providers.',
    evidence: ['HTTPS/TLS for public traffic', 'Provider-managed encryption at rest', 'Production configuration review'],
  },
  {
    id: 'incident-response',
    title: 'Incident response',
    status: 'implemented',
    summary: 'Operational runbooks cover triage, communication, containment, recovery and follow-up.',
    evidence: ['Incident runbooks', 'Severity-based response', 'Status communication path'],
  },
  {
    id: 'business-continuity',
    title: 'Business continuity and recovery',
    status: 'evidence-required',
    summary: 'Recovery capabilities depend on the active provider configuration and current restore evidence.',
    evidence: ['Backup-provider posture', 'Restore validation', 'Release-specific recovery evidence'],
  },
  {
    id: 'certifications',
    title: 'Independent certifications',
    status: 'not-claimed',
    summary: 'No SOC 2, ISO 27001 or independent penetration-test claim is made without dated evidence.',
    evidence: ['No unsupported certification badge', 'Evidence-bound public claims', 'Contract review before reliance'],
  },
];

export const procurementProviders: ProcurementProvider[] = [
  { name: 'Vercel', purpose: 'Application hosting, deployment and edge delivery', status: 'core', regionDisclosure: 'Runtime region depends on project configuration.' },
  { name: 'Supabase', purpose: 'Database, authentication, storage and Row Level Security', status: 'core', regionDisclosure: 'The exact project region must be confirmed in the customer security pack.' },
  { name: 'Stripe', purpose: 'Subscription billing, checkout and webhook processing', status: 'conditional', regionDisclosure: 'Global payments infrastructure; enabled only when billing is configured.' },
  { name: 'Sentry', purpose: 'Monitoring and diagnostics', status: 'optional', regionDisclosure: 'Depends on the configured account and project region.' },
  { name: 'PostHog', purpose: 'Product analytics and usage insights', status: 'optional', regionDisclosure: 'Enabled only where configured and appropriate.' },
];

export const procurementDocuments = [
  { path: '/trust', title: 'Trust Center' },
  { path: '/security', title: 'Security overview' },
  { path: '/privacy', title: 'Privacy' },
  { path: '/dpa', title: 'Data Processing Addendum summary' },
  { path: '/subprocessors', title: 'Subprocessor list' },
  { path: '/sla', title: 'Service commitments' },
  { path: '/status', title: 'Status surface' },
  { path: '/compliance', title: 'Compliance posture' },
] as const;

export function buildPublicProcurementPack(origin: string) {
  return {
    schemaVersion: 1,
    version: PROCUREMENT_PACK_VERSION,
    generatedAt: new Date().toISOString(),
    product: 'RISCK COMPLY',
    purpose: 'Public, evidence-bound enterprise procurement and security review pack.',
    legalBoundary: 'This pack is informational, does not create contractual commitments and does not replace signed agreements or professional review.',
    controls: procurementControls,
    providers: procurementProviders,
    documents: procurementDocuments.map((document) => ({ ...document, url: `${origin}${document.path}` })),
  };
}
