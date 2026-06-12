import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, Building2, CalendarDays, CheckCircle2, FileText, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { isPlanAtLeast } from '@/server/queries/subscription';

type IntelligenceItem = {
  id: string;
  title: string;
  category: string;
  jurisdiction: string;
  publishedAt: string;
  source: string;
  sourceType: 'Regulador' | 'Fonte oficial' | 'Instituição europeia' | 'Observatório técnico';
  author: string;
  reliability: 'Alta' | 'Média';
  impact: 'Monitorar' | 'Médio' | 'Alto' | 'Crítico';
  executiveSummary: string;
  eurocomplyAnalysis: string;
  affectedCompanies: string[];
  recommendedActions: string[];
  calendarSuggestion: string;
  premium: boolean;
};

const intelligenceItems: IntelligenceItem[] = [
  {
    id: 'eu-ai-act-high-risk-readiness',
    title: 'EU AI Act: empresas devem preparar evidências para sistemas de IA de alto risco',
    category: 'AI Act',
    jurisdiction: 'União Europeia',
    publishedAt: '2026-06-10',
    source: 'European Commission / EU AI Act policy pages',
    sourceType: 'Instituição europeia',
    author: 'EuroComply Intelligence Desk',
    reliability: 'Alta',
    impact: 'Alto',
    executiveSummary: 'Empresas que usam ou fornecem sistemas de IA com impacto em pessoas precisam manter inventário, gestão de risco, documentação, supervisão humana e logs auditáveis.',
    eurocomplyAnalysis: 'A organização deve mapear sistemas de IA, confirmar o papel contratual e anexar evidências por obrigação. O maior risco é tratar uso operacional externo como simples ferramenta interna.',
    affectedCompanies: ['SaaS B2B', 'Fintech', 'RH e recrutamento', 'Educação', 'Healthtech'],
    recommendedActions: ['Atualizar inventário de IA.', 'Classificar risco AI Act.', 'Criar revisão para sistemas com clientes.', 'Separar evidências de logs e transparência.'],
    calendarSuggestion: 'Criar tarefa de revisão do inventário de IA em 30 dias, prioridade alta.',
    premium: false,
  },
  {
    id: 'edpb-ai-gdpr-transparency',
    title: 'IA e RGPD: transparência e base legal continuam centrais para uso corporativo de modelos',
    category: 'RGPD / Dados pessoais',
    jurisdiction: 'União Europeia',
    publishedAt: '2026-06-08',
    source: 'EDPB / autoridades europeias de proteção de dados',
    sourceType: 'Regulador',
    author: 'EuroComply Intelligence Desk',
    reliability: 'Alta',
    impact: 'Médio',
    executiveSummary: 'Empresas que usam IA com dados pessoais precisam demonstrar finalidade, minimização, transparência, controle de acesso, retenção e base legal adequada.',
    eurocomplyAnalysis: 'O cliente deve revisar política de uso aceitável de IA, DPIA quando houver alto risco e fornecedores que processam dados fora da empresa.',
    affectedCompanies: ['E-commerce', 'SaaS com suporte ao cliente', 'Consultorias', 'Empresas com CRM'],
    recommendedActions: ['Revisar política interna de IA.', 'Adicionar fornecedores de IA ao registro de terceiros.', 'Criar evidência de base legal.', 'Treinar equipes que usam prompts.'],
    calendarSuggestion: 'Criar revisão de política de IA generativa e RGPD em 45 dias.',
    premium: false,
  },
  {
    id: 'nis2-dora-technology-governance',
    title: 'Governança tecnológica: NIS2 e DORA elevam pressão sobre risco de terceiros e incidentes',
    category: 'Cibersegurança / Terceiros',
    jurisdiction: 'União Europeia',
    publishedAt: '2026-06-05',
    source: 'ENISA / autoridades nacionais competentes',
    sourceType: 'Fonte oficial',
    author: 'EuroComply Intelligence Desk',
    reliability: 'Alta',
    impact: 'Alto',
    executiveSummary: 'Empresas reguladas e fornecedores críticos precisam mostrar rastreabilidade de incidentes, continuidade operacional, fornecedores essenciais e evidências de resposta.',
    eurocomplyAnalysis: 'A notícia deve acionar revisão de vendors críticos, SLAs, DPA, incident response e continuidade. O calendário inteligente deve sugerir revisão periódica.',
    affectedCompanies: ['Fintech', 'SaaS corporativo', 'Cloud providers', 'Empresas com fornecedores críticos'],
    recommendedActions: ['Marcar fornecedores críticos.', 'Validar plano de continuidade.', 'Testar resposta a incidentes.', 'Atualizar subprocessadores.'],
    calendarSuggestion: 'Criar revisão de terceiros críticos e continuidade operacional em 30 dias.',
    premium: true,
  },
];

function getImpactTone(impact: IntelligenceItem['impact']) {
  if (impact === 'Crítico') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (impact === 'Alto') return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-200';
  if (impact === 'Médio') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}

