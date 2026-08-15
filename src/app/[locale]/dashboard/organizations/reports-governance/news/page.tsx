import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, CalendarDays, CheckCircle2, ExternalLink, FileText, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { canAccessFeature } from '@/lib/billing/feature-gates';
import { locales, type Locale } from '@/lib/i18n/routing';
import { listActiveOrganizationAddOns } from '@/server/billing/addons';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { listPublishedIntelligenceItems, type IntelligenceImpact } from '@/server/queries/intelligence';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { normalizePlan } from '@/server/queries/subscription';

type JournalCopy = {
  back: string;
  title: string;
  subtitle: string;
  monitoringAddon: string;
  calendar: string;
  editorial: string;
  articles: string;
  highImpact: string;
  calendarMetric: string;
  desks: string;
  lockedTitle: string;
  lockedBody: (count: number) => string;
  addons: string;
  search: string;
  allRegions: string;
  allDesks: string;
  filter: string;
  impact: string;
  preview: string;
  fullArticle: string;
  readFull: string;
  smartCalendar: string;
  addCalendar: string;
  affectedCompanies: string;
  recommendedActions: string;
  source: string;
  verifiedSource: string;
  noVerifiedItems: string;
  noMatches: string;
  provenanceNote: string;
};

const journalCopy: Record<Locale, JournalCopy> = {
  en: {
    back: 'Reports & Governance', title: 'EU AI Act & Regulatory Intelligence', subtitle: 'Source-verifiable regulatory intelligence that turns dated official updates into governance decisions, evidence work and calendar actions.', monitoringAddon: 'Regulatory Monitoring Pro', calendar: 'Open smart calendar', editorial: 'Editorial panel', articles: 'Verified updates', highImpact: 'High impact', calendarMetric: 'Calendar-ready', desks: 'Desks', lockedTitle: 'Regulatory Monitoring Pro is not active', lockedBody: (count) => `${count} premium update${count === 1 ? '' : 's'} remain in preview until the eligible plan or add-on entitlement is active.`, addons: 'Review access options', search: 'Search topic, law, country or market', allRegions: 'All regions', allDesks: 'All desks', filter: 'Filter intelligence', impact: 'Impact', preview: 'Premium preview. Activate eligible Regulatory Monitoring access for complete analysis and recommended actions.', fullArticle: 'RISCK COMPLY analysis', readFull: 'Open intelligence entry', smartCalendar: 'Suggested next step', addCalendar: 'Add to calendar', affectedCompanies: 'Potentially affected organizations', recommendedActions: 'Recommended actions', source: 'Source', verifiedSource: 'Open original source', noVerifiedItems: 'No source-verified regulatory updates are published right now. RISCK COMPLY does not substitute synthetic or undated content for a live intelligence feed.', noMatches: 'No verified updates match these filters.', provenanceNote: 'Only published items with a real publication date and an HTTPS reference are shown here.',
  },
  pt: {
    back: 'Relatórios e Governação', title: 'EU AI Act & Regulatory Intelligence', subtitle: 'Inteligência regulatória com fonte verificável que transforma atualizações oficiais datadas em decisões, evidências e ações de calendário.', monitoringAddon: 'Regulatory Monitoring Pro', calendar: 'Abrir calendário inteligente', editorial: 'Painel editorial', articles: 'Atualizações verificadas', highImpact: 'Impacto alto', calendarMetric: 'Prontas para calendário', desks: 'Editorias', lockedTitle: 'Regulatory Monitoring Pro não está ativo', lockedBody: (count) => `${count} atualização${count === 1 ? '' : 'ões'} premium permanece${count === 1 ? '' : 'm'} em preview até o plano elegível ou add-on ficar ativo.`, addons: 'Rever opções de acesso', search: 'Buscar tema, lei, país ou mercado', allRegions: 'Todas as regiões', allDesks: 'Todas as editorias', filter: 'Filtrar inteligência', impact: 'Impacto', preview: 'Preview premium. Ative um acesso elegível ao Regulatory Monitoring para ver análise completa e ações recomendadas.', fullArticle: 'Análise RISCK COMPLY', readFull: 'Abrir atualização', smartCalendar: 'Próximo passo sugerido', addCalendar: 'Adicionar ao calendário', affectedCompanies: 'Organizações potencialmente afetadas', recommendedActions: 'Ações recomendadas', source: 'Fonte', verifiedSource: 'Abrir fonte original', noVerifiedItems: 'Nenhuma atualização regulatória com fonte verificável está publicada agora. A RISCK COMPLY não substitui um feed real por notícias sintéticas ou sem data.', noMatches: 'Nenhuma atualização verificada corresponde a estes filtros.', provenanceNote: 'Só aparecem aqui itens publicados com data real e referência HTTPS verificável.',
  },
  es: {
    back: 'Informes y gobernanza', title: 'EU AI Act & Regulatory Intelligence', subtitle: 'Inteligencia regulatoria con fuente verificable que convierte actualizaciones oficiales fechadas en decisiones, evidencias y acciones de calendario.', monitoringAddon: 'Regulatory Monitoring Pro', calendar: 'Abrir calendario inteligente', editorial: 'Panel editorial', articles: 'Actualizaciones verificadas', highImpact: 'Impacto alto', calendarMetric: 'Listas para calendario', desks: 'Secciones', lockedTitle: 'Regulatory Monitoring Pro no está activo', lockedBody: (count) => `${count} actualización${count === 1 ? '' : 'es'} premium permanece${count === 1 ? '' : 'n'} en vista previa hasta activar un plan o add-on elegible.`, addons: 'Revisar opciones de acceso', search: 'Buscar tema, ley, país o mercado', allRegions: 'Todas las regiones', allDesks: 'Todas las secciones', filter: 'Filtrar inteligencia', impact: 'Impacto', preview: 'Vista previa premium. Active un acceso elegible a Regulatory Monitoring para ver el análisis completo y las acciones recomendadas.', fullArticle: 'Análisis RISCK COMPLY', readFull: 'Abrir actualización', smartCalendar: 'Siguiente paso sugerido', addCalendar: 'Añadir al calendario', affectedCompanies: 'Organizaciones potencialmente afectadas', recommendedActions: 'Acciones recomendadas', source: 'Fuente', verifiedSource: 'Abrir fuente original', noVerifiedItems: 'No hay actualizaciones regulatorias con fuente verificada publicadas ahora. RISCK COMPLY no sustituye un feed real por noticias sintéticas o sin fecha.', noMatches: 'Ninguna actualización verificada coincide con estos filtros.', provenanceNote: 'Solo se muestran elementos publicados con fecha real y referencia HTTPS verificable.',
  },
  fr: {
    back: 'Rapports et gouvernance', title: 'EU AI Act & Regulatory Intelligence', subtitle: 'Veille réglementaire avec source vérifiable transformant les mises à jour officielles datées en décisions, preuves et actions calendrier.', monitoringAddon: 'Regulatory Monitoring Pro', calendar: 'Ouvrir le calendrier intelligent', editorial: 'Panneau éditorial', articles: 'Mises à jour vérifiées', highImpact: 'Impact élevé', calendarMetric: 'Prêtes pour calendrier', desks: 'Rubriques', lockedTitle: 'Regulatory Monitoring Pro n’est pas actif', lockedBody: (count) => `${count} mise${count === 1 ? '' : 's'} à jour premium reste${count === 1 ? '' : 'nt'} en aperçu jusqu’à l’activation d’un plan ou add-on éligible.`, addons: 'Voir les options d’accès', search: 'Rechercher un thème, une loi, un pays ou un marché', allRegions: 'Toutes les régions', allDesks: 'Toutes les rubriques', filter: 'Filtrer la veille', impact: 'Impact', preview: 'Aperçu premium. Activez un accès Regulatory Monitoring éligible pour l’analyse complète et les actions recommandées.', fullArticle: 'Analyse RISCK COMPLY', readFull: 'Ouvrir la mise à jour', smartCalendar: 'Prochaine étape suggérée', addCalendar: 'Ajouter au calendrier', affectedCompanies: 'Organisations potentiellement concernées', recommendedActions: 'Actions recommandées', source: 'Source', verifiedSource: 'Ouvrir la source originale', noVerifiedItems: 'Aucune mise à jour réglementaire à source vérifiée n’est publiée actuellement. RISCK COMPLY ne remplace pas un flux réel par des actualités synthétiques ou non datées.', noMatches: 'Aucune mise à jour vérifiée ne correspond à ces filtres.', provenanceNote: 'Seuls les éléments publiés avec une date réelle et une référence HTTPS vérifiable sont affichés.',
  },
  it: {
    back: 'Report e governance', title: 'EU AI Act & Regulatory Intelligence', subtitle: 'Intelligence normativa con fonte verificabile che trasforma aggiornamenti ufficiali datati in decisioni, evidenze e azioni di calendario.', monitoringAddon: 'Regulatory Monitoring Pro', calendar: 'Apri calendario intelligente', editorial: 'Pannello editoriale', articles: 'Aggiornamenti verificati', highImpact: 'Impatto alto', calendarMetric: 'Pronti per calendario', desks: 'Sezioni', lockedTitle: 'Regulatory Monitoring Pro non è attivo', lockedBody: (count) => `${count} aggiornament${count === 1 ? 'o' : 'i'} premium ${count === 1 ? 'rimane' : 'rimangono'} in anteprima fino all’attivazione di un piano o add-on idoneo.`, addons: 'Rivedi opzioni di accesso', search: 'Cerca tema, legge, paese o mercato', allRegions: 'Tutte le regioni', allDesks: 'Tutte le sezioni', filter: 'Filtra intelligence', impact: 'Impatto', preview: 'Anteprima premium. Attiva un accesso Regulatory Monitoring idoneo per analisi completa e azioni consigliate.', fullArticle: 'Analisi RISCK COMPLY', readFull: 'Apri aggiornamento', smartCalendar: 'Prossimo passo suggerito', addCalendar: 'Aggiungi al calendario', affectedCompanies: 'Organizzazioni potenzialmente interessate', recommendedActions: 'Azioni consigliate', source: 'Fonte', verifiedSource: 'Apri fonte originale', noVerifiedItems: 'Nessun aggiornamento normativo con fonte verificata è pubblicato ora. RISCK COMPLY non sostituisce un feed reale con notizie sintetiche o senza data.', noMatches: 'Nessun aggiornamento verificato corrisponde ai filtri.', provenanceNote: 'Sono mostrati solo elementi pubblicati con data reale e riferimento HTTPS verificabile.',
  },
  de: {
    back: 'Berichte & Governance', title: 'EU AI Act & Regulatory Intelligence', subtitle: 'Quellenverifizierbare Regulatory Intelligence, die datierte offizielle Updates in Entscheidungen, Evidenzarbeit und Kalenderaktionen übersetzt.', monitoringAddon: 'Regulatory Monitoring Pro', calendar: 'Intelligenten Kalender öffnen', editorial: 'Redaktionsbereich', articles: 'Verifizierte Updates', highImpact: 'Hoher Einfluss', calendarMetric: 'Kalenderbereit', desks: 'Ressorts', lockedTitle: 'Regulatory Monitoring Pro ist nicht aktiv', lockedBody: (count) => `${count} Premium-Update${count === 1 ? '' : 's'} bleiben in der Vorschau, bis ein berechtigter Plan oder Add-on aktiv ist.`, addons: 'Zugriffsoptionen prüfen', search: 'Thema, Gesetz, Land oder Markt suchen', allRegions: 'Alle Regionen', allDesks: 'Alle Ressorts', filter: 'Intelligence filtern', impact: 'Einfluss', preview: 'Premium-Vorschau. Aktivieren Sie einen berechtigten Regulatory-Monitoring-Zugriff für vollständige Analyse und empfohlene Maßnahmen.', fullArticle: 'RISCK COMPLY Analyse', readFull: 'Update öffnen', smartCalendar: 'Empfohlener nächster Schritt', addCalendar: 'Zum Kalender hinzufügen', affectedCompanies: 'Potenziell betroffene Organisationen', recommendedActions: 'Empfohlene Maßnahmen', source: 'Quelle', verifiedSource: 'Originalquelle öffnen', noVerifiedItems: 'Derzeit sind keine regulatorischen Updates mit verifizierter Quelle veröffentlicht. RISCK COMPLY ersetzt einen echten Feed nicht durch synthetische oder undatierte Nachrichten.', noMatches: 'Keine verifizierten Updates entsprechen diesen Filtern.', provenanceNote: 'Hier erscheinen nur veröffentlichte Elemente mit echtem Datum und verifizierbarer HTTPS-Referenz.',
  },
};

