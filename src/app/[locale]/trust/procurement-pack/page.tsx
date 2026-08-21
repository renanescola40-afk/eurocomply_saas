import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, Download, FileCheck2, ShieldCheck } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';
import { procurementControls, procurementDocuments, procurementProviders, PROCUREMENT_PACK_VERSION } from '@/lib/trust/procurement-pack';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: string }> };

const COPY: Record<SupportedLocale, { eyebrow: string; title: string; subtitle: string; download: string; controls: string; providers: string; documents: string; disclosure: string; back: string }> = {
  en: { eyebrow: 'Enterprise procurement pack', title: 'One evidence-bound package for security, privacy and procurement review.', subtitle: 'Review the current control posture, provider boundaries, public trust documents and explicit non-claims before commercial due diligence.', download: 'Open JSON procurement pack', controls: 'Control posture', providers: 'Provider boundary', documents: 'Trust documents', disclosure: 'Informational only. Contractual commitments are governed by the signed customer agreement, DPA and order form.', back: 'Open Trust Center' },
  pt: { eyebrow: 'Pack de procurement enterprise', title: 'Um pacote baseado em evidências para revisão de segurança, privacidade e procurement.', subtitle: 'Consulte a postura atual de controlos, limites dos fornecedores, documentos públicos de confiança e não-afirmações explícitas antes da due diligence comercial.', download: 'Abrir pack de procurement em JSON', controls: 'Postura de controlos', providers: 'Limites dos fornecedores', documents: 'Documentos de confiança', disclosure: 'Conteúdo informativo. Os compromissos contratuais são definidos pelo contrato, DPA e order form assinados.', back: 'Abrir Centro de Confiança' },
  es: { eyebrow: 'Pack de procurement enterprise', title: 'Un paquete basado en evidencias para revisión de seguridad, privacidad y procurement.', subtitle: 'Revise controles, proveedores, documentos públicos y no-afirmaciones antes de la due diligence comercial.', download: 'Abrir pack JSON', controls: 'Postura de controles', providers: 'Límite de proveedores', documents: 'Documentos de confianza', disclosure: 'Contenido informativo. Los compromisos contractuales se rigen por los acuerdos firmados.', back: 'Abrir Centro de Confianza' },
  fr: { eyebrow: 'Pack procurement enterprise', title: 'Un dossier fondé sur les preuves pour les revues sécurité, confidentialité et procurement.', subtitle: 'Consultez les contrôles, fournisseurs, documents publics et non-revendications avant la due diligence.', download: 'Ouvrir le pack JSON', controls: 'Posture des contrôles', providers: 'Périmètre fournisseurs', documents: 'Documents de confiance', disclosure: 'Contenu informatif. Les engagements contractuels relèvent des accords signés.', back: 'Ouvrir le Trust Center' },
  it: { eyebrow: 'Pack procurement enterprise', title: 'Un pacchetto basato su evidenze per security, privacy e procurement.', subtitle: 'Esamina controlli, provider, documenti pubblici e non-claim prima della due diligence.', download: 'Apri il pack JSON', controls: 'Postura dei controlli', providers: 'Confini dei provider', documents: 'Documenti trust', disclosure: 'Contenuto informativo. Gli impegni contrattuali sono definiti dagli accordi firmati.', back: 'Apri il Trust Center' },
  de: { eyebrow: 'Enterprise-Procurement-Paket', title: 'Ein nachweisgebundenes Paket für Sicherheits-, Datenschutz- und Procurement-Prüfungen.', subtitle: 'Prüfen Sie Kontrollen, Anbietergrenzen, öffentliche Dokumente und ausdrückliche Nicht-Claims vor der Due Diligence.', download: 'JSON-Paket öffnen', controls: 'Kontrollstatus', providers: 'Anbietergrenzen', documents: 'Trust-Dokumente', disclosure: 'Nur zur Information. Vertragliche Zusagen richten sich nach den unterzeichneten Vereinbarungen.', back: 'Trust Center öffnen' },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = COPY[locale];
  return makePublicMetadata({ locale, path: '/trust/procurement-pack', title: `${copy.eyebrow} - RISCK COMPLY`, description: copy.subtitle });
}

function statusClass(status: string) {
  if (status === 'implemented') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'configured') return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
  if (status === 'evidence-required') return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-white/15 bg-white/[0.05] text-white/60';
}

export default async function ProcurementPackPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  if (!isSupportedLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const copy = COPY[locale];

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,.22),transparent_30rem),radial-gradient(circle_at_top_right,rgba(16,185,129,.12),transparent_28rem),linear-gradient(180deg,#050505_0%,#071018_100%)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}`} className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/70">RISCK COMPLY</Link>
          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-50/80"><ShieldCheck className="h-4 w-4" /> {copy.eyebrow}</div>
          <h1 className="mt-6 max-w-5xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{copy.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{copy.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {/* API responses are documents, not Next.js pages; keep a normal anchor so the browser performs a direct HTTP navigation. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/trust/procurement-pack" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"><Download className="h-4 w-4" /> {copy.download}</a>
            <Link href={`/${locale}/trust`} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]">{copy.back}<ArrowRight className="h-4 w-4" /></Link>
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-white/35">Version {PROCUREMENT_PACK_VERSION}</p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-14">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em]">{copy.controls}</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {procurementControls.map((control) => (
                <article key={control.id} className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-6">
                  <div className="flex items-start justify-between gap-4"><h3 className="text-xl font-semibold">{control.title}</h3><span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusClass(control.status)}`}>{control.status}</span></div>
                  <p className="mt-3 text-sm leading-7 text-white/55">{control.summary}</p>
                  <ul className="mt-4 space-y-2">{control.evidence.map((item) => <li key={item} className="flex gap-2 text-sm text-white/55"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" />{item}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em]">{copy.providers}</h2>
            <div className="mt-6 overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/30">{procurementProviders.map((provider) => <div key={provider.name} className="grid gap-3 border-b border-white/10 p-5 last:border-b-0 md:grid-cols-[.6fr_1.2fr_.5fr_1.2fr]"><strong>{provider.name}</strong><span className="text-sm text-white/55">{provider.purpose}</span><span className="text-sm text-cyan-100/70">{provider.status}</span><span className="text-sm text-white/45">{provider.regionDisclosure}</span></div>)}</div>
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em]">{copy.documents}</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">{procurementDocuments.map((document) => <Link key={document.path} href={`/${locale}${document.path}`} className="group flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.06]"><span className="flex items-center gap-3"><FileCheck2 className="h-5 w-5 text-cyan-100" /><strong>{document.title}</strong></span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>)}</div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl text-sm leading-7 text-white/50">{copy.disclosure}</div></section>
      <PublicFooter locale={locale} />
    </main>
  );
}
