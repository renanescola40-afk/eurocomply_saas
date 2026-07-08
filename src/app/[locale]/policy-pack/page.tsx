import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, FileText, ShieldCheck, UsersRound } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildAiGovernanceReadiness } from '@/server/ai-governance/readiness';
import { getCurrentUser } from '@/server/queries/auth';
import { listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

const copy = {
  en: { badge: 'Policy pack generator', title: 'AI governance policy pack', subtitle: 'Generate leadership-review AI usage, employee guidance and evidence policy sections from live inventory data.', empty: 'Policy pack generation needs at least one AI system in the inventory.', inventory: 'Open inventory', print: 'Review print-ready pack', employee: 'Employee AI usage policy' },
  pt: { badge: 'Gerador de policy pack', title: 'Policy pack de governação de IA', subtitle: 'Gere políticas de uso de IA, guia para colaboradores e evidências a partir do inventário real.', empty: 'A geração do policy pack precisa de pelo menos um sistema de IA no inventário.', inventory: 'Abrir inventário', print: 'Rever pack pronto para impressão', employee: 'Política de uso de IA para colaboradores' },
  es: { badge: 'Generador de policy pack', title: 'Policy pack de gobierno de IA', subtitle: 'Genera políticas de uso de IA, guía de empleados y evidencias desde el inventario real.', empty: 'La generación del policy pack necesita al menos un sistema de IA en el inventario.', inventory: 'Abrir inventario', print: 'Revisar pack imprimible', employee: 'Política de uso de IA para empleados' },
  fr: { badge: 'Générateur policy pack', title: 'Policy pack gouvernance IA', subtitle: 'Générez politiques IA, guide employés et preuves à partir de l’inventaire réel.', empty: 'La génération du policy pack nécessite au moins un système IA.', inventory: 'Ouvrir l’inventaire', print: 'Revoir le pack imprimable', employee: 'Politique d’usage IA employés' },
  it: { badge: 'Generatore policy pack', title: 'Policy pack governance IA', subtitle: 'Genera policy IA, guida dipendenti ed evidenze dall’inventario reale.', empty: 'La generazione del policy pack richiede almeno un sistema IA.', inventory: 'Apri inventario', print: 'Rivedi pack stampabile', employee: 'Policy uso IA dipendenti' },
  de: { badge: 'Policy-Pack-Generator', title: 'KI-Governance-Policy-Pack', subtitle: 'Generieren Sie KI-Nutzungsrichtlinien, Mitarbeiterleitlinien und Nachweise aus echten Inventardaten.', empty: 'Für das Policy-Pack ist mindestens ein KI-System im Inventar erforderlich.', inventory: 'Inventar öffnen', print: 'Druckfertiges Pack prüfen', employee: 'Mitarbeiter-KI-Nutzungsrichtlinie' },
} as const;

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

export default async function PolicyPackPage({ params }: { params: Promise<{ locale: string }> }) {
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
  const highRiskSystems = systems.filter((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review');

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
              <Button asChild className="rounded-full"><Link href="#policy-pack-output">{t.print}<ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link href={`/${locale}/ai-systems`}>{t.inventory}</Link></Button>
            </div>
          </div>

          {systems.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8" />{t.empty}
              <div className="mt-5"><Button asChild className="rounded-full"><Link href={`/${locale}/ai-systems`}>{t.inventory}</Link></Button></div>
            </div>
          ) : null}

          <section id="policy-pack-output" className="mt-6 rounded-3xl border bg-background p-6 shadow-sm print:shadow-none">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{organization?.name ?? 'Organization'} · AI Governance Policy Pack</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{readiness.boardSummary}</p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full">Readiness: {readiness.score === null ? '—' : `${readiness.score}%`}</Badge>
            </div>

            <div id="employee-ai-usage-policy" className="mt-6 rounded-3xl border bg-muted/20 p-5">
              <h3 className="flex items-center gap-2 text-xl font-semibold"><UsersRound className="h-5 w-5 text-primary" />{t.employee}</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-background p-4"><h4 className="font-semibold">Approved AI use</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">Employees may only use AI systems recorded in the inventory or approved by the accountable owner.</p></div>
                <div className="rounded-2xl border bg-background p-4"><h4 className="font-semibold">Data handling</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">Personal, confidential or customer data must follow the system owner’s approved data handling rules and GDPR review status.</p></div>
                <div className="rounded-2xl border bg-background p-4"><h4 className="font-semibold">Transparency</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">When AI interacts with people or generates content, disclosure requirements must be reviewed before production use.</p></div>
                <div className="rounded-2xl border bg-background p-4"><h4 className="font-semibold">Escalation</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">Suspected malfunction, serious harm, prohibited-use signal or transparency failure must be logged in the AI incident register.</p></div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <article className="rounded-3xl border bg-muted/20 p-5"><h3 className="font-semibold">Inventory scope</h3><p className="mt-2 text-sm text-muted-foreground">{systems.length} AI system{systems.length === 1 ? '' : 's'} registered under the current organization.</p></article>
              <article className="rounded-3xl border bg-muted/20 p-5"><h3 className="font-semibold">High-risk review</h3><p className="mt-2 text-sm text-muted-foreground">{highRiskSystems.length} system{highRiskSystems.length === 1 ? '' : 's'} require high-risk or prohibited-practice review workflow.</p></article>
              <article className="rounded-3xl border bg-muted/20 p-5"><h3 className="font-semibold">Incident posture</h3><p className="mt-2 text-sm text-muted-foreground">{readiness.totals.openIncidents} open incident assessment{readiness.totals.openIncidents === 1 ? '' : 's'}.</p></article>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {readiness.gaps.map((gap) => (
                <article key={gap.id} className="rounded-2xl border bg-muted/20 p-4">
                  <Badge variant="outline" className="rounded-full">{gap.severity}</Badge>
                  <h3 className="mt-3 font-semibold">{gap.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{gap.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