function getCopy(locale: string) {
  return journalCopy[locales.includes(locale as Locale) ? (locale as Locale) : 'en'];
}

function getImpactTone(impact: IntelligenceImpact) {
  if (impact === 'Crítico') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (impact === 'Alto') return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-200';
  if (impact === 'Médio') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

function buildCalendarSuggestionHref(locale: string, item: { title: string; jurisdiction: string; executiveSummary: string }) {
  const params = new URLSearchParams({ source: 'intelligence', title: item.title, country: item.jurisdiction, description: item.executiveSummary });
  return `/${locale}/calendario-compliance?${params.toString()}`;
}

export default async function ComplianceNewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; jurisdiction?: string; category?: string; premium?: string }> }) {
  const { locale } = await params;
  const copy = getCopy(locale);
  const query = (await searchParams) ?? {};
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization?.id) redirect(`/${locale}/onboarding`);

  const [entitlements, activeAddOns, intelligenceItems] = await Promise.all([
    getOrganizationEntitlements(organization.id),
    listActiveOrganizationAddOns(organization.id),
    listPublishedIntelligenceItems(),
  ]);
  const canUsePremiumNews = canAccessFeature('regulatory_monitoring', {
    plan: normalizePlan(entitlements.plan),
    activeAddOns,
  });
  const wantsPremium = query.premium === '1';
  const term = (query.q ?? '').toLowerCase().trim();
  const jurisdiction = query.jurisdiction ?? 'all';
  const category = query.category ?? 'all';

  const visibleNews = intelligenceItems.filter((item) => !item.premium || canUsePremiumNews || wantsPremium);
  const filtered = visibleNews.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.jurisdiction} ${item.executiveSummary} ${item.source}`.toLowerCase();
    return (!term || haystack.includes(term)) && (jurisdiction === 'all' || item.jurisdiction === jurisdiction) && (category === 'all' || item.category === category);
  });
  const jurisdictions = Array.from(new Set(intelligenceItems.map((item) => item.jurisdiction)));
  const categories = Array.from(new Set(intelligenceItems.map((item) => item.category)));
  const lockedCount = intelligenceItems.filter((item) => item.premium && !canUsePremiumNews).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.42))] text-foreground">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <Link href={`/${locale}/dashboard/organizations/reports-governance`} className="rounded-md text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">← {copy.back}</Link>

        <section className="rounded-[2rem] border bg-background/92 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9" aria-labelledby="intelligence-journal-title">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">RISCK COMPLY Intelligence</p>
          <h1 id="intelligence-journal-title" className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.045em] md:text-6xl">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">{copy.subtitle}</p>
          <p className="mt-3 flex max-w-3xl items-center gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{copy.provenanceNote}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/dashboard/organizations/add-ons?addon=regulatory-monitoring-pro`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Sparkles className="h-4 w-4" aria-hidden="true" /> {copy.monitoringAddon}</Link>
            <Link href={`/${locale}/calendario-compliance`} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {copy.calendar}</Link>
            <Link href={`/${locale}/dashboard/organizations/reports-governance/news/editorial`} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> {copy.editorial}</Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Intelligence summary">
          {[{ label: copy.articles, value: intelligenceItems.length.toString(), icon: FileText }, { label: copy.highImpact, value: intelligenceItems.filter((item) => item.impact === 'Alto' || item.impact === 'Crítico').length.toString(), icon: ShieldCheck }, { label: copy.calendarMetric, value: intelligenceItems.length.toString(), icon: CalendarDays }, { label: copy.desks, value: new Set(intelligenceItems.map((item) => item.persona.desk)).size.toString(), icon: Building2 }].map((metric) => {
            const Icon = metric.icon;
            return <article key={metric.label} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{metric.label}</p><Icon className="h-4 w-4 text-primary" aria-hidden="true" /></div><p className="mt-2 text-3xl font-semibold">{metric.value}</p></article>;
          })}
        </section>

        {wantsPremium && !canUsePremiumNews ? <UpgradeRequiredCard locale={locale} requiredPlan="Professional" addOnSlug="regulatory-monitoring-pro" title={copy.lockedTitle} description={copy.lockedBody(lockedCount)} ctaLabel={copy.addons} /> : null}

        {intelligenceItems.length > 0 ? (
          <form className="grid gap-3 rounded-[1.5rem] border bg-background/90 p-5 shadow-sm md:grid-cols-4" action={`/${locale}/dashboard/organizations/reports-governance/news`} role="search">
            <input name="q" defaultValue={query.q ?? ''} placeholder={copy.search} aria-label={copy.search} className="min-h-11 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring" />
            <select name="jurisdiction" defaultValue={jurisdiction} aria-label={copy.allRegions} className="min-h-11 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"><option value="all">{copy.allRegions}</option>{jurisdictions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select name="category" defaultValue={category} aria-label={copy.allDesks} className="min-h-11 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"><option value="all">{copy.allDesks}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <button className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-bold text-background transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="submit">{copy.filter}</button>
            {wantsPremium ? <input type="hidden" name="premium" value="1" /> : null}
          </form>
        ) : null}

        <section className="grid gap-5">
          {filtered.map((item) => {
            const locked = item.premium && !canUsePremiumNews;
            const detailHref = `/${locale}/dashboard/organizations/reports-governance/news/${item.id}`;
            return (
              <article key={item.id} className="rounded-[2rem] border bg-background/92 p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap gap-2"><span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.persona.desk}</span><span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.category}</span><span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.jurisdiction}</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getImpactTone(item.impact)}`}>{copy.impact}: {item.impact}</span>{item.premium ? <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Premium</span> : null}</div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl"><Link href={detailHref} className="rounded-sm transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.title}</Link></h2>
                <p className="mt-3 text-base leading-7 text-muted-foreground md:text-lg">{item.newspaperDeck}</p>
                <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <p className="flex items-center gap-2"><UserRound className="h-4 w-4" aria-hidden="true" /> {item.persona.name}</p>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="truncate">{item.source}</span><span className="sr-only"> — {copy.verifiedSource}</span></a>
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {formatDate(item.publishedAt, locale)}</p>
                  <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> {item.reliability}</p>
                </div>
                {locked ? <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100" role="status">{copy.preview}</div> : <div className="mt-6 grid gap-4 lg:grid-cols-2"><section className="rounded-[1.5rem] border bg-muted/20 p-5"><h3 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.fullArticle}</h3><p className="mt-3 text-sm leading-7">{item.articleParagraphs[0]}</p><Link href={detailHref} className="mt-4 inline-flex min-h-10 items-center rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{copy.readFull}</Link></section><section className="rounded-[1.5rem] border bg-muted/20 p-5"><h3 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.smartCalendar}</h3><p className="mt-3 text-sm leading-6">{item.calendarSuggestion}</p><Link href={buildCalendarSuggestionHref(locale, item)} className="mt-4 inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-xs font-bold transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{copy.addCalendar}</Link></section></div>}
                {!locked ? <div className="mt-5 grid gap-4 lg:grid-cols-2"><section><h3 className="text-sm font-semibold">{copy.affectedCompanies}</h3><div className="mt-3 flex flex-wrap gap-2">{item.affectedCompanies.map((company) => <span key={company} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{company}</span>)}</div></section><section><h3 className="text-sm font-semibold">{copy.recommendedActions}</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{item.recommendedActions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {action}</li>)}</ul></section></div> : null}
              </article>
            );
          })}
        </section>

        {intelligenceItems.length === 0 ? <p className="rounded-[1.5rem] border border-dashed bg-background/80 p-8 text-center text-sm font-semibold leading-6 text-muted-foreground" role="status">{copy.noVerifiedItems}</p> : filtered.length === 0 ? <p className="rounded-[1.5rem] border border-dashed bg-background/80 p-8 text-center text-sm font-semibold text-muted-foreground" role="status">{copy.noMatches}</p> : null}
      </div>
    </main>
  );
}
