import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Building2, CalendarDays, CheckCircle2, ExternalLink, FileText, ShieldCheck, UserRound } from 'lucide-react';

import { canAccessFeature } from '@/lib/billing/feature-gates';
import { locales, type Locale } from '@/lib/i18n/routing';
import { listActiveOrganizationAddOns } from '@/server/billing/addons';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getPublishedIntelligenceItem, type IntelligenceImpact } from '@/server/queries/intelligence';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { normalizePlan } from '@/server/queries/subscription';

type DetailCopy = {
  back: string;
  impact: string;
  by: string;
  source: string;
  date: string;
  reliability: string;
  verifiedSource: string;
  lockedTitle: string;
  lockedBody: string;
  reviewAccess: string;
  analysis: string;
  editorialNote: string;
  affected: string;
  calendar: string;
  addCalendar: string;
  actions: string;
  provenance: string;
  jurisdiction: string;
  editor: string;
  published: string;
  rights: string;
};

const detailCopy: Record<Locale, DetailCopy> = {
  en: { back: 'Back to Regulatory Intelligence', impact: 'Impact', by: 'By', source: 'Source', date: 'Date', reliability: 'Reliability', verifiedSource: 'Open original source', lockedTitle: 'Premium intelligence preview', lockedBody: 'Activate an eligible plan or Regulatory Monitoring Pro entitlement to access the complete RISCK COMPLY analysis, recommended actions and calendar workflow.', reviewAccess: 'Review access options', analysis: 'RISCK COMPLY analysis', editorialNote: 'Editorial note: this entry keeps a dated, verifiable reference to the original source and adds RISCK COMPLY analysis. It does not replace legal advice.', affected: 'Potentially affected organizations', calendar: 'Smart calendar', addCalendar: 'Add to calendar', actions: 'Recommended actions', provenance: 'Source & editorial provenance', jurisdiction: 'Jurisdiction', editor: 'Editor/persona', published: 'Published', rights: 'Content-rights mode' },
  pt: { back: 'Voltar à Inteligência Regulatória', impact: 'Impacto', by: 'Por', source: 'Fonte', date: 'Data', reliability: 'Confiabilidade', verifiedSource: 'Abrir fonte original', lockedTitle: 'Inteligência premium em preview', lockedBody: 'Ative um plano elegível ou o entitlement Regulatory Monitoring Pro para acessar a análise completa da RISCK COMPLY, ações recomendadas e fluxo de calendário.', reviewAccess: 'Rever opções de acesso', analysis: 'Análise RISCK COMPLY', editorialNote: 'Nota editorial: esta atualização mantém referência datada e verificável à fonte original e adiciona análise própria da RISCK COMPLY. Não substitui aconselhamento jurídico.', affected: 'Organizações potencialmente afetadas', calendar: 'Calendário inteligente', addCalendar: 'Adicionar ao calendário', actions: 'Ações recomendadas', provenance: 'Fonte e proveniência editorial', jurisdiction: 'Jurisdição', editor: 'Editor/persona', published: 'Publicado', rights: 'Modo de direitos de conteúdo' },
  es: { back: 'Volver a Inteligencia Regulatoria', impact: 'Impacto', by: 'Por', source: 'Fuente', date: 'Fecha', reliability: 'Fiabilidad', verifiedSource: 'Abrir fuente original', lockedTitle: 'Inteligencia premium en vista previa', lockedBody: 'Active un plan elegible o el entitlement Regulatory Monitoring Pro para acceder al análisis completo, acciones recomendadas y flujo de calendario.', reviewAccess: 'Revisar opciones de acceso', analysis: 'Análisis RISCK COMPLY', editorialNote: 'Nota editorial: esta actualización conserva una referencia fechada y verificable a la fuente original y añade análisis propio de RISCK COMPLY. No sustituye asesoramiento jurídico.', affected: 'Organizaciones potencialmente afectadas', calendar: 'Calendario inteligente', addCalendar: 'Añadir al calendario', actions: 'Acciones recomendadas', provenance: 'Fuente y procedencia editorial', jurisdiction: 'Jurisdicción', editor: 'Editor/persona', published: 'Publicado', rights: 'Modo de derechos de contenido' },
  fr: { back: 'Retour à la veille réglementaire', impact: 'Impact', by: 'Par', source: 'Source', date: 'Date', reliability: 'Fiabilité', verifiedSource: 'Ouvrir la source originale', lockedTitle: 'Veille premium en aperçu', lockedBody: 'Activez un plan éligible ou l’entitlement Regulatory Monitoring Pro pour accéder à l’analyse complète, aux actions recommandées et au flux calendrier.', reviewAccess: 'Voir les options d’accès', analysis: 'Analyse RISCK COMPLY', editorialNote: 'Note éditoriale : cette mise à jour conserve une référence datée et vérifiable à la source originale et ajoute l’analyse RISCK COMPLY. Elle ne remplace pas un conseil juridique.', affected: 'Organisations potentiellement concernées', calendar: 'Calendrier intelligent', addCalendar: 'Ajouter au calendrier', actions: 'Actions recommandées', provenance: 'Source et provenance éditoriale', jurisdiction: 'Juridiction', editor: 'Éditeur/persona', published: 'Publié', rights: 'Mode des droits de contenu' },
  it: { back: 'Torna alla Regulatory Intelligence', impact: 'Impatto', by: 'Di', source: 'Fonte', date: 'Data', reliability: 'Affidabilità', verifiedSource: 'Apri fonte originale', lockedTitle: 'Intelligence premium in anteprima', lockedBody: 'Attiva un piano idoneo o l’entitlement Regulatory Monitoring Pro per accedere all’analisi completa, alle azioni consigliate e al flusso calendario.', reviewAccess: 'Rivedi opzioni di accesso', analysis: 'Analisi RISCK COMPLY', editorialNote: 'Nota editoriale: questo aggiornamento mantiene un riferimento datato e verificabile alla fonte originale e aggiunge analisi RISCK COMPLY. Non sostituisce consulenza legale.', affected: 'Organizzazioni potenzialmente interessate', calendar: 'Calendario intelligente', addCalendar: 'Aggiungi al calendario', actions: 'Azioni consigliate', provenance: 'Fonte e provenienza editoriale', jurisdiction: 'Giurisdizione', editor: 'Editor/persona', published: 'Pubblicato', rights: 'Modalità diritti contenuto' },
  de: { back: 'Zurück zur Regulatory Intelligence', impact: 'Einfluss', by: 'Von', source: 'Quelle', date: 'Datum', reliability: 'Zuverlässigkeit', verifiedSource: 'Originalquelle öffnen', lockedTitle: 'Premium Intelligence Vorschau', lockedBody: 'Aktivieren Sie einen berechtigten Plan oder das Regulatory Monitoring Pro Entitlement für vollständige Analyse, empfohlene Maßnahmen und Kalender-Workflow.', reviewAccess: 'Zugriffsoptionen prüfen', analysis: 'RISCK COMPLY Analyse', editorialNote: 'Redaktioneller Hinweis: Dieses Update behält eine datierte, verifizierbare Referenz zur Originalquelle und ergänzt RISCK COMPLY Analyse. Es ersetzt keine Rechtsberatung.', affected: 'Potenziell betroffene Organisationen', calendar: 'Intelligenter Kalender', addCalendar: 'Zum Kalender hinzufügen', actions: 'Empfohlene Maßnahmen', provenance: 'Quelle & redaktionelle Herkunft', jurisdiction: 'Jurisdiktion', editor: 'Editor/Persona', published: 'Veröffentlicht', rights: 'Content-Rechte-Modus' },
};

