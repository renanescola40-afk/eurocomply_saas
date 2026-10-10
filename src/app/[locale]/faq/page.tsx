import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CircleHelp, LockKeyhole, ReceiptText } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

const faqs = [
  {
    group: 'Product',
    icon: CircleHelp,
    items: [
      ['What does RISCK COMPLY manage?', 'RISCK COMPLY centralizes compliance tasks, documents, vendors, risks, templates, audit logs, team access and executive reporting.'],
      ['Is RISCK COMPLY advisory software?', 'RISCK COMPLY is compliance operations software. Professional interpretation should be reviewed by qualified advisors.'],
      ['Can we generate reports for leadership?', 'Yes. The product includes executive reports, printable reports and CSV exports for operational review.'],
    ],
  },
  {
    group: 'Security and data',
    icon: LockKeyhole,
    items: [
      ['Is the product multi-tenant?', 'Yes. Organizations are isolated by organization_id and protected through authentication, membership checks and Supabase policies.'],
      ['How are documents handled?', 'Documents are stored in private storage with controlled upload flows and signed access patterns.'],
      ['Do you track audit events?', 'Yes. Key actions such as document creation, invitations, billing sessions and organization creation are logged.'],
    ],
  },
  {
    group: 'Billing',
    icon: ReceiptText,
    items: [
      ['How does billing work?', 'Stripe Checkout, Stripe Customer Portal and webhook-based subscription syncing are built in.'],
      ['What happens near a plan limit?', 'The billing screen shows current usage and warns when usage approaches or reaches plan limits.'],
      ['Can we upgrade later?', 'Yes. Owners and admins can start checkout for a new plan or manage billing through Stripe.'],
    ],
  },
];

type FaqPageProps = {
  params: Promise<{ locale: string }>;
};


export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);
  return makePublicMetadata({
    locale,
    path: '/faq',
    title: 'RISCK COMPLY FAQ | Product, Security and Billing',
    description: 'Answers to common questions about RISCK COMPLY product scope, security, data handling and billing workflows.',
  });
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <header className="border-b border-slate-800/80 bg-[#050913]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={`/${locale}`} aria-label="RISCK COMPLY home" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={210} height={44} priority className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/pricing`} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white sm:inline-flex">Pricing</Link>
            <Link href={`/${locale}/trust`} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white md:inline-flex">Trust Center</Link>
            <Link href={`/${locale}/book-demo`} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">Book a Demo</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-800/80 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute left-[60%] top-0 h-[30rem] w-[30rem] rounded-full bg-blue-600/[0.08] blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">QUESTIONS BEFORE ADOPTION</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Clear answers for teams evaluating RISCK COMPLY.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400">
            A practical overview for founders, compliance leaders, security teams and operators reviewing product scope, data handling and commercial workflows.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={`/${locale}/book-demo`} className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500">
              Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={`/${locale}/trust`} className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-700 px-5 text-sm font-semibold text-slate-200 hover:border-blue-400/40 hover:text-white">
              Review Trust Center
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24" aria-label="Frequently asked questions">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {faqs.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.group} className="rounded-2xl border border-slate-800 bg-[#0b1422] p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">{group.group}</h2>
                  <Icon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="mt-7 divide-y divide-slate-800">
                  {group.items.map(([question, answer]) => (
                    <details key={question} className="group py-5">
                      <summary className="cursor-pointer list-none pr-6 text-sm font-semibold leading-6 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300 [&::-webkit-details-marker]:hidden">
                        {question}
                        <span aria-hidden="true" className="float-right text-blue-400 transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{answer}</p>
                    </details>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-800/80 bg-[#080d16] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">NEED A SPECIFIC ANSWER?</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Bring your real governance workflow to the conversation.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">Use a demo to review product fit, operating constraints and the evidence your team needs to manage.</p>
          </div>
          <Link href={`/${locale}/book-demo`} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-slate-200">
            Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
