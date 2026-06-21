import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CalendarDays, CheckCircle2, FileText, ShieldCheck, Sparkles } from 'lucide-react';

import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { listPublishedIntelligenceItems, type IntelligenceImpact } from '@/server/queries/intelligence';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { isPlanAtLeast } from '@/server/queries/subscription';

function getImpactTone(impact: IntelligenceImpact) {
  if (impact === 'Crítico') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (impact === 'Alto') return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-200';
  if (impact === 'Médio') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
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
  params: Promise<{ locale: string }>;
};

export default async function IntelligenceEditorialPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/login`);

  const [organization, items] = await Promise.all([
    getCurrentOrganizationForUser(user.id),
    listPublishedIntelligenceItems(),
  ]);

  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;
  const canUsePremiumNews = entitlements ? isPlanAtLeast(entitlements.plan, 'professional') : false;
  const premiumCount = items.filter((item) => item.premium).length;
  const highImpactCount = items.filter((item) => item.impact === 'Alto' || item.impact === 'Crítico').length;
  const calendarReadyCount = items.filter((item) => item.calendarSuggestion.length > 0).length;
  const uniqueSources = Array.from(new Set(items.map((item) => item.source)));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.42))] text-foreground">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <Link href={`/${locale}/dashboard/organizations/reports-governance/news`} className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">← Voltar ao Jornal IA</Link>

        <section className="rounded-[2rem] border bg-background/92 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Painel editorial</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] md:text-6xl">Auditoria do RISCK COMPLY Intelligence.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            Use este painel para validar a prontidão editorial dos dossiês antes de automatizar a ingestão 24/7: impacto, premium, fonte, análise, ações e calendário.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Dossiês publicados', value: items.length.toString(), icon: FileText },
            { label: 'Premium', value: premiumCount.toString(), icon: Sparkles },
            { label: 'Impacto alto', value: highImpactCount.toString(), icon: AlertTriangle },
            { label: 'Prontos calendário', value: calendarReadyCount.toString(), icon: CalendarDays },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Fontes monitoradas</h2>
            <div className="mt-4 space-y-2">
              {uniqueSources.map((source) => (
                <div key={source} className="rounded-2xl border bg-muted/25 p-3 text-sm text-muted-foreground">
                  {source}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border bg-muted/20 p-4 text-xs leading-5 text-muted-foreground">
              Regra editorial: conteúdo completo só deve ser armazenado para fontes oficiais, abertas ou licenciadas. Para mídia comum, manter metadados, referência e análise própria.
            </div>
          </aside>

          <section className="space-y-4">
            {items.map((item) => {
              const locked = item.premium && !canUsePremiumNews;
              const readiness = [
                item.executiveSummary ? 'Resumo' : null,
                item.risckComplyAnalysis ? 'Análise' : null,
                item.recommendedActions.length ? 'Ações' : null,
                item.calendarSuggestion ? 'Calendário' : null,
              ].filter(Boolean);

              return (
                <article key={item.id} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.category}</span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getImpactTone(item.impact)}`}>{item.impact}</span>
                        {item.premium ? <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Premium</span> : null}
                        {locked ? <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-200">Preview no plano atual</span> : null}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.source} · {item.author}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/${locale}/dashboard/organizations/reports-governance/news/${item.id}`} className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background">Abrir dossiê</Link>
                      {!locked ? <Link href={buildCalendarSuggestionHref(locale, item)} className="rounded-full border px-4 py-2 text-xs font-bold">Calendário</Link> : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-4">
                    {['Resumo', 'Análise', 'Ações', 'Calendário'].map((label) => {
                      const ready = readiness.includes(label);
                      return (
                        <div key={label} className={`rounded-2xl border p-3 text-xs font-semibold ${ready ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' : 'bg-muted/25 text-muted-foreground'}`}>
                          <span className="inline-flex items-center gap-2">
                            {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        </section>
      </div>
    </main>
  );
}