function getCopy(locale: string) {
  return detailCopy[locales.includes(locale as Locale) ? (locale as Locale) : 'en'];
}

function getImpactTone(impact: IntelligenceImpact) {
  if (impact === 'Crítico') return 'border-rose-300/20 bg-rose-300/[0.07] text-rose-100';
  if (impact === 'Alto') return 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100';
  if (impact === 'Médio') return 'border-amber-200/15 bg-amber-200/[0.045] text-amber-100/80';
  return 'border-white/[0.075] bg-white/[0.025] text-white/48';
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date));
}

function buildCalendarSuggestionHref(locale: string, item: { title: string; jurisdiction: string; executiveSummary: string }) {
  const params = new URLSearchParams({ source: 'intelligence', title: item.title, country: item.jurisdiction, description: item.executiveSummary });
  return `/${locale}/calendario-compliance?${params.toString()}`;
}

const secondaryLink = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.085] bg-white/[0.025] px-3 text-xs font-semibold text-white/62 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60';

type PageProps = { params: Promise<{ locale: string; id: string }> };

export default async function IntelligenceDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const copy = getCopy(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const [organization, item] = await Promise.all([
    getCurrentOrganizationForUser(user.id),
    getPublishedIntelligenceItem(id),
  ]);
  if (!item) notFound();
  if (!organization?.id) redirect(`/${locale}/onboarding`);

  const [entitlements, activeAddOns] = await Promise.all([
    getOrganizationEntitlements(organization.id),
    listActiveOrganizationAddOns(organization.id),
  ]);
  const canUsePremiumNews = canAccessFeature('regulatory_monitoring', {
    plan: normalizePlan(entitlements.plan),
    activeAddOns,
  });
  const locked = item.premium && !canUsePremiumNews;

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-5">
        <header className="border-b border-white/[0.065] pb-5">
          <Link href={`/${locale}/dashboard/organizations/reports-governance/news`} className="text-xs font-medium text-white/42 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">← {copy.back}</Link>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em]">
            <span className="rounded-lg border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-white/42">{item.persona.desk}</span>
            <span className="rounded-lg border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-white/42">{item.category}</span>
            <span className="rounded-lg border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-white/42">{item.jurisdiction}</span>
            <span className={`rounded-lg border px-2.5 py-1 ${getImpactTone(item.impact)}`}>{copy.impact}: {item.impact}</span>
            {item.premium ? <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-emerald-100">Premium</span> : null}
          </div>
          <h1 className="mt-4 max-w-5xl text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">{item.title}</h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-white/48">{item.newspaperDeck}</p>
        </header>

        <section className="grid overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-sm sm:grid-cols-2" aria-label={copy.provenance}>
          <p className="flex items-center gap-2 border-b border-white/[0.055] px-5 py-4 text-white/45 sm:border-r"><UserRound className="h-4 w-4 text-emerald-200/60" aria-hidden="true" /> {copy.by} {item.persona.name}, {item.persona.desk}</p>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 border-b border-white/[0.055] px-5 py-4 font-medium text-white/58 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/60"><ExternalLink className="h-4 w-4 shrink-0 text-emerald-200/60" aria-hidden="true" /><span className="truncate">{copy.source}: {item.referenceLabel}</span><span className="sr-only"> — {copy.verifiedSource}</span></a>
          <p className="flex items-center gap-2 px-5 py-4 text-white/45 sm:border-r"><CalendarDays className="h-4 w-4 text-emerald-200/60" aria-hidden="true" /> {copy.date}: {formatDate(item.publishedAt, locale)}</p>
          <p className="flex items-center gap-2 px-5 py-4 text-white/45"><ShieldCheck className="h-4 w-4 text-emerald-200/60" aria-hidden="true" /> {copy.reliability}: {item.reliability}</p>
        </section>

        {locked ? (
          <section className="rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-5 py-5 text-amber-100" aria-labelledby="premium-preview-title">
            <h2 id="premium-preview-title" className="text-sm font-semibold">{copy.lockedTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-100/70">{copy.lockedBody}</p>
            <Link href={`/${locale}/dashboard/organizations/add-ons?addon=regulatory-monitoring-pro`} className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-300 px-3 text-xs font-semibold text-[#06100d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{copy.reviewAccess}</Link>
          </section>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
              <div className="border-b border-white/[0.055] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-200/60">RISCK COMPLY Intelligence</p><p className="mt-1 text-xs text-white/34">{item.persona.tagline}</p></div>
              <div className="space-y-5 px-5 py-5 text-sm leading-7 text-white/64 md:px-6">{item.articleParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            </article>

            <div className="space-y-4">
              <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
                <div className="border-b border-white/[0.055] px-5 py-4"><h2 className="text-sm font-semibold text-white/88">{copy.analysis}</h2></div>
                <p className="px-5 py-4 text-sm leading-6 text-white/58">{item.risckComplyAnalysis}</p>
                <p className="border-t border-white/[0.055] px-5 py-3 text-xs leading-5 text-white/34">{copy.editorialNote}</p>
              </section>

              <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
                <div className="border-b border-white/[0.055] px-5 py-4"><h2 className="text-sm font-semibold text-white/88">{copy.calendar}</h2></div>
                <p className="px-5 pt-4 text-sm leading-6 text-white/52">{item.calendarSuggestion}</p>
                <div className="px-5 pb-5 pt-3"><Link href={buildCalendarSuggestionHref(locale, item)} className={secondaryLink}>{copy.addCalendar}</Link></div>
              </section>

              <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
                <div className="border-b border-white/[0.055] px-5 py-4"><h2 className="text-sm font-semibold text-white/88">{copy.affected}</h2></div>
                <div className="flex flex-wrap gap-2 p-5">{item.affectedCompanies.map((company) => <span key={company} className="rounded-lg border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-xs text-white/42">{company}</span>)}</div>
              </section>
            </div>

            <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] xl:col-span-2">
              <div className="border-b border-white/[0.055] px-5 py-4"><h2 className="text-sm font-semibold text-white/88">{copy.actions}</h2></div>
              <ul className="divide-y divide-white/[0.055]">{item.recommendedActions.map((action) => <li key={action} className="flex gap-3 px-5 py-4 text-sm leading-6 text-white/52"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200/65" aria-hidden="true" /> {action}</li>)}</ul>
            </section>

            <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] xl:col-span-2">
              <div className="border-b border-white/[0.055] px-5 py-4"><h2 className="text-sm font-semibold text-white/88">{copy.provenance}</h2></div>
              <div className="grid text-sm text-white/45 md:grid-cols-2">
                <p className="flex items-center gap-2 border-b border-white/[0.055] px-5 py-4 md:border-r"><Building2 className="h-4 w-4" aria-hidden="true" /> {copy.jurisdiction}: {item.jurisdiction}</p>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-b border-white/[0.055] px-5 py-4 font-medium text-white/58 transition hover:text-white"><ExternalLink className="h-4 w-4" aria-hidden="true" /> {copy.source}: {item.referenceLabel}</a>
                <p className="flex items-center gap-2 border-b border-white/[0.055] px-5 py-4 md:border-b-0 md:border-r"><UserRound className="h-4 w-4" aria-hidden="true" /> {copy.editor}: {item.persona.name}</p>
                <p className="flex items-center gap-2 border-b border-white/[0.055] px-5 py-4 md:border-b-0"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {copy.published}: {formatDate(item.publishedAt, locale)}</p>
                <p className="flex items-center gap-2 border-t border-white/[0.055] px-5 py-4 md:col-span-2"><FileText className="h-4 w-4" aria-hidden="true" /> {copy.rights}: {item.contentRights}</p>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
