import type { Metadata } from 'next';
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
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,.22),transparent_30rem),linear-gradient(180deg,#050505_0%,#071018_100%)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}/trust`} className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/70">RISCK COMPLY</Link>
          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-50/80"><ShieldCheck className="h-4 w-4" /> {active.eyebrow}</div>
          <h1 className="mt-6 max-w-5xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{active.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{active.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {/* The JSON pack is a document endpoint, so use a normal HTTP navigation instead of client-side routing. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/trust/security-questionnaire" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black">{active.api}</a>
            <Link href={`/${locale}/trust/procurement-pack`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white">{active.pack}</Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          {pack.answers.map((item) => (
            <article key={item.id} className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60"><span>{item.id}</span><span>{item.category}</span></div>
                  <h2 className="mt-3 text-xl font-semibold">{item.question}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/58">{item.answer}</p>
                  {item.caveat ? <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-xs leading-6 text-amber-50/75">{item.caveat}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.evidence.map((href) => <Link key={href} href={`/${locale}${href}`} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55"><FileCheck2 className="h-3.5 w-3.5" /> {href}</Link>)}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-300/[0.06] px-3 py-2 text-xs font-semibold text-emerald-50/80"><CheckCircle2 className="h-3.5 w-3.5" /> {active.status[item.status]}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}
