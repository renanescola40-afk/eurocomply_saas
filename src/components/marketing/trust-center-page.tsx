import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  Globe2,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Scale,
  Server,
  ShieldAlert,
  ShieldCheck,
  Users2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export type TrustPageKind =
  | 'trust'
  | 'security'
  | 'privacy'
  | 'dpa'
  | 'subprocessors'
  | 'sla'
  | 'status'
  | 'compliance'
  | 'data-processing';

type TrustCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type TrustSection = {
  title: string;
  description: string;
  items: string[];
  icon: LucideIcon;
};

type ProviderRow = {
  name: string;
  purpose: string;
  data: string;
  region: string;
  status: string;
};

type StatusRow = {
  name: string;
  state: string;
  description: string;
};

type TrustPageContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
  summaryTitle: string;
  summary: string[];
  cards?: TrustCard[];
  sections: TrustSection[];
  providers?: ProviderRow[];
  statusRows?: StatusRow[];
  disclosure: string;
};

const SECURITY_EMAIL = 'security@risckcomply.com';
const LAST_REVIEWED = '27 June 2026';

const trustCards: TrustCard[] = [
  { title: 'Security overview', description: 'Encryption, tenant isolation, access controls, RLS posture, audit logs and incident response boundaries.', href: '/security', icon: ShieldCheck },
  { title: 'Privacy', description: 'How account, organization, billing, analytics and compliance workflow data are handled.', href: '/privacy', icon: LockKeyhole },
  { title: 'DPA', description: 'Buyer-ready data processing terms for GDPR due diligence and enterprise contracting.', href: '/dpa', icon: Scale },
  { title: 'Subprocessors', description: 'Infrastructure and operational vendors used, or prepared to be used, by the service.', href: '/subprocessors', icon: Users2 },
  { title: 'Service commitments', description: 'Availability, support and incident handling language without unsupported uptime promises.', href: '/sla', icon: LifeBuoy },
  { title: 'Status', description: 'Public status surface and integration point for Better Stack, Instatus or another status provider.', href: '/status', icon: Activity },
];

const sharedSecuritySections: TrustSection[] = [
  {
    title: 'Encryption in transit',
    description: 'Customer traffic is designed to be served over HTTPS/TLS through managed hosting and provider APIs.',
    items: ['TLS is expected for public application traffic.', 'Provider certificates and edge configuration must be verified in the production environment.', 'No custom cryptography claim is made.'],
    icon: LockKeyhole,
  },
  {
    title: 'Encryption at rest',
    description: 'Data at rest is handled through managed infrastructure controls rather than custom encryption code in this repository.',
    items: ['Database and storage encryption depend on the configured Supabase project and provider settings.', 'Billing data is handled by Stripe where enabled.', 'Provider evidence should be attached to an enterprise security pack before stronger commitments are made.'],
    icon: Database,
  },
  {
    title: 'Tenant isolation and RLS',
    description: 'The product is designed around organization-scoped access and Supabase Row Level Security migrations.',
    items: ['Organization membership checks limit workspace access.', 'RLS policies and validation scripts exist in the security workflow.', 'Production tenant-isolation evidence must be refreshed for the target Supabase project.'],
    icon: Server,
  },
  {
    title: 'Access control',
    description: 'Access is role-aware and should be reviewed against each customer workspace setup.',
    items: ['Roles are designed for owners, admins and members/viewers depending on enabled modules.', 'Private routes require authenticated sessions.', 'Admin and service-role operations must stay server-side.'],
    icon: KeyRound,
  },
  {
    title: 'Audit logs',
    description: 'Critical workflow activity is designed to be traceable for review and investigation.',
    items: ['Audit events are used for operational accountability.', 'Hash-chain integrity controls are referenced where implemented.', 'External immutability, WORM storage or SIEM forwarding is not claimed by default.'],
    icon: FileCheck2,
  },
  {
    title: 'Incident response and backups',
    description: 'Operational response is documented, while recovery commitments remain evidence-bound.',
    items: ['Security and availability incidents should be triaged by severity.', 'Customer communications should use the contact path and status page.', 'Provider-managed backups may exist; tested restore objectives are not claimed unless evidence is attached.'],
    icon: ShieldAlert,
  },
];

