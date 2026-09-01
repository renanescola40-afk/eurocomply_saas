import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { getSecurityQuestionnairePack } from '@/lib/trust/security-questionnaire';
import { isSupportedLocale } from '@/lib/i18n/locales';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  en: {
    eyebrow: 'Enterprise security questionnaire',
    title: 'Evidence-bound answers for buyer security and procurement review.',
    subtitle: 'A public, reusable answer set covering access control, data protection, operations, compliance and suppliers without exposing tenant data or making unsupported claims.',
    status: { implemented: 'Implemented', 'configuration-bound': 'Configuration-bound', 'evidence-required': 'Evidence required', 'not-claimed': 'Not claimed' },
    api: 'Open machine-readable JSON',
    pack: 'Open procurement pack',
  },
  pt: {
    eyebrow: 'Questionário de segurança enterprise',
    title: 'Respostas baseadas em evidências para revisão de segurança e procurement.',
    subtitle: 'Um conjunto público e reutilizável sobre controlo de acesso, proteção de dados, operações, compliance e fornecedores, sem expor dados de clientes nem fazer promessas não suportadas.',
    status: { implemented: 'Implementado', 'configuration-bound': 'Dependente de configuração', 'evidence-required': 'Evidência necessária', 'not-claimed': 'Não reivindicado' },
    api: 'Abrir JSON legível por máquina',
    pack: 'Abrir pack de procurement',
  },
} as const;

function statusClass(status: string) {
  if (status === 'implemented') return 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100';
  if (status === 'configuration-bound') return 'border-blue-400/20 bg-blue-500/[0.08] text-blue-200';
  if (status === 'evidence-required') return 'border-amber-300/25 bg-amber-300/[0.08] text-amber-100';
  return 'border-slate-600/50 bg-slate-700/20 text-slate-300';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const active = locale === 'pt' ? copy.pt : copy.en;
  return makePublicMetadata({ locale, path: '/trust/security-questionnaire', title: `${active.eyebrow} - RISCK COMPLY`, description: active.subtitle });
}

export default async function SecurityQuestionnairePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  if (!isSupportedLocale(rawLocale)) notFound();

  const locale = rawLocale;
  const active = locale === 'pt' ? copy.pt : copy.en;
  const pack = getSecurityQuestionnairePack();

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <section className="border-b border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}/trust`} aria-label="RISCK COMPLY Trust Center" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={178} height={32} priority />
          </Link>
          <div className="mt-10 inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-500/[0.08] px-4 py-2 text-sm text-blue-100"><ShieldCheck className="h-4 w-4" /> {active.eyebrow}</div>
          <h1 className="mt-6 max-w-5xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{active.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{active.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {/* The JSON pack is a document endpoint, so use a normal HTTP navigation instead of client-side routing. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/trust/security-questionnaire" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{active.api}</a>
            <Link href={`/${locale}/trust/procurement-pack`} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{active.pack}</Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          {pack.answers.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/65"><span>{item.id}</span><span>{item.category}</span></div>
                  <h2 className="mt-3 text-xl font-semibold">{item.question}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/58">{item.answer}</p>
                  {item.caveat ? <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-xs leading-6 text-amber-50/75">{item.caveat}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.evidence.map((href) => <Link key={href} href={`/${locale}${href}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-white/55 transition hover:border-blue-400/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><FileCheck2 className="h-3.5 w-3.5" /> {href}</Link>)}
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${statusClass(item.status)}`}><CheckCircle2 className="h-3.5 w-3.5" /> {active.status[item.status]}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}
