import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Building2, ClipboardCheck, FileText, LockKeyhole, Scale, ShieldCheck, Users } from 'lucide-react';
import { PublicFooter } from '@/components/marketing/public-footer';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

type PageProps = { params: Promise<{ locale: string }> };
type Card = { title: string; text: string; icon: typeof ShieldCheck };

const enterpriseCards: Card[] = [
  { title: 'AI system inventory', text: 'Map AI use cases, owners, departments, providers, countries and review status in one operating record.', icon: Building2 },
  { title: 'Risk and policy workflow', text: 'Connect AI systems to risk signals, policy requirements, owners, decisions and follow-up actions.', icon: Scale },
  { title: 'Evidence preparation', text: 'Prepare buyer-ready summaries, evidence packs and audit records without claiming legal guarantees.', icon: ClipboardCheck },
  { title: 'Procurement support', text: 'Use Trust Center materials, security questionnaire answers and procurement packet checklists during enterprise review.', icon: FileText },
];

const buyerTriggers = [
  'A customer security review is asking how AI is governed.',
  'The board wants visibility into AI risk and accountability.',
  'Legal or compliance needs a living inventory instead of a static memo.',
  'Procurement needs DPA, subprocessor and security answers before rollout.',
  'Multiple departments are using AI without a shared operating model.',
];

const enterprisePackage = [
  'Multi-team AI inventory and ownership model',
  'Risk classification and evidence status',
  'Policy and document workflow',
  'Buyer-ready AI governance summaries',
  'Security questionnaire support',
  'Procurement packet checklist',
  'Assisted onboarding and rollout planning',
  'Contractual terms by agreement',
];

function resolveLocale(value: string) {
  return (locales.includes(value as Locale) ? value : defaultLocale) as Locale;
}

export default async function EnterprisePage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = resolveLocale(requestedLocale);

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <header className="border-b border-slate-800/80 bg-[#08101c]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${locale}`} aria-label="RISCK COMPLY home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={170} height={36} priority className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${locale}/pricing`} className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Pricing</Link>
            <Link href={`/${locale}/trust`} className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Trust Center</Link>
            <Link href={`/${locale}/book-demo?plan=enterprise`} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Book demo</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-28">
        <div>
          <p className="inline-flex rounded-lg border border-blue-400/25 bg-blue-500/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">Enterprise AI governance readiness</p>
          <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.06em] md:text-7xl">Enterprise AI governance without spreadsheet chaos.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">RISCK COMPLY helps European organizations map AI systems, classify risk, assign owners, manage policy evidence and prepare procurement-ready answers — without unsupported legal or certification claims.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/book-demo?plan=enterprise`} className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Book Enterprise Readiness Demo</Link>
            <Link href={`/${locale}/security-questionnaire`} className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-bold transition hover:border-blue-400/35 hover:bg-blue-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Review Security Questionnaire</Link>
          </div>
        </div>

        <aside className="rounded-xl border border-blue-400/15 bg-blue-500/[0.055] p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-300" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200/70">Built for serious review</p>
          </div>
          <p className="mt-5 text-2xl font-semibold leading-tight">Not fake badges. Not invented certifications. Not “AI Act compliant in one click”.</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">The enterprise motion is designed around precise buyer evidence: systems, owners, risk, controls, policies, evidence, security answers and review history.</p>
        </aside>
      </section>

      <section className="border-y border-slate-800/80 bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-300/65">When enterprise buyers care</p>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {buyerTriggers.map((trigger) => (
              <div key={trigger} className="rounded-lg border border-slate-800/80 bg-[#0d1522] p-4 text-sm leading-6 text-slate-300">
                {trigger}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
        {enterpriseCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
              <Icon className="h-6 w-6 text-blue-300" />
              <h2 className="mt-5 text-xl font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-20 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-8">
          <Users className="h-8 w-8 text-blue-300" />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight">Enterprise package</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">Use this for regulated teams, larger B2B vendors and companies with procurement or security review requirements.</p>
          <Link href={`/${locale}/book-demo?plan=enterprise`} className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            Talk to Sales <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {enterprisePackage.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-800/80 bg-[#0d1522] p-4 text-sm leading-6 text-slate-300">
              <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-blue-300" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-800/80 px-6 py-16">
        <div className="mx-auto max-w-7xl rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/80">Safe promise</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em]">Know where AI is used, who owns it, what risk it carries, what policies apply and what evidence exists.</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">RISCK COMPLY supports operational readiness and audit preparation. It is not legal advice, does not replace legal counsel and does not guarantee regulatory compliance.</p>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