const providerRows: ProviderRow[] = [
  {
    name: 'Vercel',
    purpose: 'Application hosting, deployment and edge delivery',
    data: 'Application traffic, deployment metadata and logs depending on configuration',
    region: 'Managed global infrastructure; exact runtime region depends on project configuration',
    status: 'Production provider where configured',
  },
  {
    name: 'Supabase',
    purpose: 'Database, authentication, storage and Row Level Security enforcement',
    data: 'Account data, organization records, compliance workflow data and audit events',
    region: 'Configured Supabase project region; disclose exact region in the security pack',
    status: 'Core production provider where configured',
  },
  {
    name: 'Stripe',
    purpose: 'Subscription billing, checkout, customer portal and webhook processing',
    data: 'Billing identifiers, subscription status and payment metadata',
    region: 'Global payments infrastructure',
    status: 'Used when billing is enabled',
  },
  {
    name: 'Sentry',
    purpose: 'Error monitoring and diagnostics',
    data: 'Error events, stack traces and diagnostic metadata depending on configuration',
    region: 'Configured account/project region',
    status: 'Optional/conditional monitoring provider',
  },
  {
    name: 'PostHog',
    purpose: 'Product analytics and usage insights',
    data: 'Product analytics events where analytics are enabled and consent/configuration allow',
    region: 'Configured account/project region',
    status: 'Optional/conditional analytics provider',
  },
];

const statusRows: StatusRow[] = [
  { name: 'Public web application', state: 'Published status surface', description: 'This page is the public status entry point for customers and buyers.' },
  { name: 'Authentication', state: 'Provider-managed', description: 'Authentication depends on the configured Supabase Auth project.' },
  { name: 'Database and RLS', state: 'Evidence required', description: 'Tenant isolation should be validated against the active production Supabase project.' },
  { name: 'Billing', state: 'Conditional', description: 'Billing availability depends on Stripe configuration and webhook health.' },
  { name: 'Monitoring provider', state: 'Configurable', description: 'Better Stack, Instatus or another provider can be linked with NEXT_PUBLIC_STATUS_PAGE_URL.' },
  { name: 'Incident updates', state: 'Manual unless integrated', description: 'No automated external status provider is claimed unless the link is configured.' },
];

