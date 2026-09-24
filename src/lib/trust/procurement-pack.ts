export const PROCUREMENT_PACK_VERSION = '2026-09-24';

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
    id: 'data-lifecycle',
    title: 'Retention, export and deletion',
    status: 'implemented',
    summary: 'Category-specific retention criteria and controlled GDPR export/delete workflows exist; exact contractual periods and downstream provider lifecycle remain agreement- and evidence-bound.',
    evidence: ['Privacy/data-protection documentation', 'DSR export/delete workflows', 'Provider lifecycle boundaries'],
  },
  {
    id: 'dpa-subprocessors',
    title: 'DPA and subprocessors',
    status: 'configured',
    summary: 'An Article 28 DPA review structure and active provider/subprocessor register exist. Final contractual effect depends on party, annex, provider and incorporation facts.',
    evidence: ['DPA Article 28 control matrix', 'Subprocessor register', 'TOM references'],
  },
  {
    id: 'international-transfers',
    title: 'International transfers',
    status: 'evidence-required',
    summary: 'Provider transfer frameworks and known regions are tracked without making a blanket EU-only claim. Flow-level Chapter V conclusions remain fact-specific.',
    evidence: ['International transfer register', 'Provider DPA/SCC framework evidence', 'Data residency disclosure'],
  },
  {
    id: 'legal-publication',
    title: 'Privacy and Terms publication',
    status: 'evidence-required',
    summary: 'Public Privacy and Terms review surfaces exist but are deliberately not represented as effective final contracts until the final factual/publication gates are satisfied.',
    evidence: ['Versioned legal review surfaces', 'Public legal publication state', 'Current legal authority matrix'],
  },
  {
    id: 'ai-gdpr-documentation',
    title: 'AI Act and GDPR documentation',
    status: 'implemented',
    summary: 'Current-scope AI Act applicability, GDPR role/notice/DPA matrices, ROPA, DSR controls and provider/transfer registers are maintained with change-trigger boundaries.',
    evidence: ['Current legal authority matrix', 'ROPA', 'Privacy Articles 13/14 matrix', 'DPA Article 28 matrix'],
  },
  {
    id: 'certifications',
    title: 'Independent certifications',
    status: 'not-claimed',
    summary: 'No SOC 2 or ISO 27001 certification is claimed without current, dated and attributable certification evidence.',
    evidence: ['No unsupported certification badge', 'Evidence-bound public claims', 'Contract review before reliance'],
  },
  {
    id: 'security-assessment',
    title: 'Independent security assessment',
    status: 'evidence-required',
    summary: 'A third-party black-box assessment was completed on 2026-09-12; original TLS Highs have technical remediation evidence, while a clean independent retest/terminal assurance remains open.',
    evidence: ['Confidential third-party assessment reference', 'TLS remediation evidence', 'Retest/terminal assurance boundary'],
  },
];

export const procurementProviders: ProcurementProvider[] = [
  {
    name: 'Vercel',
    purpose: 'Application hosting, deployment and edge delivery',
    status: 'core',
    regionDisclosure: 'The canonical public site is serving, but the observed Production deployment is on an older Git release than the current protected main. Exact-current-main Production binding and protected runtime acceptance remain evidence-required.',
  },
  {
    name: 'Supabase',
    purpose: 'Database, authentication, storage and Row Level Security',
    status: 'core',
    regionDisclosure: 'The Production project is evidenced in eu-west-1 (Ireland). Current V41 selected migrations are present live 13/13; governed V41 promotion provenance remains a separate open evidence item.',
  },
  {
    name: 'Stripe',
    purpose: 'Subscription billing, checkout and webhook processing',
    status: 'conditional',
    regionDisclosure: 'The canonical LIVE account is active in Portugal. New public self-serve paid Checkout remains release-gated, and no legitimate LIVE subscription authority is currently credited from platform-proof or seeded records.',
  },
  {
    name: 'Google OAuth / Google Identity',
    purpose: 'Optional user authentication and identity federation',
    status: 'optional',
    regionDisclosure: 'Runtime integration is implemented; final applicable contract or DPA, legal role, region, retention and transfer treatment remain under review.',
  },
  {
    name: 'Google Workspace',
    purpose: 'Corporate support, security, procurement and legal email communications',
    status: 'core',
    regionDisclosure: 'Corporate risckcomply.com mail is in operational use. Earlier account-specific plan/EMEA evidence is retained, while current agreement/CDPA, data-region, retention and transfer facts remain evidence-required before contractual reliance.',
  },
  {
    name: 'GitHub Actions',
    purpose: 'Source delivery, CI/CD and protected recovery/security workflows',
    status: 'conditional',
    regionDisclosure: 'Protected release and recovery workflows are active and can transiently process Production database data on GitHub-hosted runners; only evidence-bound/redacted outputs are intended to be retained. Company-specific agreement/DPA applicability and final legal/transfer role remain under review.',
  },
  {
    name: 'Sentry',
    purpose: 'Monitoring and diagnostics',
    status: 'optional',
    regionDisclosure: 'Earlier direct Production release-binding evidence is historical. Current protected exact-release producer acceptance plus organization-specific region, retention and DPA facts remain evidence-required.',
  },
  {
    name: 'PostHog',
    purpose: 'Product analytics and usage insights',
    status: 'optional',
    regionDisclosure: 'Production source/configuration has historically targeted EU service endpoints; the connected assurance project was not the Production project, so Production account recovery and account-linked DPA evidence remain open.',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email delivery when enabled',
    status: 'conditional',
    regionDisclosure: 'Historical delivery is evidenced; current exact-release Production binding and account facts remain evidence-required.',
  },
  {
    name: 'Upstash',
    purpose: 'Distributed Redis-backed rate limiting and security-control state',
    status: 'core',
    regionDisclosure: 'The distributed Redis-backed integration remains implemented. Earlier direct Production proof is historical; current protected provider/runtime acceptance plus account plan, region, retention and contractual facts remain open.',
  },
];

export const procurementDocuments = [
  { path: '/trust', title: 'Trust Center' },
  { path: '/security', title: 'Security overview' },
  { path: '/privacy', title: 'Privacy' },
  { path: '/dpa', title: 'Data Processing Addendum summary' },
  { path: '/subprocessors', title: 'Subprocessor list' },
  { path: '/transfers', title: 'International transfers' },
  { path: '/terms', title: 'Terms of Service review surface' },
  { path: '/cookie-policy', title: 'Cookie and analytics policy review surface' },
  { path: '/acceptable-use', title: 'Acceptable Use Policy review surface' },
  { path: '/data-processing', title: 'Data processing overview' },
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
