import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, CalendarDays, CheckCircle2, FileText, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { listPublishedIntelligenceItems, type IntelligenceImpact } from '@/server/queries/intelligence';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { isPlanAtLeast } from '@/server/queries/subscription';

type JournalCopy = {
  back: string;
  title: string;
  subtitle: string;
  premiumAddon: string;
  calendar: string;
  editorial: string;
  articles: string;
  highImpact: string;
  calendarMetric: string;
  desks: string;
  premiumLockedTitle: string;
  premiumLockedBody: (count: number) => string;
  addons: string;
  search: string;
  allRegions: string;
  allDesks: string;
  filter: string;
  impact: string;
  premiumPreview: string;
  fullArticle: string;
  readFull: string;
  smartCalendar: string;
  addCalendar: string;
  affectedCompanies: string;
  recommendedActions: string;
  empty: string;
};

const journalCopy: Record<Locale, JournalCopy> = {
  en: {
    back: 'Reports & Governance', title: 'The Compliance Intelligence Journal.', subtitle: 'Global technology, AI, business, regulation and geopolitics intelligence for teams that need to turn news into decisions, evidence and calendar actions.', premiumAddon: 'View Premium News add-on', calendar: 'Open smart calendar', editorial: 'Editorial panel', articles: 'Articles', highImpact: 'High impact', calendarMetric: 'Calendar', desks: 'Desks', premiumLockedTitle: 'Premium News is not active yet', premiumLockedBody: (count) => `Your current access includes essential intelligence. ${count} premium articles remain in preview until Premium News or an eligible plan is activated.`, addons: 'View add-ons', search: 'Search topic, law, country or market', allRegions: 'All regions', allDesks: 'All desks', filter: 'Filter journal', impact: 'Impact', premiumPreview: 'Premium article preview. Activate Premium News to access the complete analysis and detailed actions.', fullArticle: 'Full article', readFull: 'Read full journal entry', smartCalendar: 'Smart calendar', addCalendar: 'Add to calendar', affectedCompanies: 'Affected companies', recommendedActions: 'Recommended actions', empty: 'No articles match these filters.',
  },
  pt: {
    back: 'Relatórios e Governação', title: 'The Compliance Intelligence Journal.', subtitle: 'Jornal global de tecnologia, IA, negócios, regulação e geopolítica para empresas que precisam transformar notícia em decisão, evidência e calendário.', premiumAddon: 'Ver add-on Notícias Premium', calendar: 'Abrir calendário inteligente', editorial: 'Painel editorial', articles: 'Matérias', highImpact: 'Impacto alto', calendarMetric: 'Calendário', desks: 'Editorias', premiumLockedTitle: 'Notícias Premium ainda não estão ativas', premiumLockedBody: (count) => `O acesso atual mostra matérias essenciais. ${count} matérias premium ficam em preview até ativar Notícias Premium ou um plano elegível.`, addons: 'Ver add-ons', search: 'Buscar tema, lei, país ou mercado', allRegions: 'Todas as regiões', allDesks: 'Todas as editorias', filter: 'Filtrar jornal', impact: 'Impacto', premiumPreview: 'Matéria premium em preview. Ative Notícias Premium para ver análise completa e ações detalhadas.', fullArticle: 'Matéria completa', readFull: 'Ler jornal completo', smartCalendar: 'Calendário inteligente', addCalendar: 'Adicionar ao calendário', affectedCompanies: 'Empresas afetadas', recommendedActions: 'Ações recomendadas', empty: 'Nenhuma matéria encontrada com estes filtros.',
  },
  es: {
    back: 'Informes y gobernanza', title: 'The Compliance Intelligence Journal.', subtitle: 'Inteligencia global sobre tecnología, IA, negocios, regulación y geopolítica para equipos que necesitan convertir noticias en decisiones, evidencias y acciones de calendario.', premiumAddon: 'Ver add-on Noticias Premium', calendar: 'Abrir calendario inteligente', editorial: 'Panel editorial', articles: 'Artículos', highImpact: 'Impacto alto', calendarMetric: 'Calendario', desks: 'Secciones', premiumLockedTitle: 'Noticias Premium aún no está activo', premiumLockedBody: (count) => `El acceso actual incluye inteligencia esencial. ${count} artículos premium permanecen en vista previa hasta activar Noticias Premium o un plan elegible.`, addons: 'Ver add-ons', search: 'Buscar tema, ley, país o mercado', allRegions: 'Todas las regiones', allDesks: 'Todas las secciones', filter: 'Filtrar journal', impact: 'Impacto', premiumPreview: 'Artículo premium en vista previa. Activa Noticias Premium para acceder al análisis completo y las acciones detalladas.', fullArticle: 'Artículo completo', readFull: 'Leer artículo completo', smartCalendar: 'Calendario inteligente', addCalendar: 'Añadir al calendario', affectedCompanies: 'Empresas afectadas', recommendedActions: 'Acciones recomendadas', empty: 'No hay artículos que coincidan con estos filtros.',
  },
  fr: {
    back: 'Rapports et gouvernance', title: 'The Compliance Intelligence Journal.', subtitle: 'Veille mondiale sur la technologie, l’IA, les affaires, la réglementation et la géopolitique pour transformer l’actualité en décisions, preuves et actions calendrier.', premiumAddon: 'Voir l’add-on Actualités Premium', calendar: 'Ouvrir le calendrier intelligent', editorial: 'Panneau éditorial', articles: 'Articles', highImpact: 'Impact élevé', calendarMetric: 'Calendrier', desks: 'Rubriques', premiumLockedTitle: 'Actualités Premium n’est pas encore actif', premiumLockedBody: (count) => `L’accès actuel inclut la veille essentielle. ${count} articles premium restent en aperçu jusqu’à l’activation d’Actualités Premium ou d’un plan éligible.`, addons: 'Voir les add-ons', search: 'Rechercher un thème, une loi, un pays ou un marché', allRegions: 'Toutes les régions', allDesks: 'Toutes les rubriques', filter: 'Filtrer le journal', impact: 'Impact', premiumPreview: 'Article premium en aperçu. Activez Actualités Premium pour accéder à l’analyse complète et aux actions détaillées.', fullArticle: 'Article complet', readFull: 'Lire l’article complet', smartCalendar: 'Calendrier intelligent', addCalendar: 'Ajouter au calendrier', affectedCompanies: 'Entreprises concernées', recommendedActions: 'Actions recommandées', empty: 'Aucun article ne correspond à ces filtres.',
  },
  it: {
    back: 'Report e governance', title: 'The Compliance Intelligence Journal.', subtitle: 'Intelligence globale su tecnologia, IA, business, regolamentazione e geopolitica per trasformare le notizie in decisioni, evidenze e azioni di calendario.', premiumAddon: 'Vedi add-on Notizie Premium', calendar: 'Apri calendario intelligente', editorial: 'Pannello editoriale', articles: 'Articoli', highImpact: 'Impatto alto', calendarMetric: 'Calendario', desks: 'Sezioni', premiumLockedTitle: 'Notizie Premium non è ancora attivo', premiumLockedBody: (count) => `L’accesso attuale include l’intelligence essenziale. ${count} articoli premium restano in anteprima fino all’attivazione di Notizie Premium o di un piano idoneo.`, addons: 'Vedi add-on', search: 'Cerca tema, legge, paese o mercato', allRegions: 'Tutte le regioni', allDesks: 'Tutte le sezioni', filter: 'Filtra journal', impact: 'Impatto', premiumPreview: 'Articolo premium in anteprima. Attiva Notizie Premium per accedere all’analisi completa e alle azioni dettagliate.', fullArticle: 'Articolo completo', readFull: 'Leggi articolo completo', smartCalendar: 'Calendario intelligente', addCalendar: 'Aggiungi al calendario', affectedCompanies: 'Aziende interessate', recommendedActions: 'Azioni consigliate', empty: 'Nessun articolo corrisponde a questi filtri.',
  },
  de: {
    back: 'Berichte & Governance', title: 'The Compliance Intelligence Journal.', subtitle: 'Globale Intelligence zu Technologie, KI, Wirtschaft, Regulierung und Geopolitik, um Nachrichten in Entscheidungen, Evidenz und Kalenderaktionen zu übersetzen.', premiumAddon: 'Premium News Add-on ansehen', calendar: 'Intelligenten Kalender öffnen', editorial: 'Redaktionsbereich', articles: 'Artikel', highImpact: 'Hoher Einfluss', calendarMetric: 'Kalender', desks: 'Ressorts', premiumLockedTitle: 'Premium News ist noch nicht aktiv', premiumLockedBody: (count) => `Der aktuelle Zugriff umfasst wesentliche Intelligence. ${count} Premium-Artikel bleiben in der Vorschau, bis Premium News oder ein berechtigter Plan aktiviert wird.`, addons: 'Add-ons ansehen', search: 'Thema, Gesetz, Land oder Markt suchen', allRegions: 'Alle Regionen', allDesks: 'Alle Ressorts', filter: 'Journal filtern', impact: 'Einfluss', premiumPreview: 'Premium-Artikel in der Vorschau. Aktivieren Sie Premium News für die vollständige Analyse und detaillierte Maßnahmen.', fullArticle: 'Vollständiger Artikel', readFull: 'Vollständigen Artikel lesen', smartCalendar: 'Intelligenter Kalender', addCalendar: 'Zum Kalender hinzufügen', affectedCompanies: 'Betroffene Unternehmen', recommendedActions: 'Empfohlene Maßnahmen', empty: 'Keine Artikel entsprechen diesen Filtern.',
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
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
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
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;
  const canUsePremiumNews = entitlements ? isPlanAtLeast(entitlements.plan, 'professional') : false;
  const intelligenceItems = await listPublishedIntelligenceItems();
  const wantsPremium = query.premium === '1';
  const term = (query.q ?? '').toLowerCase().trim();
  const jurisdiction = query.jurisdiction ?? 'all';
  const category = query.category ?? 'all';

  const visibleNews = intelligenceItems.filter((item) => !item.premium || canUsePremiumNews || wantsPremium);
  const filtered = visibleNews.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.jurisdiction} ${item.executiveSummary} ${item.risckComplyAnalysis}`.toLowerCase();
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
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/dashboard/organizations/add-ons`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Sparkles className="h-4 w-4" aria-hidden="true" /> {copy.premiumAddon}</Link>
            <Link href={`/${locale}/calendario-compliance`} className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {copy.calendar}</Link>
            <Link href={`/${locale}/dashboard/organizations/reports-governance/news/editorial`} className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> {copy.editorial}</Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4" aria-label="Journal summary">
          {[{ label: copy.articles, value: intelligenceItems.length.toString(), icon: FileText }, { label: copy.highImpact, value: intelligenceItems.filter((item) => item.impact === 'Alto' || item.impact === 'Crítico').length.toString(), icon: ShieldCheck }, { label: copy.calendarMetric, value: intelligenceItems.length.toString(), icon: CalendarDays }, { label: copy.desks, value: new Set(intelligenceItems.map((item) => item.persona.desk)).size.toString(), icon: Building2 }].map((metric) => {
            const Icon = metric.icon;
            return <article key={metric.label} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{metric.label}</p><Icon className="h-4 w-4 text-primary" aria-hidden="true" /></div><p className="mt-2 text-3xl font-semibold">{metric.value}</p></article>;
          })}
        </section>

        {wantsPremium && !canUsePremiumNews ? <UpgradeRequiredCard locale={locale} title={copy.premiumLockedTitle} description={copy.premiumLockedBody(lockedCount)} ctaLabel={copy.addons} /> : null}

        <form className="grid gap-3 rounded-[1.5rem] border bg-background/90 p-5 shadow-sm md:grid-cols-4" action={`/${locale}/dashboard/organizations/reports-governance/news`} role="search">
          <input name="q" defaultValue={query.q ?? ''} placeholder={copy.search} aria-label={copy.search} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring" />
          <select name="jurisdiction" defaultValue={jurisdiction} aria-label={copy.allRegions} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"><option value="all">{copy.allRegions}</option>{jurisdictions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select name="category" defaultValue={category} aria-label={copy.allDesks} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"><option value="all">{copy.allDesks}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button className="rounded-2xl bg-foreground px-4 py-3 text-sm font-bold text-background transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="submit">{copy.filter}</button>
          {wantsPremium ? <input type="hidden" name="premium" value="1" /> : null}
        </form>

        <section className="grid gap-5">
          {filtered.map((item) => {
            const locked = item.premium && !canUsePremiumNews;
            const detailHref = `/${locale}/dashboard/organizations/reports-governance/news/${item.id}`;
            return (
              <article key={item.id} className="rounded-[2rem] border bg-background/92 p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap gap-2"><span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.persona.desk}</span><span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.category}</span><span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.jurisdiction}</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getImpactTone(item.impact)}`}>{copy.impact}: {item.impact}</span>{item.premium ? <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Premium</span> : null}</div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl"><Link href={detailHref} className="rounded-sm transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.title}</Link></h2>
                <p className="mt-3 text-base leading-7 text-muted-foreground md:text-lg">{item.newspaperDeck}</p>
                <div className="mt-5 grid gap-3 text-sm text-muted-foreground md:grid-cols-4"><p className="flex items-center gap-2"><UserRound className="h-4 w-4" aria-hidden="true" /> {item.persona.name}</p><p className="flex items-center gap-2"><FileText className="h-4 w-4" aria-hidden="true" /> {item.source}</p><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {formatDate(item.publishedAt, locale)}</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> {item.reliability}</p></div>
                {locked ? <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100" role="status">{copy.premiumPreview}</div> : <div className="mt-6 grid gap-4 lg:grid-cols-2"><section className="rounded-[1.5rem] border bg-muted/20 p-5"><h3 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.fullArticle}</h3><p className="mt-3 text-sm leading-7">{item.articleParagraphs[0]}</p><Link href={detailHref} className="mt-4 inline-flex rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{copy.readFull}</Link></section><section className="rounded-[1.5rem] border bg-muted/20 p-5"><h3 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{copy.smartCalendar}</h3><p className="mt-3 text-sm leading-6">{item.calendarSuggestion}</p><Link href={buildCalendarSuggestionHref(locale, item)} className="mt-4 inline-flex rounded-full border px-4 py-2 text-xs font-bold transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{copy.addCalendar}</Link></section></div>}
                {!locked ? <div className="mt-5 grid gap-4 lg:grid-cols-2"><section><h3 className="text-sm font-semibold">{copy.affectedCompanies}</h3><div className="mt-3 flex flex-wrap gap-2">{item.affectedCompanies.map((company) => <span key={company} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{company}</span>)}</div></section><section><h3 className="text-sm font-semibold">{copy.recommendedActions}</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{item.recommendedActions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {action}</li>)}</ul></section></div> : null}
              </article>
            );
          })}
        </section>

        {filtered.length === 0 ? <p className="rounded-[1.5rem] border border-dashed bg-background/80 p-8 text-center text-sm font-semibold text-muted-foreground" role="status">{copy.empty}</p> : null}
      </div>
    </main>
  );
}