const PAGE_CONTENT: Record<TrustPageKind, TrustPageContent> = {
  trust: {
    eyebrow: 'Trust Center',
    title: 'Security, privacy and operational transparency for enterprise due diligence.',
    subtitle: 'Risck comply gives buyers a public place to review controls, evidence boundaries, subprocessors, DPA posture, service commitments and status information before procurement.',
    badge: 'Public trust center',
    summaryTitle: 'Evidence-bound trust posture',
    summary: [
      'Designed for European compliance operations with organization-scoped access, role-aware permissions, audit events and Supabase RLS controls.',
      'Claims are intentionally conservative: no SOC 2, ISO 27001, third-party pentest or tested restore commitment is claimed until evidence exists.',
      'Enterprise buyers can request a security pack, DPA review, subprocessor list and security questionnaire support.',
    ],
    cards: trustCards,
    sections: [
      ...sharedSecuritySections,
      {
        title: 'Data residency and region disclosure',
        description: 'Region information is disclosed based on the actual configured providers, not as a generic EU-only promise.',
        items: ['Supabase project region must be confirmed per production environment.', 'Vercel runtime and edge locations depend on deployment settings.', 'Enterprise contracts can include region commitments only when technically configured and evidenced.'],
        icon: Globe2,
      },
      {
        title: 'Security contact',
        description: 'Security and procurement questions should go through a dedicated security route.',
        items: [`Security contact: ${SECURITY_EMAIL}.`, 'Security pack requests should include company name, use case, regions, data categories and target procurement deadline.', 'If the dedicated mailbox is not yet configured in a deployment environment, route requests through Contact Sales.'],
        icon: Mail,
      },
    ],
    disclosure: 'This Trust Center is a public due-diligence surface, not a certification report. Contractual commitments are governed by the signed agreement with each customer.',
  },
  security: {
    eyebrow: 'Security',
    title: 'Security posture with honest claims and clear evidence boundaries.',
    subtitle: 'A buyer-ready overview of encryption, tenant isolation, RLS, access control, audit logs, incident response, backups and data-region disclosure.',
    badge: 'Security overview',
    summaryTitle: 'What enterprise buyers should know',
    summary: [
      'The platform is built on managed cloud services and avoids unsupported claims about custom cryptography or certifications.',
      'Tenant isolation is designed around organization membership, server-side checks and Supabase RLS policies.',
      'Security evidence should be refreshed for the active production environment before enterprise contracting.',
    ],
    sections: [
      ...sharedSecuritySections,
      {
        title: 'Data residency and regions',
        description: 'Risck comply does not make a blanket EU-only data residency claim on this public page.',
        items: ['Exact data region depends on the configured Supabase project and other enabled providers.', 'Enterprise buyers can request current region evidence in the security pack.', 'Any hard region commitment should appear only in a signed enterprise agreement.'],
        icon: Globe2,
      },
      {
        title: 'Current non-claims',
        description: 'These statements prevent procurement risk from accidental overpromising.',
        items: ['No SOC 2 certification is claimed.', 'No ISO 27001 certification is claimed.', 'No completed independent penetration test is claimed unless a dated report is later added.', 'No 24/7 staffed security operations center is claimed.'],
        icon: AlertTriangle,
      },
    ],
    disclosure: 'Security contact: security@risckcomply.com. Security commitments are limited to the implementation and evidence available for the deployed environment.',
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Privacy information for European business customers.',
    subtitle: 'How Risck comply handles account, organization, billing, analytics and compliance workflow data while supporting GDPR-oriented due diligence.',
    badge: 'Privacy policy',
    summaryTitle: 'Privacy posture',
    summary: [
      'Customers control the business data they enter into the platform, including compliance records, documents, vendors and workspace users.',
      'Risck comply processes data to provide the service, secure accounts, operate billing, support customers and maintain auditability.',
      'This page is a production privacy draft and should be reviewed with counsel before being treated as final legal text.',
    ],
    sections: [
      {
        title: 'Data categories',
        description: 'The platform may process data needed to run compliance operations.',
        items: ['Account identifiers and authentication metadata.', 'Organization profile, workspace membership, roles and permissions.', 'Compliance documents, vendor records, risk records, audit events and notification preferences.', 'Billing metadata through Stripe where billing is enabled.'],
        icon: Database,
      },
      {
        title: 'Purposes',
        description: 'Data is processed to deliver and secure the service.',
        items: ['Authenticate users and enforce workspace access.', 'Operate compliance workflows, documents, reminders, reports and audit trails.', 'Provide customer support, billing, diagnostics and product improvement where enabled.', 'Maintain security, abuse prevention and legal compliance.'],
        icon: ClipboardCheck,
      },
      {
        title: 'Customer controls and rights',
        description: 'European customers and users can request privacy support through the appropriate admin or contact route.',
        items: ['Workspace admins manage users, access and uploaded business records.', 'Requests for access, correction, export or deletion should identify the relevant workspace and data category.', 'Deletion or export may be subject to legal retention, security logs, billing records and contractual obligations.'],
        icon: Users2,
      },
      {
        title: 'Security and subprocessors',
        description: 'Privacy controls depend on the security posture and enabled providers.',
        items: ['Authentication, access control, organization isolation and audit logs support privacy operations.', 'Subprocessors are listed publicly and should be reviewed before enterprise contracting.', 'Analytics and monitoring providers should be enabled only with appropriate configuration and consent posture.'],
        icon: ShieldCheck,
      },
    ],
    disclosure: 'This privacy page is informational and does not replace the signed DPA, Order Form or customer-specific data processing terms.',
  },
  dpa: {
    eyebrow: 'DPA',
    title: 'Data Processing Addendum for GDPR procurement review.',
    subtitle: 'A public DPA summary that helps buyers understand controller/processor roles, processing instructions, TOMs, subprocessors and deletion posture.',
    badge: 'Data Processing Addendum',
    summaryTitle: 'DPA summary',
    summary: [
      'Customer acts as controller for personal data uploaded to the platform; Risck comply acts as processor when operating the service on behalf of the customer.',
      'Processing is limited to providing, securing, supporting and billing the contracted service unless otherwise agreed.',
      'Final DPA terms should be reviewed and signed as part of the enterprise contracting process.',
    ],
    sections: [
      {
        title: 'Roles and instructions',
        description: 'Processing follows customer instructions and the product scope.',
        items: ['Customer is responsible for the lawful basis and accuracy of data entered into the workspace.', 'Risck comply processes customer personal data to provide the service, support users, secure the platform and meet lawful obligations.', 'Any expanded processing scope should be reflected in an Order Form or DPA amendment.'],
        icon: Scale,
      },
      {
        title: 'Technical and organisational measures',
        description: 'Security measures are evidence-bound and mapped to the implementation.',
        items: ['Authenticated access and server-side authorization checks.', 'Organization-scoped tenant isolation and RLS controls where configured.', 'Audit logs for critical operations.', 'Managed-provider encryption in transit and at rest, subject to provider configuration.'],
        icon: ShieldCheck,
      },
      {
        title: 'Subprocessors and transfers',
        description: 'Subprocessors should be disclosed and reviewed before enterprise signature.',
        items: ['Approved subprocessors are listed on the Subprocessors page.', 'Material changes should be handled through customer notification or contract terms.', 'International transfer mechanisms depend on the provider and region configuration.'],
        icon: Globe2,
      },
      {
        title: 'Deletion, return and assistance',
        description: 'End-of-service handling depends on plan, contract and legal retention duties.',
        items: ['Customers may request export or deletion review for workspace data.', 'Security logs, billing records or legal retention records may remain where required.', 'Risck comply should assist with data subject, security and audit requests within agreed scope.'],
        icon: FileCheck2,
      },
    ],
    disclosure: 'This public DPA page is a procurement summary, not a fully executed legal agreement. Use the signed DPA for binding terms.',
  },
  subprocessors: {
    eyebrow: 'Subprocessors',
    title: 'Infrastructure and operational subprocessors.',
    subtitle: 'A clear list of providers used, or conditionally enabled, to operate hosting, authentication, storage, billing, analytics and monitoring.',
    badge: 'Public subprocessor list',
    summaryTitle: 'Review before contracting',
    summary: [
      'The list separates core providers from optional providers so buyers can ask the right questions during due diligence.',
      'Exact regions and data categories must be confirmed against the active production configuration.',
      'Material subprocessor changes should be reviewed and communicated according to the customer agreement.',
    ],
    sections: [
      {
        title: 'Change management',
        description: 'Subprocessor changes should be handled transparently for enterprise customers.',
        items: ['Review provider purpose, data categories and region before production use.', 'Notify enterprise customers of material changes according to the DPA or Order Form.', 'Avoid adding analytics or monitoring providers without privacy and security review.'],
        icon: ClipboardCheck,
      },
    ],
    providers: providerRows,
    disclosure: 'Subprocessor disclosures are only accurate when they match the actual production environment. Remove optional providers if they are not enabled.',
  },
  sla: {
    eyebrow: 'SLA',
    title: 'Service commitments without unsupported uptime promises.',
    subtitle: 'Availability, support and incident-handling language suitable for early enterprise procurement while leaving custom commitments to signed agreements.',
    badge: 'Service commitments',
    summaryTitle: 'Service posture',
    summary: [
      'Risck comply is designed to run on managed cloud infrastructure with public status communication.',
      'Formal uptime percentages, response targets, credits and custom support terms are not promised on this public page unless included in a signed enterprise agreement.',
      'Incident handling should include severity triage, containment, customer communication and post-incident review.'],
    sections: [
      {
        title: 'Availability',
        description: 'The product is designed for reliable access but this page avoids unsupported SLA percentages.',
        items: ['Availability depends on Vercel, Supabase, Stripe and other enabled providers.', 'A public status page exists for platform communication.', 'Formal uptime targets and service credits require an enterprise agreement.'],
        icon: Activity,
      },
      {
        title: 'Support',
        description: 'Support expectations depend on plan and contract.',
        items: ['Self-service customers receive standard support channels where available.', 'Enterprise customers may receive defined response targets by agreement.', 'Security and procurement requests should use the security pack CTA or security contact.'],
        icon: LifeBuoy,
      },
      {
        title: 'Incident response',
        description: 'Security and availability issues should follow a severity-based process.',
        items: ['Triage, containment and recovery actions are prioritized by severity.', 'Customer-facing incidents should be communicated through the status page and direct contact where appropriate.', 'Post-incident review should document impact, root cause and prevention actions.'],
        icon: ShieldAlert,
      },
      {
        title: 'Backups and continuity',
        description: 'Continuity claims are limited until restore evidence exists.',
        items: ['Provider-managed backups may be available depending on Supabase plan/configuration.', 'Recovery point/time objectives are not publicly promised unless tested and contractually agreed.', 'Enterprise buyers can request backup and restore evidence in the security pack.'],
        icon: Database,
      },
    ],
    disclosure: 'This page is not a numeric SLA. Binding service levels, remedies and exclusions must be defined in the signed customer agreement.',
  },
  status: {
    eyebrow: 'Status',
    title: 'Public status page for Risck comply.',
    subtitle: 'A public status surface for availability communication and an integration point for Better Stack, Instatus or another external status provider.',
    badge: 'System status',
    summaryTitle: 'Current public status model',
    summary: [
      'No active incident is currently published on this static status page.',
      'This page does not claim automated external monitoring unless a status provider URL is configured.',
      'Use NEXT_PUBLIC_STATUS_PAGE_URL to link Better Stack, Instatus or another public status provider when ready.',
    ],
    sections: [
      {
        title: 'Incident communication',
        description: 'The status page should be the public source of incident updates once the monitoring workflow is operational.',
        items: ['Publish customer-impacting availability or security incidents here or on the linked external status provider.', 'Include incident state, affected components, start time, customer impact and resolution notes.', 'Do not claim real-time monitoring unless the external provider is connected.'],
        icon: Activity,
      },
      {
        title: 'External provider integration',
        description: 'Better Stack or Instatus can be connected without changing the public navigation.',
        items: ['Set NEXT_PUBLIC_STATUS_PAGE_URL to expose the external provider link.', 'Keep this page as the fallback trust-center status route.', 'Enterprise buyers can request monitoring evidence in the security pack.'],
        icon: Server,
      },
    ],
    statusRows,
    disclosure: 'Status information on this page is intentionally conservative. It should be connected to an automated provider before making real-time availability claims.',
  },
  compliance: {
    eyebrow: 'Compliance',
    title: 'Compliance posture for buyers reviewing Risck comply.',
    subtitle: 'A concise view of what the product supports today and what it does not claim yet.',
    badge: 'Compliance overview',
    summaryTitle: 'No compliance washing',
    summary: [
      'Risck comply helps teams operate compliance workflows, evidence, vendors, risks and audit trails.',
      'The product does not replace legal advice and does not claim customer compliance outcomes.',
      'Security certifications are not claimed until certification evidence exists.'],
    sections: [
      {
        title: 'Supported due-diligence areas',
        description: 'The public Trust Center gives buyers a starting point for vendor review.',
        items: ['Security overview and evidence boundaries.', 'Privacy and DPA posture.', 'Subprocessor list and region disclosure language.', 'Service commitments and status page.'],
        icon: CheckCircle2,
      },
      {
        title: 'Current non-claims',
        description: 'These are intentionally disclosed to avoid misleading buyers.',
        items: ['No SOC 2 certification claim.', 'No ISO 27001 certification claim.', 'No legal advice claim.', 'No guaranteed customer compliance outcome claim.'],
        icon: AlertTriangle,
      },
    ],
    disclosure: 'Compliance pages are procurement aids, not legal opinions or certification reports.',
  },
  'data-processing': {
    eyebrow: 'Data processing',
    title: 'Data processing and GDPR procurement overview.',
    subtitle: 'A buyer-friendly route that points to the DPA model, privacy posture, data categories, subprocessors and region disclosures.',
    badge: 'Data processing',
    summaryTitle: 'Processing overview',
    summary: [
      'Customer-controlled workspace data is processed to provide the contracted service.',
      'Subprocessors and region information should be reviewed before signature.',
      'The signed DPA governs binding processing terms.'],
    sections: [
      {
        title: 'Processing scope',
        description: 'The platform processes the records needed to operate compliance workflows.',
        items: ['User and organization records.', 'Compliance documents, risks, vendors, tasks and audit events.', 'Billing and diagnostics metadata where providers are enabled.'],
        icon: Database,
      },
      {
        title: 'Where to review details',
        description: 'The data processing route connects to the pages enterprise buyers expect.',
        items: ['Read the DPA page for roles, instructions and TOMs.', 'Read the Privacy page for data categories and user rights.', 'Read the Subprocessors page for provider review.'],
        icon: FileCheck2,
      },
    ],
    disclosure: 'This overview supports procurement review. Binding data processing commitments require a signed DPA.',
  },
};

