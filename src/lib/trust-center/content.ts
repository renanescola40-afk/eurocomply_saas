import { type Locale } from '@/lib/i18n/routing';
import { TRUST_CENTER_ROUTES } from './routes';

export type TrustPage = {
  slug: string;
  navLabel: string;
  title: string;
  subtitle: string;
  status: string;
  updated: string;
  sections: { title: string; body: string; bullets?: string[] }[];
};

export const TRUST_ALLOWED_CLAIMS = [
  'Designed to support enterprise security review.',
  'Authenticated workspaces with organization-scoped access using organization_id.',
  'Role-based access patterns for customer workspaces.',
  'Tenant isolation designed around organization_id plus managed database policies and server-side checks.',
  'Encryption in transit and at rest through managed providers where configured.',
  'Audit activity for security and compliance-relevant events.',
  'Managed-provider backups and availability, subject to production configuration and restore evidence.',
  'Responsible disclosure contact is available by email.',
  'Formal certifications and external assurance reports are not yet complete.',
] as const;

export const TRUST_PROHIBITED_CLAIMS = [
  'SOC 2 compliant or SOC 2 certified.',
  'ISO 27001 certified.',
  'Externally tested without a real report.',
  '24/7 monitored or 24/7 support without a real team and process.',
  'GDPR compliant as a guarantee.',
  'End-to-end encrypted.',
  'Immutable audit logs without external immutability evidence.',
  'Guaranteed EU AI Act compliance or replacement for legal advice.',
] as const;

const updated = '2026-06-29';
const contact = 'renansilva2002@gmail.com';
const disclosureSlug = TRUST_CENTER_ROUTES[9];

