import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Download, FileCheck2, FileText } from 'lucide-react';
import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildAiGovernanceReadiness } from '@/server/ai-governance/readiness';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { isPlanAtLeast } from '@/server/queries/subscription';

const copy = {
  en: { badge: 'Document generator', title: 'AI governance document generator', subtitle: 'Turn live AI governance data into review packages, policy drafts and action-plan outputs.', empty: 'Documents will become richer after you register AI systems and classify risk exposure.', inventory: 'Open inventory', print: 'Open printable report' },
  pt: { badge: 'Gerador de documentos', title: 'Gerador de documentos de governanca de IA', subtitle: 'Transforme dados reais de governanca de IA em pacotes de revisao, politicas e planos de acao.', empty: 'Os documentos ficam mais completos depois de registar sistemas de IA e classificar riscos.', inventory: 'Abrir inventario', print: 'Abrir relatorio imprimivel' },
  es: { badge: 'Generador de documentos', title: 'Generador de documentos de gobernanza de IA', subtitle: 'Convierte datos reales de gobierno de IA en paquetes de revision, politicas y plan de accion.', empty: 'Los documentos seran mas completos tras registrar sistemas de IA y clasificar riesgos.', inventory: 'Abrir inventario', print: 'Abrir informe imprimible' },
  fr: { badge: 'Generateur documents', title: 'Generateur de documents de gouvernance IA', subtitle: 'Transformez les donnees de gouvernance IA en dossiers de revue, politiques et actions.', empty: 'Les documents seront plus complets apres inventaire et classification.', inventory: 'Ouvrir inventaire', print: 'Ouvrir le rapport imprimable' },
  it: { badge: 'Generatore documenti', title: 'Generatore documenti governance IA', subtitle: 'Trasforma dati di governance IA in pacchetti di revisione, policy e action plan.', empty: 'I documenti saranno piu completi dopo inventario e classificazione rischi.', inventory: 'Apri inventario', print: 'Apri report stampabile' },
  de: { badge: 'Dokumentgenerator', title: 'KI-Governance-Dokumentgenerator', subtitle: 'Verwandeln Sie KI-Governance-Daten in Review-Pakete, Policy-Entwurfe und Aktionsplane.', empty: 'Dokumente werden nach Inventar und Risikoklassifizierung vollstandiger.', inventory: 'Inventar offnen', print: 'Druckbericht offnen' },
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
  const [systems, incidents, entitlements] = organization
    ? await Promise.all([listAiSystems(organization.id), listAiIncidents(organization.id), getOrganizationEntitlements(organization.id)])
    : [[], [], null];
  const canViewExecutiveReports = entitlements ? isPlanAtLeast(entitlements.plan, 'business') : false;
  const readiness = buildAiGovernanceReadiness({ locale, systems, incidents });
  const hasInventory = systems.length > 0;
  const documents = [
    { title: 'Board / review summary', description: readiness.boardSummary, href: '/dashboard/organizations/reports-governance', status: hasInventory ? 'ready' : 'needs inventory' },
    { title: 'Evidence pack cover', description: 'Structured review snapshot linked to inventory, incidents, gaps and evidence routes.', href: '/audit-pack', status: hasInventory ? 'ready' : 'needs inventory' },
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
              {canViewExecutiveReports ? (
                <Button asChild className="rounded-full"><Link href="#generated-report">{t.print}<Download className="h-4 w-4" /></Link></Button>
              ) : (
                <Button asChild className="rounded-full"><Link href={`/${locale}/pricing`}>Upgrade to print report<Download className="h-4 w-4" /></Link></Button>
              )}
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

          {canViewExecutiveReports ? (
            <section id="generated-report" className="mt-6 rounded-3xl border bg-background p-6 shadow-sm print:shadow-none">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{organization?.name ?? 'Organization'} · AI Governance Report</h2>
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
          ) : (
            <div id="generated-report" className="mt-6">
              <UpgradeRequiredCard
                locale={locale}
                requiredPlan="Business"
                title="Printable AI governance reports require Business"
                description="Board and review reports include executive summaries, gap analysis and action plans. Upgrade to Business to unlock printable evidence packs."
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
