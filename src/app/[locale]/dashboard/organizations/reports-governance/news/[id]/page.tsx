import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Building2, CalendarDays, CheckCircle2, FileText, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getPublishedIntelligenceItem, type IntelligenceImpact } from '@/server/queries/intelligence';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { isPlanAtLeast } from '@/server/queries/subscription';

function getImpactTone(impact: IntelligenceImpact) {
  if (impact === 'Crítico') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (impact === 'Alto') return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-200';
  if (impact === 'Médio') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}

function buildCalendarSuggestionHref(locale: string, item: { title: string; jurisdiction: string; executiveSummary: string }) {
  const params = new URLSearchParams({
    source: 'intelligence',
    title: item.title,
    country: item.jurisdiction,
    description: item.executiveSummary,
  });

  return `/${locale}/calendario-compliance?${params.toString()}`;
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function IntelligenceDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/login`);

  const [organization, item] = await Promise.all([
    getCurrentOrganizationForUser(user.id),
    getPublishedIntelligenceItem(id),
  ]);

  if (!item) notFound();

  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;
  const canUsePremiumNews = entitlements ? isPlanAtLeast(entitlements.plan, 'professional') : false;
  const locked = item.premium && !canUsePremiumNews;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.42))] text-foreground">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <Link href={`/${locale}/dashboard/organizations/reports-governance/news`} className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">← Voltar ao RISCK COMPLY Intelligence</Link>

        <article className="rounded-[2rem] border bg-background/92 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.persona.desk}</span>
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.category}</span>
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.jurisdiction}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getImpactTone(item.impact)}`}>Impacto: {item.impact}</span>
            {item.premium ? <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Premium</span> : null}
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] md:text-6xl">{item.title}</h1>
          <p className="mt-5 text-xl leading-9 text-muted-foreground md:text-2xl">{item.newspaperDeck}</p>

          <div className="mt-6 grid gap-3 rounded-[1.5rem] border bg-muted/25 p-5 text-sm text-muted-foreground md:grid-cols-2">
            <p className="flex items-center gap-2"><UserRound className="h-4 w-4" /> Por {item.persona.name}, {item.persona.desk}</p>
            <p className="flex items-center gap-2"><FileText className="h-4 w-4" /> Fonte monitorada: {item.source}</p>
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Data: {formatDate(item.publishedAt, locale)}</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Confiabilidade: {item.reliability}</p>
          </div>

          {locked ? (
            <section className="mt-8 rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-100">
              <h2 className="text-xl font-semibold">Dossiê premium em preview</h2>
              <p className="mt-2 text-sm leading-6">Ative Notícias Premium ou use plano Professional/superior para ver análise completa, ações recomendadas e integração com calendário inteligente.</p>
              <Link href={`/${locale}/dashboard/organizations/add-ons`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background">
                <Sparkles className="h-4 w-4" /> Ver add-ons
              </Link>
            </section>
          ) : (
            <div className="mt-8 space-y-8">
              <section className="rounded-[1.5rem] border bg-background/70 p-6 md:p-8">
                <div className="border-b pb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Matéria original RISCK COMPLY Intelligence</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.persona.tagline}</p>
                </div>
                <div className="mt-6 space-y-6 text-lg leading-9 text-foreground/88">
                  {item.articleParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border bg-muted/20 p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Análise RISCK COMPLY</h2>
                <p className="mt-3 text-sm leading-7 text-foreground/85 md:text-base">{item.risckComplyAnalysis}</p>
                <p className="mt-4 rounded-2xl border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">Nota editorial: o RISCK COMPLY mantém metadados, referência e análise própria. Conteúdo completo só deve ser armazenado para fontes oficiais, abertas ou licenciadas. Para mídia comercial, o jornal publica síntese e análise próprias com referência ao original.</p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border bg-muted/20 p-6">
                  <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Empresas afetadas</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.affectedCompanies.map((company) => <span key={company} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{company}</span>)}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border bg-muted/20 p-6">
                  <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Calendário inteligente</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.calendarSuggestion}</p>
                  <Link href={buildCalendarSuggestionHref(locale, item)} className="mt-4 inline-flex rounded-full border px-4 py-2 text-sm font-bold transition hover:bg-background">Adicionar ao calendário</Link>
                </div>
              </section>

              <section className="rounded-[1.5rem] border bg-muted/20 p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Ações recomendadas</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {item.recommendedActions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {action}</li>)}
                </ul>
              </section>

              <section className="rounded-[1.5rem] border bg-muted/20 p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Referência e auditoria editorial</h2>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                  <p className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Jurisdição: {item.jurisdiction}</p>
                  <p className="flex items-center gap-2"><FileText className="h-4 w-4" /> Fonte: {item.source}</p>
                  <p className="flex items-center gap-2"><UserRound className="h-4 w-4" /> Editor/persona: {item.persona.name}</p>
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Publicado em: {formatDate(item.publishedAt, locale)}</p>
                </div>
              </section>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
