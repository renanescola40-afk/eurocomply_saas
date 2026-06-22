import Link from 'next/link';
import { PublicFooter } from './public-footer';
import { locales, type Locale } from '@/lib/i18n/routing';

type PageSection = {
  title: string;
  body: string;
};

type PublicInfoContent = {
  eyebrow: string;
  title: string;
  summary: string;
  primaryCta: string;
  secondaryCta: string;
  sections: PageSection[];
};

const commonSections = {
  evidence: {
    title: 'Evidence-first assurance',
    body: 'Critical controls are represented as routes, reports, audit entries and operational workflows rather than scattered spreadsheet notes.',
  },
  security: {
    title: 'Security baseline',
    body: 'Authentication, authorization, audit logging, document handling and public error boundaries are treated as release gates.',
  },
  operations: {
    title: 'Operational readiness',
    body: 'Pricing, support, service commitments, privacy and processor information stay visible so buyers are not forced into a dead-end flow.',
  },
};

const pageContent = {
  trust: {
    eyebrow: 'Trust Center',
    title: 'Compliance trust starts with predictable routes.',
    summary: 'EuroComply keeps security, compliance and operational assurance information reachable before procurement or customer review cycles begin.',
    primaryCta: 'Review security',
    secondaryCta: 'See pricing',
    sections: [commonSections.evidence, commonSections.security, commonSections.operations],
  },
  security: {
    eyebrow: 'Security',
    title: 'Security controls for European compliance operations.',
    summary: 'The platform is designed around authenticated workspaces, RBAC, protected routes, controlled errors and release gates that block broken critical paths.',
    primaryCta: 'View compliance posture',
    secondaryCta: 'Contact team',
    sections: [
      commonSections.security,
      { title: 'RBAC boundaries', body: 'Owner, admin, editor and viewer journeys are validated so visual actions match the expected permission model.' },
      { title: 'Route health', body: 'Public and private surfaces are covered by Playwright route checks for unexpected 404, 500 and malformed dynamic links.' },
    ],
  },
  compliance: {
    eyebrow: 'Compliance',
    title: 'Governance evidence for modern European SaaS teams.',
    summary: 'Centralize documents, vendors, risks, approvals, reporting and audit trails in one workspace with clear ownership.',
    primaryCta: 'Open trust center',
    secondaryCta: 'Create account',
    sections: [commonSections.evidence, commonSections.operations, commonSections.security],
  },
  resources: {
    eyebrow: 'Resources',
    title: 'Practical guidance for operating compliance without route chaos.',
    summary: 'Use EuroComply to turn security questionnaires, reports, risks and audit evidence into repeatable operating workflows.',
    primaryCta: 'Start free',
    secondaryCta: 'See pricing',
    sections: [
      { title: 'Route inventory', body: 'Critical public and private routes are documented so teams know what must stay healthy before release.' },
      { title: 'Quality gates', body: 'Static link checks and Playwright E2E tests guard against broken links, dead flows and unexpected errors.' },
      commonSections.evidence,
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Frequently asked route, trust and billing questions.',
    summary: 'Quick answers for visitors, buyers and workspace operators evaluating EuroComply.',
    primaryCta: 'View pricing',
    secondaryCta: 'Contact team',
    sections: [
      { title: 'Can I start without a sales call?', body: 'Yes. Pricing and signup are public routes and remain part of the route health gate.' },
      { title: 'Are private pages protected?', body: 'Private workspace routes redirect anonymous visitors to localized login pages with the requested destination preserved.' },
      { title: 'How is broken navigation prevented?', body: 'Critical public links, private redirects, malformed dynamic links and stack traces are checked by CI.' },
    ],
  },
  about: {
    eyebrow: 'About EuroComply',
    title: 'A compliance operating system for teams that ship fast.',
    summary: 'EuroComply is built for European SaaS, fintech and B2B teams that need visible evidence, clear roles and reliable customer-review workflows.',
    primaryCta: 'Explore trust',
    secondaryCta: 'See pricing',
    sections: [commonSections.evidence, commonSections.operations, commonSections.security],
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Talk to the EuroComply team.',
    summary: 'Use the public contact path for procurement, security review, support or partnership questions.',
    primaryCta: 'Email contact',
    secondaryCta: 'View trust center',
    sections: [
      { title: 'Security reviews', body: 'Send questionnaire, evidence and procurement questions to the team for review.' },
      { title: 'Billing questions', body: 'Plan and subscription questions can start from public pricing and continue inside the workspace billing area.' },
      { title: 'Support', body: 'Operational support routes are tracked as part of the public route inventory.' },
    ],
  },
  sla: {
    eyebrow: 'Service commitments',
    title: 'Reliability commitments start with reachable product surfaces.',
    summary: 'Service readiness covers customer-facing information, private workspace flows and CI gates for critical route regressions.',
    primaryCta: 'Check status',
    secondaryCta: 'Open trust center',
    sections: [commonSections.operations, commonSections.security, commonSections.evidence],
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Privacy information for compliance workspaces.',
    summary: 'EuroComply keeps privacy, processing and subprocessors information accessible from public routes across supported locales.',
    primaryCta: 'Data processing',
    secondaryCta: 'Subprocessors',
    sections: [commonSections.operations, commonSections.security, commonSections.evidence],
  },
  terms: {
    eyebrow: 'Terms',
    title: 'Terms and acceptable use for EuroComply workspaces.',
    summary: 'Public terms stay discoverable before signup so customer and procurement journeys do not depend on private routes.',
    primaryCta: 'View pricing',
    secondaryCta: 'Contact team',
    sections: [commonSections.operations, commonSections.security, commonSections.evidence],
  },
  dpa: {
    eyebrow: 'Data Processing Addendum',
    title: 'Data processing terms for European teams.',
    summary: 'DPA information is part of the trust surface and is kept reachable from localized public routes.',
    primaryCta: 'Privacy',
    secondaryCta: 'Subprocessors',
    sections: [commonSections.operations, commonSections.security, commonSections.evidence],
  },
  subprocessors: {
    eyebrow: 'Subprocessors',
    title: 'Subprocessor transparency for security reviews.',
    summary: 'Vendor and processor visibility is a core trust requirement for procurement and customer assurance.',
    primaryCta: 'Vendor assurance',
    secondaryCta: 'Trust center',
    sections: [commonSections.evidence, commonSections.operations, commonSections.security],
  },
  status: {
    eyebrow: 'Status',
    title: 'Operational status and readiness.',
    summary: 'Status information remains public and localizable so buyers and workspace users can find it without a dead route.',
    primaryCta: 'Trust center',
    secondaryCta: 'Contact team',
    sections: [commonSections.operations, commonSections.security, commonSections.evidence],
  },
} satisfies Record<string, PublicInfoContent>;

export type PublicInfoPageKey = keyof typeof pageContent;

const ctaHref: Record<string, string> = {
  'Review security': '/security',
  'See pricing': '/pricing',
  'View compliance posture': '/compliance',
  'Contact team': '/contact',
  'Open trust center': '/trust',
  'Create account': '/signup',
  'Start free': '/signup',
  'View pricing': '/pricing',
  'Explore trust': '/trust',
  'Email contact': 'mailto:security@eurocomply.example',
  'Check status': '/status',
  'Data processing': '/data-processing',
  Subprocessors: '/subprocessors',
  Privacy: '/privacy',
  'Vendor assurance': '/vendor-assurance',
  'Trust center': '/trust',
};

function getHref(locale: string, label: string) {
  const href = ctaHref[label] ?? '/trust';
  if (href.startsWith('mailto:')) return href;
  return `/${locale}${href}`;
}

export function PublicInfoPage({ locale, pageKey }: { locale: string; pageKey: PublicInfoPageKey }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const content = pageContent[pageKey];

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <header className="border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${activeLocale}`} className="text-lg font-bold tracking-tight">EuroComply</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${activeLocale}/pricing`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Pricing</Link>
            <Link href={`/${activeLocale}/login`} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90">Sign in</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
            {content.eyebrow}
          </p>
          <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">{content.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{content.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={getHref(activeLocale, content.primaryCta)} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
              {content.primaryCta}
            </Link>
            <Link href={getHref(activeLocale, content.secondaryCta)} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10">
              {content.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-3">
        {content.sections.map((section) => (
          <article key={section.title} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{section.body}</p>
          </article>
        ))}
      </section>

      <PublicFooter locale={activeLocale} />
    </main>
  );
}
