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
import { normalizeLocale } from '@/lib/i18n/locales';

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

export type LocalizedTrustCopy = {
  brand: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  notice: string;
  cards: Array<{ href: string; title: string; body: string }>;
  evidenceTitle: string;
  evidenceItems: string[];
  procurementTitle: string;
  procurementItems: string[];
};

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
const LAST_REVIEWED = '26 June 2026';

const trustCardIcons = [ShieldCheck, Database, Users2, LockKeyhole, Scale, Activity];

const sharedSecuritySections: TrustSection[] = [
  {
    title: 'Encryption and managed infrastructure',
    description: 'Customer traffic and stored data rely on configured managed cloud providers rather than unsupported custom cryptography claims.',
    items: ['HTTPS/TLS is expected for public traffic.', 'Database and storage encryption depend on configured Supabase/provider controls.', 'Provider evidence should be attached before stronger enterprise commitments are made.'],
    icon: LockKeyhole,
  },
  {
    title: 'Tenant isolation and access control',
    description: 'The product is designed around organization-scoped access, roles, server-side authorization and Supabase RLS posture.',
    items: ['Private routes require authenticated sessions.', 'Workspace access is scoped by organization membership.', 'Admin and service-role operations must stay server-side.'],
    icon: KeyRound,
  },
  {
    title: 'Auditability and evidence',
    description: 'Critical workflow activity is designed to support review, investigation and buyer due diligence.',
    items: ['Audit events support operational accountability.', 'Hash-chain integrity controls are referenced where implemented.', 'External immutability or SIEM forwarding is not claimed by default.'],
    icon: FileCheck2,
  },
  {
    title: 'Incident response and recovery',
    description: 'Operational response is documented while recovery commitments remain bound to actual production evidence.',
    items: ['Incidents should be triaged by severity.', 'Customer communications should use the contact path and status page.', 'Tested restore objectives are not claimed unless evidence exists.'],
    icon: ShieldAlert,
  },
];

const providerRows: ProviderRow[] = [
  { name: 'Vercel', purpose: 'Application hosting, deployment and edge delivery', data: 'Application traffic, deployment metadata and logs depending on configuration', region: 'Managed global infrastructure; runtime region depends on project configuration', status: 'Production provider where configured' },
  { name: 'Supabase', purpose: 'Database, authentication, storage and Row Level Security', data: 'Account data, organization records, workflow data and audit events', region: 'Configured project region; disclose exact region in the security pack', status: 'Core production provider where configured' },
  { name: 'Stripe', purpose: 'Subscription billing, checkout, customer portal and webhook processing', data: 'Billing identifiers, subscription status and payment metadata', region: 'Global payments infrastructure', status: 'Used when billing is enabled' },
  { name: 'Sentry', purpose: 'Error monitoring and diagnostics', data: 'Error events, stack traces and diagnostic metadata depending on configuration', region: 'Configured account/project region', status: 'Optional monitoring provider' },
  { name: 'PostHog', purpose: 'Product analytics and usage insights', data: 'Product analytics events where enabled and appropriate', region: 'Configured account/project region', status: 'Optional analytics provider' },
];

