export const PROCUREMENT_PACK_VERSION = '2026-08-24';

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
  {
    name: 'Vercel',
    purpose: 'Application hosting, deployment and edge delivery',
    status: 'core',
    regionDisclosure: 'Runtime placement is deployment-specific; retained Production evidence and current provider-account facts are maintained separately.',
  },
  {
    name: 'Supabase',
    purpose: 'Database, authentication, storage and Row Level Security',
    status: 'core',
    regionDisclosure: 'The current Production project is evidenced in eu-west-1 (Ireland).',
  },
  {
    name: 'Stripe',
    purpose: 'Subscription billing, checkout and webhook processing',
    status: 'conditional',
    regionDisclosure: 'The connected LIVE account is based in Portugal; this is not presented as a single processing or storage region.',
  },
  {
    name: 'Google OAuth / Google Identity',
    purpose: 'Optional user authentication and identity federation',
    status: 'optional',
    regionDisclosure: 'Production usage is evidenced; final legal role, applicable contract or DPA, region, retention and transfer treatment remain under review.',
  },
  {
    name: 'Google Workspace',
    purpose: 'Corporate support, security, procurement and legal email communications',
    status: 'core',
    regionDisclosure: 'Account-specific evidence proves Business Starter for risckcomply.com and Google Cloud EMEA Limited as the billed EMEA entity. Exact account CDPA incorporation, data-region, retention and transfer treatment remain evidence-required.',
  },
  {
    name: 'GitHub Actions',
    purpose: 'Source delivery, CI/CD and protected recovery/security workflows',
    status: 'conditional',
    regionDisclosure: 'Protected recovery workflows can transiently process Production database data on GitHub-hosted runners; the current repository is owned by a Personal User account and company-specific DPA applicability remains unproven.',
  },
  {
    name: 'Sentry',
    purpose: 'Monitoring and diagnostics',
    status: 'optional',
    regionDisclosure: 'Retained Production runtime binding is evidenced; the organization-specific storage region remains account-evidence dependent.',
  },
  {
    name: 'PostHog',
    purpose: 'Product analytics and usage insights',
    status: 'optional',
    regionDisclosure: 'The Production client targets EU service endpoints; Production account recovery and account-linked DPA evidence remain open.',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email delivery when enabled',
    status: 'conditional',
    regionDisclosure: 'Historical use is evidenced; current exact-release Production binding remains evidence-required.',
  },
  {
    name: 'Upstash',
    purpose: 'Distributed Redis-backed rate limiting and security-control state',
    status: 'core',
    regionDisclosure: 'Upstash is materially required by the fail-closed distributed rate-limit/security architecture and predecessor binding evidence exists. Retained exact-current runtime reproof is still evidence-required; account plan, region, retention and contractual facts remain open.',
  },
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