function getLocale(rawLocale: string): Locale {
  return isSupportedLocale(rawLocale) ? rawLocale : 'en';
}

function localHref(locale: Locale, href: string) {
  return `/${locale}${href}`;
}

function StatusBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/70">
      {children}
    </span>
  );
}

function CtaRow({ locale }: { locale: Locale }) {
  const securityPackHref = `mailto:${SECURITY_EMAIL}?subject=Risck%20comply%20security%20pack%20request`;
  const ctas = [
    { label: 'Request security pack', href: securityPackHref, icon: Mail, primary: true, external: true },
    { label: 'Contact sales', href: localHref(locale, '/contact?intent=sales'), icon: ArrowRight },
    { label: 'Book demo', href: localHref(locale, '/contact?intent=demo'), icon: CheckCircle2 },
  ];

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {ctas.map((cta) => {
        const Icon = cta.icon;
        const className = cta.primary
          ? 'inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200'
          : 'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08]';

        if (cta.external) {
          return (
            <a key={cta.label} href={cta.href} className={className}>
              {cta.label} <Icon className="h-4 w-4" />
            </a>
          );
        }

        return (
          <Link key={cta.label} href={cta.href} className={className}>
            {cta.label} <Icon className="h-4 w-4" />
          </Link>
        );
      })}
    </div>
  );
}

