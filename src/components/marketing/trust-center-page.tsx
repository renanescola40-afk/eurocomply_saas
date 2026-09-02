import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Users2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { normalizeLocale } from '@/lib/i18n/locales';
import { getLegalPublicationState } from '@/server/legal/legal-publication-state';

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
const LAST_REVIEWED = '30 July 2026';

const trustCardIcons = [ShieldCheck, Database, Users2, LockKeyhole, Scale, Activity];

const trustUiCopy: Record<string, { lastReviewed: string; evidenceOnly: string; open: string; openTrust: string }> = {
  en: { lastReviewed: 'Last reviewed', evidenceOnly: 'Certification claims are shown only when evidence exists.', open: 'Open', openTrust: 'Open Trust Center' },
  pt: { lastReviewed: 'Última revisão', evidenceOnly: 'Afirmações de certificação só aparecem quando existe evidência.', open: 'Abrir', openTrust: 'Abrir Centro de Confiança' },
  es: { lastReviewed: 'Última revisión', evidenceOnly: 'Las afirmaciones de certificación solo aparecen cuando existe evidencia.', open: 'Abrir', openTrust: 'Abrir Centro de Confianza' },
  fr: { lastReviewed: 'Dernière révision', evidenceOnly: 'Les affirmations de certification n’apparaissent qu’avec des preuves.', open: 'Ouvrir', openTrust: 'Ouvrir le Centre de confiance' },
  it: { lastReviewed: 'Ultima revisione', evidenceOnly: 'Le dichiarazioni di certificazione compaiono solo quando esistono evidenze.', open: 'Apri', openTrust: 'Apri Centro fiducia' },
  de: { lastReviewed: 'Letzte Prüfung', evidenceOnly: 'Zertifizierungsaussagen werden nur mit Nachweis angezeigt.', open: 'Öffnen', openTrust: 'Trust Center öffnen' },
};

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
  { name: 'Sentry', purpose: 'Monitoring and diagnostics', data: 'Diagnostic events, error context and metadata depending on configuration', region: 'Configured account/project region', status: 'Optional monitoring provider' },
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
    disclosure: 'This SLA page is informational and does not create a standalone uptime commitment.',
  },
  status: {
    eyebrow: 'Status',
    title: 'Public status and operational availability surface.',
    subtitle: 'A lightweight public status page for uptime, incidents, maintenance and monitoring-provider integration.',
    badge: 'Status page',
    summaryTitle: 'Current status model',
    summary: ['This route is the public status entry point.', 'External provider integration can be linked when configured.', 'Incident communication should be evidence-based and time stamped.'],
    sections: [{ title: 'Status communication', description: 'Customers should have a simple place to check known incidents.', items: ['Publish active incidents and maintenance windows.', 'Avoid unsupported uptime or RCA claims.', 'Link to external monitoring only when configured.'], icon: Activity }],
    statusRows,
    disclosure: 'This page is not a substitute for contractual SLA terms.',
  },
  compliance: {
    eyebrow: 'Compliance',
    title: 'AI governance and EU AI Act readiness without legal overclaiming.',
    subtitle: 'A public explanation of what the product helps organize and where professional advice remains necessary.',
    badge: 'Compliance posture',
    summaryTitle: 'Compliance support model',
    summary: ['The platform helps organize AI systems, risks, documents, vendors, tasks and evidence.', 'It does not replace legal counsel, certification bodies or external audits.', 'Readiness outputs should be reviewed by qualified professionals before reliance.'],
    sections: [
      { title: 'What the platform supports', description: 'Operational compliance work needs structure and evidence.', items: ['AI inventory and system records.', 'Risk classification workflow support.', 'Document and policy generation from controlled inputs.', 'Evidence and audit trail organization.'], icon: ClipboardCheck },
      { title: 'What is not claimed', description: 'Compliance claims stay conservative.', items: ['No automatic legal compliance guarantee.', 'No certification claim.', 'No replacement for counsel or external audit.'], icon: AlertTriangle },
    ],
    disclosure: 'Compliance outputs are operational aids and should be reviewed before legal or regulatory reliance.',
  },
  'data-processing': {
    eyebrow: 'Data processing',
    title: 'Data processing overview for procurement and GDPR review.',
    subtitle: 'How customer data categories, purposes, subprocessors and deletion expectations are described publicly.',
    badge: 'Data processing overview',
    summaryTitle: 'Processing summary',
    summary: ['Customer business records are processed to deliver the service.', 'Subprocessors and regions depend on configured providers.', 'Enterprise customers can request updated evidence and DPA review.'],
    sections: [
      { title: 'Operational data', description: 'Data entered into the platform supports compliance workflows.', items: ['AI systems and vendors.', 'Risks, controls, documents, tasks and audit entries.', 'Users, roles, organization metadata and billing references.'], icon: Database },
      { title: 'Retention and deletion', description: 'Deletion posture should be confirmed in the signed agreement.', items: ['Workspace admins can request export or deletion support.', 'Backups and provider logs may follow provider-specific retention windows.'], icon: ClipboardCheck },
    ],
    disclosure: 'This data-processing overview is informational and does not replace a signed DPA.',
  },
};