const pageCopy: Record<string, Omit<TrustPage, 'slug' | 'updated'>> = {
  trust: {
    navLabel: 'Trust Center',
    title: 'Trust Center',
    subtitle: 'Procurement-ready overview of security, privacy, availability and responsible disclosure.',
    status: 'Honest public assurance. No unsupported certifications claimed.',
    sections: [
      { title: 'Security overview', body: 'RISCK COMPLY is designed as a B2B SaaS workspace for AI governance and compliance readiness. It uses authenticated workspaces, organization-scoped records, role-based access patterns, audit activity and managed cloud providers.' },
      { title: 'Architecture summary', body: 'The product is a Next.js application backed by managed authentication, database, storage and server-side operations. Customer records are modeled around organizations and organization-scoped resources.', bullets: ['Localized public routes for buyer review', 'Authenticated dashboard routes for customers', 'Server-side checks before organization data is queried', 'Managed providers for hosting, authentication, database and storage'] },
      { title: 'Current limitations', body: 'The assurance package is intentionally conservative.', bullets: ['No SOC 2 report is available yet.', 'No ISO 27001 certification is complete yet.', 'No third-party security test report is complete yet.', 'No public 24/7 human monitoring promise is made.', 'This material is not legal advice and does not guarantee compliance.'] },
    ],
  },
  security: {
    navLabel: 'Security',
    title: 'Security',
    subtitle: 'Application and infrastructure controls used to protect customer workspaces.',
    status: 'Security posture disclosure. Formal external assurance is pending.',
    sections: [
      { title: 'Access control', body: 'Workspace access is authenticated and designed around organization membership, roles and server-side query boundaries.' },
      { title: 'Tenant isolation', body: 'Customer data is designed to be scoped by organization_id. Managed database policies and server-side organization checks are used to reduce cross-tenant access risk.' },
      { title: 'Encryption', body: 'Encryption in transit is provided through HTTPS/TLS by managed hosting and provider connections. Encryption at rest is handled by managed infrastructure providers where available. RISCK COMPLY does not claim end-to-end encryption.' },
      { title: 'Audit logs', body: 'Security-relevant and compliance-relevant events are designed to be recorded for review, investigation and enterprise evidence. Audit records should not be marketed as externally immutable unless separate evidence exists.' },
      { title: 'Backups and availability', body: 'Backups and availability depend on managed provider capabilities and production configuration. Restore testing and formal disaster recovery evidence remain on the assurance roadmap.' },
      { title: 'Incident response', body: 'Incidents should be triaged privately, assessed for customer impact, communicated clearly when required and followed by corrective action tracking.' },
    ],
  },
  privacy: {
    navLabel: 'Privacy',
    title: 'Privacy Notice',
    subtitle: 'How RISCK COMPLY describes personal data handling for users, customers and reviewers.',
    status: 'Public notice. Enterprise wording should be reviewed before signature.',
    sections: [
      { title: 'Data treated', body: 'The service may process account data, organization profile data, membership data, AI system inventory data, risk and readiness inputs, generated document metadata, support communications and technical security logs.' },
      { title: 'Purpose', body: 'Data is processed to provide the SaaS, authenticate users, maintain customer workspaces, generate readiness outputs, secure the service, support billing and respond to customer requests.' },
      { title: 'Retention', body: 'Customer workspace data is retained while the account is active or as required for support, security, billing, legal and audit purposes. Export and deletion procedures should be confirmed contractually for enterprise customers.' },
    ],
  },
  terms: {
    navLabel: 'Terms',
    title: 'Terms of Service',
    subtitle: 'Baseline public terms for using RISCK COMPLY.',
    status: 'Template terms. Not a substitute for signed legal terms.',
    sections: [
      { title: 'Service scope', body: 'RISCK COMPLY provides software workflows for AI governance, readiness evidence, document generation and operational compliance tracking. It does not replace legal counsel and does not guarantee compliance outcomes.' },
      { title: 'Acceptable use', body: 'Users must not abuse the service, attempt unauthorized access, submit malicious content or use the platform to violate law or third-party rights.' },
      { title: 'Customer data', body: 'Customers retain responsibility for the accuracy, legality and appropriateness of data they submit. RISCK COMPLY uses customer data to provide and secure the service.' },
    ],
  },
  dpa: {
    navLabel: 'DPA',
    title: 'Data Processing Addendum',
    subtitle: 'Procurement-facing summary of expected data processing commitments.',
    status: 'DPA summary. Final agreement requires legal review/signature.',
    sections: [
      { title: 'Roles', body: 'For customer workspace data, the customer is generally expected to act as controller and RISCK COMPLY as processor. Specific roles may vary by feature and contract.' },
      { title: 'Processing instructions', body: 'RISCK COMPLY processes customer personal data to provide, secure, maintain and support the SaaS according to customer instructions and applicable agreement terms.' },
      { title: 'Security measures', body: 'Measures include authenticated access, organization scoping, managed-provider encryption, audit activity, restricted administrative access and responsible disclosure channels.' },
    ],
  },
  subprocessors: {
    navLabel: 'Subprocessors',
    title: 'Subprocessors',
    subtitle: 'Providers used to deliver, secure, host, bill and operate the service.',
    status: 'Public register. Verify production configuration before signature.',
    sections: [
      { title: 'Core categories', body: 'RISCK COMPLY may use managed providers for hosting, database, authentication, storage, payments, email, analytics, monitoring, customer support and error reporting.' },
      { title: 'Expected providers', body: 'The implementation references managed services such as Vercel, Supabase, Clerk, Stripe, Sentry, PostHog and email/support providers where configured. Actual customer-facing use depends on environment configuration.' },
      { title: 'Customer review', body: 'Enterprise customers may request the active subprocessor list before signature. Changes should be communicated according to the applicable DPA or enterprise agreement.' },
    ],
  },
  sla: {
    navLabel: 'SLA',
    title: 'Service Commitments',
    subtitle: 'Availability and support language without unsupported 24/7 promises.',
    status: 'Public service statement. Contractual SLA only by signed agreement.',
    sections: [
      { title: 'Availability approach', body: 'RISCK COMPLY is designed to use managed hosting and infrastructure providers for application availability. Public pages do not promise a numeric uptime SLA unless a signed plan or enterprise agreement states one.' },
      { title: 'Support', body: 'Support response times depend on customer plan and operational capacity. RISCK COMPLY does not publicly promise 24/7 human support at this stage.' },
      { title: 'Maintenance', body: 'Planned maintenance, incident updates and degraded service notices should be communicated through the status page or direct customer communication when applicable.' },
    ],
  },
  status: {
    navLabel: 'Status',
    title: 'System Status',
    subtitle: 'Simple public status surface for service availability and incidents.',
    status: 'Static status page. Live monitoring integration pending.',
    sections: [
      { title: 'Current public status', body: 'No live third-party status integration is connected on this page yet. Production teams should update this page or link it to a dedicated provider before relying on it for external incident communication.' },
      { title: 'Components to track', body: 'Recommended components include web application, authentication, database, storage, document generation, billing, email delivery and external provider dependencies.' },
      { title: 'Incident updates', body: 'Incident updates should describe affected components, customer impact, mitigation, resolution and follow-up actions without exposing sensitive security details.' },
    ],
  },
  'data-processing': {
    navLabel: 'Data Processing',
    title: 'Data Processing',
    subtitle: 'Operational view of data handled by the platform.',
    status: 'Data handling overview. Export/deletion by agreement.',
    sections: [
      { title: 'Data categories', body: 'The platform may process user identity data, organization data, membership and role data, AI system descriptions, risk classification inputs, generated document metadata, audit events, billing references and support records.' },
      { title: 'Data minimization', body: 'Customers should provide only the information required to operate the readiness workflow. Sensitive personal data should not be entered unless necessary and contractually permitted.' },
      { title: 'Access and segregation', body: 'Customer records are designed around organization_id and authenticated access. Administrative access should be limited, logged where possible and used only for operational needs.' },
    ],
  },
  [disclosureSlug]: {
    navLabel: 'Vulnerability Disclosure',
    title: 'Vulnerability Disclosure',
    subtitle: 'How customers and security reviewers can report issues safely and privately.',
    status: 'Responsible disclosure channel active. Bug bounty not currently offered.',
    sections: [
      { title: 'Reporting contact', body: `Send security reports privately to ${contact} until a dedicated security mailbox is provisioned.` },
      { title: 'What to include', body: 'Reports should include affected component, clear reproduction context, business impact, account or organization context and whether customer data may be affected.' },
      { title: 'Research boundaries', body: 'Reports must be limited to safe, authorized research and must not disrupt the service or access data that does not belong to the reporter.' },
      { title: 'Response limitations', body: 'RISCK COMPLY does not currently operate a public bug bounty, does not promise 24/7 response and does not guarantee monetary rewards.' },
    ],
  },
};