const statusRows: StatusRow[] = [
  { name: 'Public web application', state: 'Published status surface', description: 'This route is the public status entry point for customers and buyers.' },
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
    summary: ['Designed for European compliance operations with organization-scoped access, role-aware permissions, audit events and Supabase RLS controls.', 'Claims are intentionally conservative and tied to evidence.', 'Enterprise buyers can request a security pack, DPA review, subprocessor list and questionnaire support.'],
    cards: [
      { title: 'Security overview', description: 'Encryption, tenant isolation, access controls, RLS posture, audit logs and incident response boundaries.', href: '/security', icon: ShieldCheck },
      { title: 'Privacy', description: 'How account, organization, billing, analytics and compliance workflow data are handled.', href: '/privacy', icon: LockKeyhole },
      { title: 'DPA', description: 'Buyer-ready data processing terms for GDPR due diligence and enterprise contracting.', href: '/dpa', icon: Scale },
      { title: 'Subprocessors', description: 'Infrastructure and operational vendors used, or prepared to be used, by the service.', href: '/subprocessors', icon: Users2 },
      { title: 'Service commitments', description: 'Availability, support and incident handling language without unsupported uptime promises.', href: '/sla', icon: LifeBuoy },
      { title: 'Status', description: 'Public status surface and external provider integration point.', href: '/status', icon: Activity },
    ],
    sections: [
      ...sharedSecuritySections,
      { title: 'Security contact', description: 'Security and procurement questions should go through a dedicated route.', items: [`Security contact: ${SECURITY_EMAIL}.`, 'Security pack requests should include company name, use case, regions, data categories and procurement deadline.'], icon: Mail },
    ],
    disclosure: 'This Trust Center is a public due-diligence surface, not a certification report. Contractual commitments are governed by the signed customer agreement.',
  },
  security: {
    eyebrow: 'Security',
    title: 'Security posture with honest claims and clear evidence boundaries.',
    subtitle: 'A buyer-ready overview of encryption, tenant isolation, RLS, access control, audit logs, incident response, backups and data-region disclosure.',
    badge: 'Security overview',
    summaryTitle: 'What enterprise buyers should know',
    summary: ['The platform is built on managed cloud services and avoids unsupported certification claims.', 'Tenant isolation is designed around organization membership, server-side checks and Supabase RLS policies.', 'Security evidence should be refreshed for the active production environment before enterprise contracting.'],
    sections: [...sharedSecuritySections, { title: 'Current non-claims', description: 'These statements prevent procurement risk from accidental overpromising.', items: ['No SOC 2 certification is claimed.', 'No ISO 27001 certification is claimed.', 'No completed independent penetration test is claimed unless a dated report is added.'], icon: AlertTriangle }],
    disclosure: `Security contact: ${SECURITY_EMAIL}. Security commitments are limited to the implementation and evidence available for the deployed environment.`,
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Privacy information for European business customers.',
    subtitle: 'How Risck comply handles account, organization, billing, analytics and compliance workflow data while supporting GDPR-oriented due diligence.',
    badge: 'Privacy policy',
    summaryTitle: 'Privacy posture',
    summary: ['Customers control the business data they enter into the platform.', 'Risck comply processes data to provide, secure, support and bill the service.', 'This page is informational and should be reviewed with counsel before final legal use.'],
    sections: [
      { title: 'Data categories', description: 'The platform may process data needed to run compliance operations.', items: ['Account identifiers and authentication metadata.', 'Organization profile, workspace membership, roles and permissions.', 'Compliance documents, vendor records, risk records, audit events and notification preferences.'], icon: Database },
      { title: 'Purposes', description: 'Data is processed to deliver and secure the service.', items: ['Authenticate users and enforce workspace access.', 'Operate compliance workflows, documents, reminders, reports and audit trails.', 'Provide support, billing, diagnostics and product improvement where enabled.'], icon: ClipboardCheck },
      { title: 'Customer controls and rights', description: 'European customers and users can request privacy support through the appropriate admin or contact route.', items: ['Workspace admins manage users, access and uploaded business records.', 'Requests for access, correction, export or deletion should identify the relevant workspace and data category.'], icon: Users2 },
    ],
    disclosure: 'This privacy page is informational and does not replace the signed DPA, Order Form or customer-specific data processing terms.',
  },
  dpa: {
    eyebrow: 'DPA',
    title: 'Data Processing Addendum for GDPR procurement review.',
    subtitle: 'A public DPA summary for controller/processor roles, processing instructions, TOMs, subprocessors and deletion posture.',
    badge: 'Data Processing Addendum',
    summaryTitle: 'DPA summary',
    summary: ['Customer acts as controller for personal data uploaded to the platform.', 'Risck comply acts as processor when operating the service on behalf of the customer.', 'Final terms should be reviewed and signed during enterprise contracting.'],
    sections: [
      { title: 'Roles and instructions', description: 'Processing follows customer instructions and product scope.', items: ['Customer is responsible for lawful basis and data accuracy.', 'Risck comply processes data to provide, secure, support and bill the service.'], icon: Scale },
      { title: 'Technical and organisational measures', description: 'Security controls are evidence-bound.', items: ['Authentication and authorization controls.', 'Organization scoping and RLS posture.', 'Auditability and incident response processes.'], icon: ShieldCheck },
    ],
    disclosure: 'This page is a DPA summary and not the final signed legal addendum.',
  },
  subprocessors: {
    eyebrow: 'Subprocessors',
    title: 'Infrastructure and operational providers used by the platform.',
    subtitle: 'A public subprocessor overview for procurement and privacy review.',
    badge: 'Subprocessor list',
    summaryTitle: 'Provider transparency',
    summary: ['Providers depend on the deployed configuration.', 'Exact regions should be verified in the enterprise security pack.', 'Optional analytics and monitoring providers should be enabled only when appropriate.'],
    sections: [{ title: 'Review process', description: 'Subprocessors should be reviewed before customer signature.', items: ['Confirm enabled providers.', 'Confirm regions and data categories.', 'Attach current evidence for enterprise customers.'], icon: Users2 }],
    providers: providerRows,
    disclosure: 'This list is informational and must be aligned with the signed DPA and actual production configuration.',
  },
  sla: {
    eyebrow: 'Service commitments',
    title: 'Availability, support and incident handling without unsupported uptime promises.',
    subtitle: 'A conservative SLA surface for early enterprise discussions.',
    badge: 'SLA overview',
    summaryTitle: 'Commitment posture',
    summary: ['Public pages do not claim a hard uptime percentage by default.', 'Provider outages, maintenance and customer configuration may affect availability.', 'Enterprise SLAs should be contract-specific.'],
    sections: [
      { title: 'Support path', description: 'Support expectations should be tied to the customer plan and contract.', items: ['Route security issues to the security contact.', 'Route buying and implementation questions through sales.', 'Prioritize incidents by severity and customer impact.'], icon: LifeBuoy },
      { title: 'Incident communication', description: 'Status updates should be evidence-based and timely.', items: ['Publish updates through the status surface.', 'Avoid unsupported RCA claims before investigation.', 'Document remediation and follow-up actions.'], icon: ShieldAlert },
    ],
    disclosure: 'Formal SLA terms must be captured in the signed agreement or order form.',
  },
  status: {
    eyebrow: 'Status',
    title: 'Public service status and incident communication surface.',
    subtitle: 'A fallback status page that can link to Better Stack, Instatus or another provider when configured.',
    badge: 'Status page',
    summaryTitle: 'Current status model',
    summary: ['This route is the public status entry point.', 'External status automation is only claimed when NEXT_PUBLIC_STATUS_PAGE_URL is configured.', 'Provider-specific health depends on the active deployment.'],
    sections: [{ title: 'Operational model', description: 'Keep status claims tied to real monitoring evidence.', items: ['Manual updates are acceptable until external status integration is configured.', 'Do not claim automated incident detection unless it is deployed.', 'Use this route as the public fallback.'], icon: Activity }],
    statusRows,
    disclosure: 'Status information is informational and not a contractual SLA unless separately agreed.',
  },
  compliance: {
    eyebrow: 'Compliance posture',
    title: 'Built for European compliance teams.',
    subtitle: 'Risck comply helps companies organize evidence, responsibilities, deadlines and audit trails across European operations.',
    badge: 'Compliance overview',
    summaryTitle: 'Compliance operating model',
    summary: ['GDPR-oriented workflows.', 'Roadmap alignment for AI Act, DORA and NIS2 needs.', 'Audit-ready evidence surfaces for operational review.'],
    sections: [
      { title: 'Governance workflows', description: 'Organize responsibilities, documents and reviews.', items: ['Compliance records.', 'Vendor evidence.', 'Operational approvals.'], icon: ClipboardCheck },
      { title: 'Evidence readiness', description: 'Help teams prove what happened and when.', items: ['Audit trails.', 'Document metadata.', 'Status and readiness reporting.'], icon: FileCheck2 },
    ],
    disclosure: 'This page is a product and security overview. Formal legal commitments are governed by signed agreements.',
  },
  'data-processing': {
    eyebrow: 'Data Processing',
    title: 'How Risck comply handles customer data.',
    subtitle: 'A practical overview for procurement, privacy and review teams evaluating Risck comply as a European compliance platform.',
    badge: 'Data processing overview',
    summaryTitle: 'Processing summary',
    summary: ['Customer data is processed to provide the service.', 'Access is scoped by authenticated users and organization membership.', 'Controlled documents and audit events support compliance operations.'],
    sections: [
      { title: 'Customer data', description: 'The platform processes business records needed to deliver compliance workflows.', items: ['Organization profiles.', 'Compliance records.', 'Documents, vendors and audit events.'], icon: Database },
      { title: 'Minimisation', description: 'Collect only what is needed for product operation and customer workflows.', items: ['Limit uploaded data to the use case.', 'Review retention and deletion requirements.', 'Use processor and subprocessor documentation during procurement.'], icon: LockKeyhole },
    ],
    disclosure: 'This overview is informational and should be read with the Privacy Policy, DPA and Subprocessors list.',
  },
};