function ProviderTable({ providers }: { providers: ProviderRow[] }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
        <div className="grid gap-4 border-b border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-white/45 md:grid-cols-[0.9fr_1.2fr_1.4fr_1.2fr_0.9fr]">
          <span>Provider</span>
          <span>Purpose</span>
          <span>Data</span>
          <span>Region</span>
          <span>Status</span>
        </div>
        {providers.map((provider) => (
          <div key={provider.name} className="grid gap-4 border-b border-white/10 px-6 py-5 text-sm leading-6 text-white/65 last:border-b-0 md:grid-cols-[0.9fr_1.2fr_1.4fr_1.2fr_0.9fr]">
            <strong className="text-white">{provider.name}</strong>
            <span>{provider.purpose}</span>
            <span>{provider.data}</span>
            <span>{provider.region}</span>
            <span>{provider.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusTable({ rows }: { rows: StatusRow[] }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <article key={row.name} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6">
            <StatusBadge>{row.state}</StatusBadge>
            <h2 className="mt-5 text-xl font-semibold text-white">{row.name}</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">{row.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TrustCenterPage({ locale: rawLocale, kind }: { locale: string; kind: TrustPageKind }) {
  const locale = getLocale(rawLocale);
  const content = PAGE_CONTENT[kind];
  const externalStatusPageUrl = process.env.NEXT_PUBLIC_STATUS_PAGE_URL;

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-[#E0E0E0]">
      <section className="relative overflow-hidden px-6 py-20 md:py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.12),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(255,255,255,.08),transparent_28%),linear-gradient(to_bottom,#0A0A0F,#050508)]" />
        <div className="mx-auto max-w-7xl">
          <Link href={localHref(locale, '')} className="text-sm text-white/60 transition hover:text-white">
            Risck comply
          </Link>
          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/80">
            <ShieldCheck className="h-4 w-4" /> {content.badge}
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.32em] text-white/45">{content.eyebrow}</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-[-0.055em] text-white md:text-6xl lg:text-7xl">
            {content.title}
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/65 md:text-xl">{content.subtitle}</p>
          <CtaRow locale={locale} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-12 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3 text-white">
            <ClipboardCheck className="h-5 w-5" />
            <h2 className="text-2xl font-semibold">{content.summaryTitle}</h2>
          </div>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-white/65">
            {content.summary.map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-white" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/80">
            Last reviewed: {LAST_REVIEWED}. Certification claims are shown only when evidence exists.
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3 text-white">
            <Mail className="h-5 w-5" />
            <h2 className="text-2xl font-semibold">Enterprise request path</h2>
          </div>
          <div className="mt-6 grid gap-3 text-sm leading-7 text-white/65 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">1. Request pack</p>
              <p className="mt-2">Ask for security questionnaire support, DPA review and current evidence.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">2. Validate scope</p>
              <p className="mt-2">Confirm regions, data categories, plan, integrations and contractual commitments.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">3. Attach evidence</p>
              <p className="mt-2">Use dated release, RLS, backup, monitoring and provider evidence before signature.</p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-7 text-white/55">
            Security contact: <a href={`mailto:${SECURITY_EMAIL}`} className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">{SECURITY_EMAIL}</a>. Include your company name, target region, use case and procurement deadline.
          </p>
        </article>
      </section>

      {content.cards ? (
        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-12 md:grid-cols-2 lg:grid-cols-3">
          {content.cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={localHref(locale, card.href)} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white text-black">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-white">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/60">{card.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/80 group-hover:text-white">
                  Open page <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </section>
      ) : null}

      {content.providers ? <ProviderTable providers={content.providers} /> : null}
      {content.statusRows ? <StatusTable rows={content.statusRows} /> : null}

      {kind === 'status' ? (
        <section className="mx-auto max-w-7xl px-6 pb-12">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8">
            <h2 className="text-2xl font-semibold text-white">External status provider</h2>
            {externalStatusPageUrl ? (
              <a href={externalStatusPageUrl} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-zinc-200">
                Open external status page <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">
                No external Better Stack/Instatus URL is configured in this build. Set NEXT_PUBLIC_STATUS_PAGE_URL when the external status page is ready, and keep this route as the public fallback.
              </p>
            )}
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-16 md:grid-cols-2">
        {content.sections.map((section) => {
          const Icon = section.icon;
          return (
            <article key={section.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white text-black">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">{section.description}</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-white/70">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8">
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-2xl font-semibold">Important disclosure</h2>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/65">{content.disclosure}</p>
          <CtaRow locale={locale} />
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
