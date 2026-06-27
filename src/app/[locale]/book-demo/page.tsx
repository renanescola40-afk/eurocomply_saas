import Link from 'next/link';
import { ArrowRight, Building2, CalendarDays, FileText, ShieldCheck, Users } from 'lucide-react';
import { BookDemoForm } from '@/components/marketing/book-demo-form';
import { PublicFooter } from '@/components/marketing/public-footer';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

type PageProps = {
  params: Promise<{ locale: string }>;
};

type Outcome = [string, string, typeof Building2];

const outcomes: Outcome[] = [
  ['Map your current process', 'We identify where risks, documents, vendors and audit evidence live today.', Building2],
  ['Choose the first workflow', 'Start with the highest-value use case: risk, documents, vendors or audit readiness.', ShieldCheck],
  ['Estimate ROI', 'Use manual hours, owner chasing and review preparation to calculate practical value.', CalendarDays],
  ['Prepare enterprise answers', 'Align GDPR, data, security, onboarding, support and pricing questions before procurement.', FileText],
];

const agenda = [
  '5 min — current process and business trigger',
  '10 min — RISCK COMPLY walkthrough',
  '10 min — map your first workflow',
  '5 min — pricing, onboarding and next step',
];

function resolveLocale(value: string) {
  return (locales.includes(value as Locale) ? value : defaultLocale) as Locale;
}

export default async function BookDemoPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = resolveLocale(requestedLocale);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,.22),transparent_30rem),radial-gradient(circle_at_80%_20%,rgba(16,185,129,.1),transparent_28rem),linear-gradient(180deg,#050505_0%,#080b12_52%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-24 sm:px-6 lg:grid-cols-[.95fr_1.05fr] lg:px-8 lg:pt-32">
        <div>
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition hover:text-white">
            ← Back to RISCK COMPLY
          </Link>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/76">
            <Users className="h-4 w-4" /> Enterprise discovery
          </div>
          <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.065em] text-white sm:text-6xl">
            Book a demo for risks, documents, vendors and audit readiness.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">
            In 30 minutes, we map your current spreadsheet/manual process and show how RISCK COMPLY can centralize compliance ownership, evidence and review workflows.
          </p>

          <div className="mt-8 grid gap-3">
            {agenda.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/62">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/35">Bring to the demo</p>
            <p className="mt-3 text-sm leading-7 text-white/55">
              A current risk spreadsheet, vendor list, top compliance documents or recent customer/audit questions. Even messy materials are useful because the goal is to map the real workflow.
            </p>
          </div>
        </div>

        <BookDemoForm locale={locale} />
      </section>

      <section className="relative z-10 border-y border-white/10 bg-white/[0.02] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/35">What you get</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {outcomes.map(([title, text, Icon]) => (
              <article key={title} className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                <Icon className="h-5 w-5 text-white" />
                <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/50">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