function getLocale(rawLocale: string) {
  return normalizeLocale(rawLocale);
}

function localHref(locale: string, path: string) {
  return `/${locale}${path}`;
}

function trustCopyToContent(copy: LocalizedTrustCopy): TrustPageContent {
  return {
    eyebrow: copy.eyebrow,
    title: copy.title,
    subtitle: copy.subtitle,
    badge: copy.notice,
    summaryTitle: copy.evidenceTitle,
    summary: copy.evidenceItems,
    cards: copy.cards.map((card, index) => ({
      title: card.title,
      description: card.body,
      href: card.href,
      icon: trustCardIcons[index] ?? ShieldCheck,
    })),
    sections: [
      {
        title: copy.procurementTitle,
        description: copy.notice,
        items: copy.procurementItems,
        icon: ClipboardCheck,
      },
      ...sharedSecuritySections,
      {
        title: 'Security contact',
        description: 'Security and procurement questions should go through a dedicated route.',
        items: [`Security contact: ${SECURITY_EMAIL}.`, 'Include company name, use case, regions, data categories and procurement deadline.'],
        icon: Mail,
      },
    ],
    disclosure: copy.notice,
  };
}

function CtaRow({ locale }: { locale: string }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link href={localHref(locale, '/contact')} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
        Contact sales
      </Link>
      <Link href={localHref(locale, '/trust')} className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
        Open Trust Center
      </Link>
    </div>
  );
}

function StatusBadge({ children }: { children: string }) {
  return <span className="inline-flex rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/75">{children}</span>;
}

function ProviderTable({ providers }: { providers: ProviderRow[] }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.035]">
        <div className="grid grid-cols-5 gap-4 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
          <span>Provider</span>
          <span>Purpose</span>
          <span>Data</span>
          <span>Region</span>
          <span>Status</span>
        </div>
        {providers.map((provider) => (
          <div key={provider.name} className="grid grid-cols-1 gap-3 border-b border-white/10 px-5 py-5 text-sm leading-6 text-white/65 last:border-b-0 md:grid-cols-5">
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

export function TrustCenterPage({ locale: rawLocale, kind, copy }: { locale: string; kind: TrustPageKind; copy?: LocalizedTrustCopy }) {
  const locale = getLocale(rawLocale);
  const content = kind === 'trust' && copy ? trustCopyToContent(copy) : PAGE_CONTENT[kind];
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
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-[-0.055em] text-white md:text-6xl lg:text-7xl">{content.title}</h1>
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