function getLocalizedPrefix(locale: string) {
  const normalized = normalizeLocale(locale);
  return `/${normalized}`;
}

function localizeHref(locale: string, href: string) {
  const prefix = getLocalizedPrefix(locale);
  return href === '/' ? prefix : `${prefix}${href}`;
}

function localizedLandingContent(copy: LocalizedTrustCopy): TrustPageContent {
  return {
    ...PAGE_CONTENT.trust,
    eyebrow: copy.eyebrow,
    title: copy.title,
    subtitle: copy.subtitle,
    badge: copy.eyebrow,
    summaryTitle: copy.evidenceTitle,
    summary: copy.evidenceItems,
    cards: copy.cards.map((card, index) => ({
      title: card.title,
      description: card.body,
      href: card.href,
      icon: trustCardIcons[index % trustCardIcons.length],
    })),
    sections: [
      {
        title: copy.procurementTitle,
        description: copy.notice,
        items: copy.procurementItems,
        icon: ClipboardCheck,
      },
    ],
    disclosure: copy.notice,
  };
}

export function TrustCenterPage({ locale, kind, localizedCopy }: { locale: string; kind: TrustPageKind; localizedCopy?: LocalizedTrustCopy }) {
  const normalizedLocale = normalizeLocale(locale);
  const content = localizedCopy && kind === 'trust' ? localizedLandingContent(localizedCopy) : (PAGE_CONTENT[kind] ?? PAGE_CONTENT.trust);
  const prefix = getLocalizedPrefix(locale);
  const legalPublication = getLegalPublicationState();
  const ui = trustUiCopy[normalizedLocale] ?? trustUiCopy.en;

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <section className="border-b border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href={prefix} aria-label="RISCK COMPLY home" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={178} height={32} priority />
          </Link>
          <div className="mt-10 inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-500/[0.08] px-4 py-2 text-sm text-blue-100">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {content.badge}
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-blue-300/70">{content.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">{content.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{content.subtitle}</p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.86fr_1.14fr]">
          <aside className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300/65">{content.summaryTitle}</p>
            <div className="mt-5 space-y-3">
              {content.summary.map((item) => (
                <p key={item} className="text-sm leading-7 text-white/58">{item}</p>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-amber-200/20 bg-amber-200/[0.06] p-4" lang="en">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/80">{legalPublication.label}</p>
              <p className="mt-2 text-xs leading-6 text-white/52">{legalPublication.notice}</p>
            </div>
            <p className="mt-6 text-xs leading-6 text-white/36">{ui.lastReviewed}: {LAST_REVIEWED}. {ui.evidenceOnly}</p>
          </aside>

          <div className="space-y-5">
            {content.cards ? (
              <div className="grid gap-4 md:grid-cols-2">
                {content.cards.map((card, index) => {
                  const Icon = card.icon ?? trustCardIcons[index % trustCardIcons.length];
                  return (
                    <Link key={card.href} href={localizeHref(locale, card.href)} className="group rounded-xl border border-slate-800/80 bg-[#0d1522] p-5 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg border border-slate-700 bg-slate-950/30 p-3 text-blue-300"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                        <div>
                          <h2 className="font-semibold text-white">{card.title}</h2>
                          <p className="mt-2 text-sm leading-6 text-white/52">{card.description}</p>
                          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-300">{ui.open} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {content.sections.map((section) => {
              const Icon = section.icon;
              return (
                <article key={section.title} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg border border-slate-700 bg-slate-950/30 p-3 text-blue-300"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-white/54">{section.description}</p>
                      <ul className="mt-4 space-y-2">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-2 text-sm leading-6 text-white/56"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" /> {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}

            {content.providers ? (
              <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-[#0d1522]">
                {content.providers.map((provider) => (
                  <div key={provider.name} className="grid gap-3 border-b border-slate-800 p-5 last:border-b-0 md:grid-cols-[.7fr_1fr_1fr_.8fr_.8fr]">
                    <strong>{provider.name}</strong>
                    <span className="text-sm text-white/55">{provider.purpose}</span>
                    <span className="text-sm text-white/55">{provider.data}</span>
                    <span className="text-sm text-white/55">{provider.region}</span>
                    <span className="text-sm text-blue-300">{provider.status}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {content.statusRows ? (
              <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-[#0d1522]">
                {content.statusRows.map((row) => (
                  <div key={row.name} className="grid gap-3 border-b border-slate-800 p-5 last:border-b-0 md:grid-cols-[.7fr_.7fr_1.4fr]">
                    <strong>{row.name}</strong>
                    <span className="text-sm text-blue-300">{row.state}</span>
                    <span className="text-sm text-white/55">{row.description}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm leading-7 text-white/50 md:flex-row md:items-center md:justify-between">
          <p>{content.disclosure}</p>
          <Link href={localizeHref(locale, '/trust')} className="inline-flex items-center gap-2 rounded-md font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{ui.openTrust} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </section>

      <PublicFooter locale={normalizedLocale} />
    </main>
  );
}
