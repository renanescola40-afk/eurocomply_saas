import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Building2, CalendarDays, CheckCircle2, ExternalLink, FileText, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

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
  if (impact === 'Crítico') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (impact === 'Alto') return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-200';
  if (impact === 'Médio') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date));
}

function buildCalendarSuggestionHref(locale: string, item: { title: string; jurisdiction: string; executiveSummary: string }) {
  const params = new URLSearchParams({ source: 'intelligence', title: item.title, country: item.jurisdiction, description: item.executiveSummary });
  return `/${locale}/calendario-compliance?${params.toString()}`;
}

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.42))] text-foreground">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <Link href={`/${locale}/dashboard/organizations/reports-governance/news`} className="rounded-sm text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">← {copy.back}</Link>

        <article className="rounded-[2rem] border bg-background/92 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.persona.desk}</span>
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.category}</span>
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.jurisdiction}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getImpactTone(item.impact)}`}>{copy.impact}: {item.impact}</span>
            {item.premium ? <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Premium</span> : null}
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] md:text-6xl">{item.title}</h1>
          <p className="mt-5 text-xl leading-9 text-muted-foreground md:text-2xl">{item.newspaperDeck}</p>

          <div className="mt-6 grid gap-3 rounded-[1.5rem] border bg-muted/25 p-5 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="flex items-center gap-2"><UserRound className="h-4 w-4" aria-hidden="true" /> {copy.by} {item.persona.name}, {item.persona.desk}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ExternalLink className="h-4 w-4" aria-hidden="true" /> {copy.source}: {item.referenceLabel}<span className="sr-only"> — {copy.verifiedSource}</span></a>
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {copy.date}: {formatDate(item.publishedAt, locale)}</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> {copy.reliability}: {item.reliability}</p>
          </div>

          {locked ? (
            <section className="mt-8 rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-100" aria-labelledby="premium-preview-title">
              <h2 id="premium-preview-title" className="text-xl font-semibold">{copy.lockedTitle}</h2>
              <p className="mt-2 text-sm leading-6">{copy.lockedBody}</p>
              <Link href={`/${locale}/dashboard/organizations/add-ons?addon=regulatory-monitoring-pro`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {copy.reviewAccess}
              </Link>
            </section>
          ) : (
            <div className="mt-8 space-y-8">
              <section className="rounded-[1.5rem] border bg-background/70 p-6 md:p-8">
                <div className="border-b pb-4"><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">RISCK COMPLY Intelligence</p><p className="mt-2 text-sm text-muted-foreground">{item.persona.tagline}</p></div>
                <div className="mt-6 space-y-6 text-base leading-8 text-foreground/88 md:text-lg md:leading-9">{item.articleParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
              </section>

              <section className="rounded-[1.5rem] border bg-muted/20 p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.analysis}</h2>
                <p className="mt-3 text-sm leading-7 text-foreground/85 md:text-base">{item.risckComplyAnalysis}</p>
                <p className="mt-4 rounded-2xl border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">{copy.editorialNote}</p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border bg-muted/20 p-6"><h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.affected}</h2><div className="mt-4 flex flex-wrap gap-2">{item.affectedCompanies.map((company) => <span key={company} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{company}</span>)}</div></div>
                <div className="rounded-[1.5rem] border bg-muted/20 p-6"><h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.calendar}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.calendarSuggestion}</p><Link href={buildCalendarSuggestionHref(locale, item)} className="mt-4 inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm font-bold transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{copy.addCalendar}</Link></div>
              </section>

              <section className="rounded-[1.5rem] border bg-muted/20 p-6"><h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.actions}</h2><ul className="mt-4 space-y-3 text-sm text-muted-foreground">{item.recommendedActions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {action}</li>)}</ul></section>

              <section className="rounded-[1.5rem] border bg-muted/20 p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.provenance}</h2>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                  <p className="flex items-center gap-2"><Building2 className="h-4 w-4" aria-hidden="true" /> {copy.jurisdiction}: {item.jurisdiction}</p>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ExternalLink className="h-4 w-4" aria-hidden="true" /> {copy.source}: {item.referenceLabel}</a>
                  <p className="flex items-center gap-2"><UserRound className="h-4 w-4" aria-hidden="true" /> {copy.editor}: {item.persona.name}</p>
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {copy.published}: {formatDate(item.publishedAt, locale)}</p>
                  <p className="flex items-center gap-2 md:col-span-2"><FileText className="h-4 w-4" aria-hidden="true" /> {copy.rights}: {item.contentRights}</p>
                </div>
              </section>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
