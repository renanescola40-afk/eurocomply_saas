import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Bell, CheckCircle2, Clock3, Crown, FileText, Gauge, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';

const quickActions = [
  { label: 'Abrir Command Center', description: 'Entrar no painel operacional de governance e readiness.', href: '/dashboard/organizations/command-center', icon: Gauge },
  { label: 'Ver documentos', description: 'Rever evidencias, politicas e materiais de suporte.', href: '/dashboard/organizations/documents', icon: FileText },
  { label: 'Abrir notificacoes', description: 'Ver feed de atividades e proximas acoes da equipa.', href: '/notificacoes', icon: Bell },
];

export default async function RisckComplyHomePage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) redirect(`/${params.locale}/login`);

  const data = await getOrganizationDashboardData(user.id);
  if (!data) redirect(`/${params.locale}/onboarding`);

  const currentPlan = data.entitlements.plan;
  const pendingDocuments = data.summary.missingDocuments;
  const upcomingTasks = data.tasks.filter((task) => Boolean(task.dueDate)).length;

  const macroCards = [
    { label: 'Documentos pendentes', value: `${pendingDocuments}`, description: 'Itens que podem exigir revisao antes de security review, procurement ou board reporting.', icon: FileText },
    { label: 'Readiness score', value: `${data.summary.complianceScore}%`, description: 'Indicador operacional para visibilidade interna, nao uma garantia legal de compliance.', icon: CheckCircle2 },
    { label: 'Proximos prazos', value: `${upcomingTasks}`, description: 'Datas uteis para manter evidencias e tarefas sem atraso.', icon: Clock3 },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))]">
      <DashboardCommandNavigation locale={params.locale} activePage="Risck Comply" />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border bg-background/88 p-6 shadow-2xl shadow-primary/5 backdrop-blur md:p-10">
          <div className="pointer-events-none absolute right-[-6rem] top-[-6rem] h-80 w-80 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]"><Crown className="h-3.5 w-3.5" /> Cliente RISCK COMPLY</Badge>
                <Badge variant="outline" className="gap-2 rounded-full px-3 py-1 text-xs"><LockKeyhole className="h-3.5 w-3.5" /> Plano {currentPlan}</Badge>
              </div>
              <div className="space-y-3">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">Bem-vindo, {data.organization.name}.</h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">Home interna com metricas macro, links rapidos e proximas acoes para organizar AI Act readiness sem prometer resultado juridico.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full"><Link href={`/${params.locale}/dashboard/organizations/command-center`}>Entrar no Command Center <ArrowRight className="h-4 w-4" /></Link></Button>
                <Button asChild size="lg" variant="outline" className="rounded-full bg-background/70 transition hover:-translate-y-0.5 hover:shadow-lg"><Link href={`/${params.locale}/pricing`}>Comparar planos</Link></Button>
              </div>
            </div>
            <div className="rounded-3xl border bg-muted/30 p-5">
              <p className="text-sm font-medium text-muted-foreground">Workspace</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{data.organization.name}</p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-background/70 p-3"><p className="text-2xl font-bold">{data.summary.complianceScore}%</p><p className="text-xs text-muted-foreground">Readiness</p></div>
                <div className="rounded-2xl bg-background/70 p-3"><p className="text-2xl font-bold">{pendingDocuments}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
                <div className="rounded-2xl bg-background/70 p-3"><p className="text-2xl font-bold">{upcomingTasks}</p><p className="text-xs text-muted-foreground">Prazos</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {macroCards.map((card) => { const Icon = card.icon; return (
            <article key={card.label} className="rounded-3xl border bg-background/82 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4"><div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div><Sparkles className="h-4 w-4 text-muted-foreground" /></div>
              <p className="mt-5 text-sm text-muted-foreground">{card.label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
            </article>
          ); })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <article className="rounded-[2rem] border bg-foreground p-6 text-background shadow-2xl shadow-primary/10 md:p-8">
            <Badge variant="secondary" className="rounded-full">Comparativo de planos</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Planos avancados ajudam equipas a coordenar owners, paises e evidencias.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['multiplos NIFs europeus', 'convite de funcionarios', 'relatorios para lideranca', 'suporte prioritario quando contratado', 'historico de notificacoes da equipa', 'trilha colaborativa de atividades'].map((item) => <div key={item} className="rounded-2xl bg-background/10 p-4 text-sm">{item}</div>)}
            </div>
            <Button asChild className="mt-6 rounded-full bg-background text-foreground transition hover:-translate-y-0.5 hover:bg-background/90 hover:shadow-lg"><Link href={`/${params.locale}/pricing`}>Comparar planos <ArrowRight className="h-4 w-4" /></Link></Button>
          </article>

          <article className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur md:p-8">
            <div className="flex items-center gap-3 text-primary"><ShieldCheck className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">Proximo passo</p></div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Prepare a operacao para revisoes internas, procurement e expansao europeia.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Use este painel para revisar evidencias, gaps e workflows antes de ativar modulos avancados ou envolver equipas adicionais.</p>
            <div className="mt-5 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">RISCK COMPLY apoia organizacao e preparacao de evidencias. Nao substitui advogado, DPO ou compliance officer.</div>
          </article>
        </section>

        <section className="rounded-[2rem] border bg-background/82 p-5 shadow-sm backdrop-blur md:p-6">
          <div><p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Links rapidos</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Ir direto para a funcao certa</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Cada acao abre a pagina final da ferramenta, sem scroll manual e sem cliques intermediarios.</p></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => { const Icon = action.icon; return (
              <Link key={action.href} href={`/${params.locale}${action.href}`} className="group rounded-2xl border bg-muted/20 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-background p-2 text-primary"><Icon className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div>
                <p className="mt-4 font-semibold">{action.label}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{action.description}</p>
              </Link>
            ); })}
          </div>
        </section>
      </div>
    </main>
  );
}
