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
    <main className="min-h-screen overflow-hidden bg-[#05060a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(37,99,235,.22),transparent_32rem),radial-gradient(circle_at_82%_18%,rgba(16,185,129,.14),transparent_30rem),linear-gradient(180deg,#05060a_0%,#080b12_52%,#05060a_100%)]" />
      <header className="relative z-10 border-b border-white/10 bg-[#05060a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">RISCK COMPLY</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${locale}/pricing`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Pricing</Link>
            <Link href={`/${locale}/trust`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Trust Center</Link>
            <Link href={`/${locale}/book-demo?plan=enterprise`} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90">Book demo</Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-28">
        <div>
          <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Enterprise AI governance readiness</p>
          <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.06em] md:text-7xl">Enterprise AI governance without spreadsheet chaos.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">RISCK COMPLY helps European organizations map AI systems, classify risk, assign owners, manage policy evidence and prepare procurement-ready answers — without unsupported legal or certification claims.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/book-demo?plan=enterprise`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">Book Enterprise Readiness Demo</Link>
            <Link href={`/${locale}/security-questionnaire`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10">Review Security Questionnaire</Link>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-100" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Built for serious review</p>
          </div>
          <p className="mt-5 text-2xl font-semibold leading-tight">Not fake badges. Not invented certifications. Not “AI Act compliant in one click”.</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">The enterprise motion is designed around precise buyer evidence: systems, owners, risk, controls, policies, evidence, security answers and review history.</p>
        </aside>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">When enterprise buyers care</p>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {buyerTriggers.map((trigger) => (
              <div key={trigger} className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-300">
                {trigger}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-4 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
        {enterpriseCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-6">
              <Icon className="h-6 w-6 text-blue-100" />
              <h2 className="mt-5 text-xl font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.text}</p>
            </article>
          );
        })}
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-6 pb-20 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <Users className="h-8 w-8 text-blue-100" />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight">Enterprise package</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">Use this for regulated teams, larger B2B vendors and companies with procurement or security review requirements.</p>
          <Link href={`/${locale}/book-demo?plan=enterprise`} className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
            Talk to Sales <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {enterprisePackage.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-300">
              <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-emerald-100" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">Safe promise</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em]">Know where AI is used, who owns it, what risk it carries, what policies apply and what evidence exists.</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">RISCK COMPLY supports operational readiness and audit preparation. It is not legal advice, does not replace legal counsel and does not guarantee regulatory compliance.</p>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