const ptLabels: Partial<Record<string, Pick<TrustPage, 'navLabel' | 'title' | 'subtitle'>>> = {
  trust: { navLabel: 'Centro de Confiança', title: 'Centro de Confiança', subtitle: 'Visão pública para procurement sobre segurança, privacidade, disponibilidade e disclosure responsável.' },
  security: { navLabel: 'Segurança', title: 'Segurança', subtitle: 'Controlos de aplicação e infraestrutura para proteger workspaces e apoiar avaliação enterprise.' },
  privacy: { navLabel: 'Privacidade', title: 'Aviso de Privacidade', subtitle: 'Como a RISCK COMPLY descreve o tratamento de dados pessoais para utilizadores e clientes.' },
  terms: { navLabel: 'Termos', title: 'Termos de Serviço', subtitle: 'Termos públicos base para utilização da RISCK COMPLY.' },
  dpa: { navLabel: 'DPA', title: 'Data Processing Addendum', subtitle: 'Resumo de compromissos esperados de tratamento de dados para clientes enterprise.' },
  subprocessors: { navLabel: 'Subprocessadores', title: 'Subprocessadores', subtitle: 'Fornecedores usados para entregar, proteger, hospedar, faturar e operar o serviço.' },
  sla: { navLabel: 'SLA', title: 'Compromissos de Serviço', subtitle: 'Linguagem honesta sobre disponibilidade e suporte, sem prometer 24/7 sem equipa dedicada.' },
  status: { navLabel: 'Estado', title: 'Estado do Sistema', subtitle: 'Superfície pública simples para disponibilidade e comunicação de incidentes.' },
  'data-processing': { navLabel: 'Tratamento de Dados', title: 'Tratamento de Dados', subtitle: 'Visão operacional dos dados tratados e como devem ser controlados.' },
  [disclosureSlug]: { navLabel: 'Disclosure de Vulnerabilidades', title: 'Disclosure de Vulnerabilidades', subtitle: 'Como clientes e reviewers de segurança podem reportar problemas com segurança.' },
};

export function getTrustCenterPage(slug: string, locale: Locale): TrustPage {
  const base = pageCopy[slug] ?? pageCopy.trust;
  const localized = locale === 'pt' ? ptLabels[slug] : undefined;
  return { slug, updated, ...base, ...localized };
}

export function getTrustCenterPages(locale: Locale): TrustPage[] {
  return TRUST_CENTER_ROUTES.map((slug) => getTrustCenterPage(slug, locale));
}
