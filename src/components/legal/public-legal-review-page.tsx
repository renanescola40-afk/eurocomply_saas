import Link from 'next/link';

import { AnalyticsConsentControls } from '@/components/analytics/AnalyticsConsentControls';
import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type PublicLegalReviewPageProps = {
  locale: string;
  eyebrow: string;
  title: string;
  summary: string;
  documentId: string;
  version: string;
  lastUpdated: string;
  sections: LegalSection[];
  actions?: React.ReactNode;
};

const copy: Record<Locale, { home: string; status: string; statusValue: string; version: string; updated: string; effective: string; effectiveValue: string; notice: string }> = {
  en: { home: 'RISCK COMPLY', status: 'Publication status', statusValue: 'REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED', version: 'Version', updated: 'Last updated', effective: 'Effective date', effectiveValue: 'Pending qualified legal approval', notice: 'This public review draft is a technical disclosure surface. It is not a signed agreement or qualified legal opinion.' },
  pt: { home: 'RISCK COMPLY', status: 'Estado de publicação', statusValue: 'REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED', version: 'Versão', updated: 'Última atualização', effective: 'Data de vigência', effectiveValue: 'Pendente de aprovação jurídica qualificada', notice: 'Este rascunho público é uma superfície técnica de divulgação. Não é um acordo assinado nem uma opinião jurídica qualificada.' },
  es: { home: 'RISCK COMPLY', status: 'Estado de publicación', statusValue: 'REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED', version: 'Versión', updated: 'Última actualización', effective: 'Fecha de vigencia', effectiveValue: 'Pendiente de aprobación jurídica cualificada', notice: 'Este borrador público es una superficie técnica de divulgación. No es un acuerdo firmado ni una opinión jurídica cualificada.' },
  fr: { home: 'RISCK COMPLY', status: 'Statut de publication', statusValue: 'REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED', version: 'Version', updated: 'Dernière mise à jour', effective: "Date d’entrée en vigueur", effectiveValue: 'En attente de validation juridique qualifiée', notice: 'Ce projet public est une surface de divulgation technique. Il ne constitue ni un accord signé ni un avis juridique qualifié.' },
  it: { home: 'RISCK COMPLY', status: 'Stato di pubblicazione', statusValue: 'REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED', version: 'Versione', updated: 'Ultimo aggiornamento', effective: 'Data di efficacia', effectiveValue: 'In attesa di approvazione legale qualificata', notice: 'Questa bozza pubblica è una superficie tecnica di divulgazione. Non è un accordo firmato né un parere legale qualificato.' },
  de: { home: 'RISCK COMPLY', status: 'Veröffentlichungsstatus', statusValue: 'REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED', version: 'Version', updated: 'Zuletzt aktualisiert', effective: 'Gültig ab', effectiveValue: 'Ausstehende qualifizierte rechtliche Freigabe', notice: 'Dieser öffentliche Entwurf ist eine technische Offenlegungsfläche. Er ist weder eine unterzeichnete Vereinbarung noch eine qualifizierte Rechtsberatung.' },
};

export function PublicLegalReviewPage({ locale: rawLocale, eyebrow, title, summary, documentId, version, lastUpdated, sections, actions }: PublicLegalReviewPageProps) {
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const labels = copy[locale];

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <Link href={`/${locale}`} className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/75 hover:text-cyan-100">
          {labels.home}
        </Link>

        <header className="mt-10 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">{eyebrow}</p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
          <p className="max-w-3xl text-lg leading-8 text-white/65">{summary}</p>
        </header>

        <section className="mt-10 grid gap-3 rounded-3xl border border-amber-300/20 bg-amber-200/[0.06] p-6 text-sm text-white/70 sm:grid-cols-2">
          <p><span className="font-semibold text-white">document_id:</span> {documentId}</p>
          <p><span className="font-semibold text-white">{labels.version}:</span> {version}</p>
          <p><span className="font-semibold text-white">{labels.updated}:</span> {lastUpdated}</p>
          <p><span className="font-semibold text-white">{labels.effective}:</span> {labels.effectiveValue}</p>
          <p className="sm:col-span-2"><span className="font-semibold text-white">{labels.status}:</span> {labels.statusValue}</p>
          <p className="sm:col-span-2 leading-6 text-amber-100/75">{labels.notice}</p>
        </section>

        {documentId === 'cookie-policy' ? <AnalyticsConsentControls locale={locale} /> : actions}

        <div className="mt-10 space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-7 text-white/65">{paragraph}</p>
              ))}
              {section.items && (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-white/65">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
      <PublicFooter locale={locale} />
    </main>
  );
}