export default async function ComplianceNewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; jurisdiction?: string; category?: string; premium?: string }> }) {
  const { locale } = await params;
  const query = (await searchParams) ?? {};
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;
  const canUsePremiumNews = entitlements ? isPlanAtLeast(entitlements.plan, 'professional') : false;
  const wantsPremium = query.premium === '1';
  const term = (query.q ?? '').toLowerCase().trim();
  const jurisdiction = query.jurisdiction ?? 'all';
  const category = query.category ?? 'all';

  const visibleNews = intelligenceItems.filter((item) => !item.premium || canUsePremiumNews || wantsPremium);
  const filtered = visibleNews.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.jurisdiction} ${item.executiveSummary} ${item.eurocomplyAnalysis}`.toLowerCase();
    return (!term || haystack.includes(term)) && (jurisdiction === 'all' || item.jurisdiction === jurisdiction) && (category === 'all' || item.category === category);
  });
  const jurisdictions = Array.from(new Set(intelligenceItems.map((item) => item.jurisdiction)));
  const categories = Array.from(new Set(intelligenceItems.map((item) => item.category)));
  const lockedCount = intelligenceItems.filter((item) => item.premium && !canUsePremiumNews).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.42))] text-foreground">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <Link href={`/${locale}/dashboard/organizations/reports-governance`} className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">← Reports & Governance</Link>

        <section className="rounded-[2rem] border bg-background/92 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">EuroComply Intelligence</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.045em] md:text-6xl">Jornal IA para leis, tecnologia e riscos que afetam empresas.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">Monitoramento editorial preparado para evoluir para ingestão 24/7: fontes oficiais, reguladores e referências técnicas com análise EuroComply, impacto empresarial e sugestão para calendário inteligente.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/dashboard/organizations/add-ons`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"><Sparkles className="h-4 w-4" /> Ver add-on Notícias Premium</Link>
            <Link href={`/${locale}/calendario-compliance`} className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition hover:bg-muted"><CalendarDays className="h-4 w-4" /> Abrir calendário inteligente</Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[{ label: 'Dossiês', value: intelligenceItems.length.toString(), icon: FileText }, { label: 'Impacto alto', value: intelligenceItems.filter((item) => item.impact === 'Alto' || item.impact === 'Crítico').length.toString(), icon: ShieldCheck }, { label: 'Calendário', value: intelligenceItems.length.toString(), icon: CalendarDays }, { label: 'Fontes oficiais', value: intelligenceItems.filter((item) => item.sourceType !== 'Observatório técnico').length.toString(), icon: Building2 }].map((metric) => {
            const Icon = metric.icon;
            return <article key={metric.label} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{metric.label}</p><Icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-3xl font-semibold">{metric.value}</p></article>;
          })}
        </section>

        {wantsPremium && !canUsePremiumNews ? <UpgradeRequiredCard locale={locale} title="Notícias Premium ainda não estão ativas" description={`O plano básico mostra dossiês essenciais. ${lockedCount} dossiês premium ficam em preview até ativar Notícias Premium ou plano superior.`} ctaLabel="Ver add-ons" /> : null}

        <form className="grid gap-3 rounded-[1.5rem] border bg-background/90 p-5 shadow-sm md:grid-cols-4" action={`/${locale}/dashboard/organizations/reports-governance/news`}>
          <input name="q" defaultValue={query.q ?? ''} placeholder="Buscar tema, lei ou risco" className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          <select name="jurisdiction" defaultValue={jurisdiction} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"><option value="all">Todas as jurisdições</option>{jurisdictions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select name="category" defaultValue={category} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"><option value="all">Todas as categorias</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button className="rounded-2xl bg-foreground px-4 py-3 text-sm font-bold text-background transition hover:shadow-lg" type="submit">Filtrar inteligência</button>
          {wantsPremium ? <input type="hidden" name="premium" value="1" /> : null}
        </form>

        <section className="grid gap-5">
          {filtered.map((item) => {
            const locked = item.premium && !canUsePremiumNews;
            return (
              <article key={item.id} className="rounded-[2rem] border bg-background/92 p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap gap-2"><span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.category}</span><span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">{item.jurisdiction}</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getImpactTone(item.impact)}`}>Impacto: {item.impact}</span>{item.premium ? <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Premium</span> : null}</div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">{item.executiveSummary}</p>
                <div className="mt-5 grid gap-3 text-sm text-muted-foreground md:grid-cols-4"><p className="flex items-center gap-2"><FileText className="h-4 w-4" /> {item.source}</p><p className="flex items-center gap-2"><UserRound className="h-4 w-4" /> {item.author}</p><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {formatDate(item.publishedAt, locale)}</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {item.reliability}</p></div>
                {locked ? <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">Dossiê premium em preview. Ative Notícias Premium para ver análise completa e ações detalhadas.</div> : <div className="mt-6 grid gap-4 lg:grid-cols-2"><section className="rounded-[1.5rem] border bg-muted/20 p-5"><h3 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Análise EuroComply</h3><p className="mt-3 text-sm leading-7">{item.eurocomplyAnalysis}</p><p className="mt-4 rounded-2xl border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">Nota editorial: o EuroComply mantém metadados, referência e análise própria. Conteúdo completo só deve ser armazenado para fontes oficiais, abertas ou licenciadas.</p></section><section className="rounded-[1.5rem] border bg-muted/20 p-5"><h3 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Calendário inteligente</h3><p className="mt-3 text-sm leading-6">{item.calendarSuggestion}</p><Link href={`/${locale}/calendario-compliance`} className="mt-4 inline-flex rounded-full border px-4 py-2 text-xs font-bold transition hover:bg-background">Abrir calendário</Link></section></div>}
                {!locked ? <div className="mt-5 grid gap-4 lg:grid-cols-2"><section><h3 className="text-sm font-semibold">Empresas afetadas</h3><div className="mt-3 flex flex-wrap gap-2">{item.affectedCompanies.map((company) => <span key={company} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{company}</span>)}</div></section><section><h3 className="text-sm font-semibold">Ações recomendadas</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{item.recommendedActions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {action}</li>)}</ul></section></div> : null}
              </article>
            );
          })}
        </section>

        {filtered.length === 0 ? <p className="rounded-[1.5rem] border border-dashed bg-background/80 p-8 text-center text-sm font-semibold text-muted-foreground">Nenhum dossiê encontrado com estes filtros.</p> : null}
      </div>
    </main>
  );
}
