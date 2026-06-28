import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Download, FileCheck2, FileText } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildAiGovernanceReadiness } from '@/server/ai-governance/readiness';
import { getCurrentUser } from '@/server/queries/auth';
import { listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

const copy = {
  en: { badge: 'Document generator', title: 'AI compliance document generator', subtitle: 'Turn live AI governance data into export-ready board, audit, policy and action-plan outputs.', empty: 'Documents will become richer after you register AI systems and classify risk exposure.', inventory: 'Open inventory', print: 'Open print-ready report' },
  pt: { badge: 'Gerador de documentos', title: 'Gerador de documentos de AI compliance', subtitle: 'Transforme dados reais de governação de IA em relatórios para board, auditoria, políticas e planos de ação.', empty: 'Os documentos ficam mais completos depois de registar sistemas de IA e classificar riscos.', inventory: 'Abrir inventário', print: 'Abrir relatório pronto para impressão' },
  es: { badge: 'Generador de documentos', title: 'Generador de documentos AI compliance', subtitle: 'Convierte datos reales de gobierno de IA en outputs para board, auditoría, políticas y plan de acción.', empty: 'Los documentos serán más completos tras registrar sistemas de IA y clasificar riesgos.', inventory: 'Abrir inventario', print: 'Abrir informe imprimible' },
  fr: { badge: 'Générateur documents', title: 'Générateur documents AI compliance', subtitle: 'Transformez les données réelles de gouvernance IA en outputs board, audit, politiques et actions.', empty: 'Les documents seront plus complets après l’inventaire et la classification.', inventory: 'Ouvrir l’inventaire', print: 'Ouvrir le rapport imprimable' },
  it: { badge: 'Generatore documenti', title: 'Generatore documenti AI compliance', subtitle: 'Trasforma dati reali di governance IA in output board, audit, policy e action plan.', empty: 'I documenti saranno più completi dopo inventario e classificazione rischi.', inventory: 'Apri inventario', print: 'Apri report stampabile' },
  de: { badge: 'Dokumentgenerator', title: 'AI-Compliance-Dokumentgenerator', subtitle: 'Verwandeln Sie echte KI-Governance-Daten in Board-, Audit-, Policy- und Aktionsplan-Outputs.', empty: 'Dokumente werden nach Inventar und Risikoklassifizierung vollständiger.', inventory: 'Inventar öffnen', print: 'Druckfertigen Bericht öffnen' },
} as const;

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

export default async function DocumentGeneratorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getCopy(locale);
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const [systems, incidents] = organization
    ? await Promise.all([listAiSystems(organization.id), listAiIncidents(organization.id)])
    : [[], []];
  const readiness = buildAiGovernanceReadiness({ locale, systems, incidents });
  const hasInventory = systems.length > 0;
  const documents = [
    { title: 'Board / audit summary', description: readiness.boardSummary, href: '/dashboard/organizations/reports-governance', status: hasInventory ? 'ready' : 'needs inventory' },
    { title: 'Evidence pack cover', description: 'Structured audit snapshot linked to inventory, incidents, gaps and evidence routes.', href: '/audit-pack', status: hasInventory ? 'ready' : 'needs inventory' },
    { title: 'Gap analysis', description: `${readiness.gaps.length} governance gap${readiness.gaps.length === 1 ? '' : 's'} available from current workspace data.`, href: '/dashboard/gap-analysis', status: hasInventory ? 'ready' : 'needs inventory' },
    { title: 'Action plan', description: `${readiness.actionPlan.length} role-based action${readiness.actionPlan.length === 1 ? '' : 's'} prepared for owner/admin/member/viewer workflow.`, href: '/aprovacoes', status: 'ready' },
    { title: 'Policy pack', description: 'Employee AI usage policy, transparency guidance and escalation rules.', href: '/policy-pack', status: hasInventory ? 'ready' : 'needs inventory' },
    { title: 'Vendor assessment memo', description: `${readiness.totals.vendorLinkedSystems} AI system${readiness.totals.vendorLinkedSystems === 1 ? '' : 's'} currently include vendor/model context.`, href: '/vendor-assurance', status: hasInventory ? 'ready' : 'needs inventory' },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage="AI Governance" />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Badge variant="outline" className="rounded-full"><FileText className="mr-1 h-3.5 w-3.5" />{t.badge}</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full"><Link href="#generated-report">{t.print}<Download className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link href={`/${locale}/ai-systems`}>{t.inventory}</Link></Button>
            </div>
          </div>

          {!hasInventory ? (
            <div className="mt-6 rounded-3xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <FileCheck2 className="mx-auto mb-3 h-8 w-8" />{t.empty}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => (
              <Link key={document.title} href={`/${locale}${document.href}`} className="group rounded-3xl border bg-background p-5 shadow-sm transition hover:border-primary/40 hover:bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold leading-6">{document.title}</h2>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{document.description}</p>
                <Badge variant="outline" className="mt-4 rounded-full">{document.status}</Badge>
              </Link>
            ))}
          </div>

          <section id="generated-report" className="mt-6 rounded-3xl border bg-background p-6 shadow-sm print:shadow-none">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{organization?.name ?? 'Organization'} · AI Compliance Report</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{readiness.boardSummary}</p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full">Readiness: {readiness.score === null ? '—' : `${readiness.score}%`}</Badge>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {readiness.gaps.map((gap) => (
                <article key={gap.id} className="rounded-2xl border bg-muted/20 p-4"><Badge variant="outline" className="rounded-full">{gap.severity}</Badge><h3 className="mt-3 font-semibold">{gap.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{gap.action}</p></article>
              ))}
              {readiness.actionPlan.map((action) => (
                <article key={action.id} className="rounded-2xl border bg-muted/20 p-4"><Badge variant="outline" className="rounded-full">{action.ownerRole}</Badge><h3 className="mt-3 font-semibold">{action.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p></article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
