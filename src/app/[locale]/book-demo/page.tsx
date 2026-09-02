import Image from 'next/image';
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
  ['Map your AI footprint', 'Identify where AI is used, which teams own it, which vendors are involved and which countries are in scope.', Building2],
  ['Prioritize readiness gaps', 'Separate inventory, risk, policy, evidence and procurement gaps so the first workflow is obvious.', ShieldCheck],
  ['Estimate operational ROI', 'Use manual hours, owner chasing and review preparation to quantify practical value without overclaiming.', CalendarDays],
  ['Prepare buyer answers', 'Align AI governance, data, security, onboarding, support and pricing questions before procurement review.', FileText],
];

const agenda = [
  '3 min — trigger: buyer review, board request, audit prep or AI policy rollout',
  '7 min — current AI workflow and evidence mapping',
  '12 min — RISCK COMPLY walkthrough: inventory, risk, policies and evidence',
  '5 min — commercial fit: self-service checkout, Business-assisted motion or Enterprise review',
  '3 min — next step and procurement blockers',
];

function resolveLocale(value: string) {
  return (locales.includes(value as Locale) ? value : defaultLocale) as Locale;
}

export default async function BookDemoPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = resolveLocale(requestedLocale);

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-20 sm:px-6 lg:grid-cols-[.95fr_1.05fr] lg:px-8 lg:pt-24">
        <div>
          <Link href={`/${locale}`} aria-label="RISCK COMPLY home" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={178} height={32} priority />
          </Link>
          <div className="mt-8 inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-500/[0.07] px-4 py-2 text-sm font-medium text-blue-100">
            <Users className="h-4 w-4" /> Enterprise readiness mapping
          </div>
          <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-white sm:text-6xl">
            Book a demo for AI inventory, risk, policy and evidence readiness.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">
            In 30 minutes, we map your current AI governance workflow and show how RISCK COMPLY can centralize AI systems, owners, risk, policies, evidence and procurement answers.
          </p>

          <div className="mt-8 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800/80 bg-[#0d1522]">
            {agenda.map((item) => (
              <div key={item} className="flex items-start gap-3 px-4 py-3 text-sm leading-6 text-white/62">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-slate-800/80 bg-[#0d1522] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300/65">Bring to the demo</p>
            <p className="mt-3 text-sm leading-7 text-white/55">
              A current AI tools list, risk spreadsheet, policy draft, vendor list, customer security questions or board/audit request. Messy materials are useful because the goal is to map the real operating workflow.
            </p>
          </div>
        </div>

        <BookDemoForm locale={locale} />
      </section>

      <section className="border-y border-slate-800/80 bg-white/[0.02] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-300/65">What you get</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {outcomes.map(([title, text, Icon]) => (
              <article key={title} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-5">
                <Icon className="h-5 w-5 text-blue-300" aria-hidden="true" />
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
