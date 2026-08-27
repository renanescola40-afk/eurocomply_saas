import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CalendarDays, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';

import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { listPublishedIntelligenceItems, type IntelligenceImpact } from '@/server/queries/intelligence';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { isPlanAtLeast } from '@/server/queries/subscription';

function getImpactTone(impact: IntelligenceImpact) {
  if (impact === 'Crítico') return 'border-rose-300/20 bg-rose-300/[0.07] text-rose-100';
  if (impact === 'Alto') return 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100';
  if (impact === 'Médio') return 'border-amber-200/15 bg-amber-200/[0.045] text-amber-100/80';
  return 'border-white/[0.075] bg-white/[0.025] text-white/48';
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

const secondaryLink = 'inline-flex min-h-9 items-center justify-center rounded-lg border border-white/[0.085] bg-white/[0.025] px-3 text-xs font-semibold text-white/62 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60';

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
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-5">
        <header className="border-b border-white/[0.065] pb-5">
          <Link href={`/${locale}/dashboard/organizations/reports-governance/news`} className="text-xs font-medium text-white/42 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">← Voltar à Inteligência Regulatória</Link>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/65">Painel editorial</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">Auditoria do RISCK COMPLY Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">Valide a qualidade editorial dos dossiês publicados: impacto, entitlement, fonte verificável, análise própria, ações recomendadas e disponibilidade para calendário.</p>
        </header>

        <section className="grid overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] sm:grid-cols-2 lg:grid-cols-4" aria-label="Editorial summary">
          {[
            { label: 'Dossiês publicados', value: items.length.toString(), icon: FileText },
            { label: 'Premium', value: premiumCount.toString(), icon: ShieldCheck },
            { label: 'Impacto alto', value: highImpactCount.toString(), icon: AlertTriangle },
            { label: 'Prontos calendário', value: calendarReadyCount.toString(), icon: CalendarDays },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return <article key={metric.label} className={`p-5 ${index > 0 ? 'border-t border-white/[0.055] sm:border-l sm:border-t-0' : ''}`}><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">{metric.label}</p><Icon className="h-4 w-4 text-emerald-200/65" aria-hidden="true" /></div><p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{metric.value}</p></article>;
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] lg:self-start" aria-labelledby="monitored-sources-title">
            <div className="border-b border-white/[0.055] px-5 py-4"><h2 id="monitored-sources-title" className="text-sm font-semibold text-white/88">Fontes monitorizadas</h2></div>
            <div className="divide-y divide-white/[0.055]">{uniqueSources.map((source) => <div key={source} className="px-5 py-3 text-sm text-white/45">{source}</div>)}</div>
            <div className="border-t border-white/[0.055] px-5 py-4 text-xs leading-5 text-white/32">Regra editorial: conteúdo completo só deve ser armazenado para fontes oficiais, abertas ou licenciadas. Para mídia comum, manter metadados, referência e análise própria.</div>
          </aside>

          <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-label="Editorial dossiers">
            {items.length ? <div className="divide-y divide-white/[0.055]">{items.map((item) => {
              const locked = item.premium && !canUsePremiumNews;
              const readiness = [
                item.executiveSummary ? 'Resumo' : null,
                item.risckComplyAnalysis ? 'Análise' : null,
                item.recommendedActions.length ? 'Ações' : null,
                item.calendarSuggestion ? 'Calendário' : null,
              ].filter(Boolean);

              return (
                <article key={item.id} className="px-5 py-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em]">
                        <span className="rounded-lg border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-white/42">{item.category}</span>
                        <span className={`rounded-lg border px-2.5 py-1 ${getImpactTone(item.impact)}`}>{item.impact}</span>
                        {item.premium ? <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-emerald-100">Premium</span> : null}
                        {locked ? <span className="rounded-lg border border-amber-300/20 bg-amber-300/[0.055] px-2.5 py-1 text-amber-100">Preview no plano atual</span> : null}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-white/88">{item.title}</h2>
                      <p className="mt-1 text-xs text-white/34">{item.source} · {item.author}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/${locale}/dashboard/organizations/reports-governance/news/${item.id}`} className={secondaryLink}>Abrir dossiê</Link>
                      {!locked ? <Link href={buildCalendarSuggestionHref(locale, item)} className={secondaryLink}>Calendário</Link> : null}
                    </div>
                  </div>

                  <div className="mt-4 grid overflow-hidden rounded-lg border border-white/[0.065] sm:grid-cols-2 xl:grid-cols-4">
                    {['Resumo', 'Análise', 'Ações', 'Calendário'].map((label, index) => {
                      const ready = readiness.includes(label);
                      return (
                        <div key={label} className={`flex items-center gap-2 px-3 py-3 text-xs font-medium ${index > 0 ? 'border-t border-white/[0.055] sm:border-l sm:border-t-0' : ''} ${ready ? 'text-emerald-100' : 'text-white/32'}`}>
                          {ready ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200/65" aria-hidden="true" /> : <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}</div> : <p className="px-5 py-8 text-sm text-white/38">Nenhum dossiê publicado.</p>}
          </section>
        </section>
      </div>
    </main>
  );
}
