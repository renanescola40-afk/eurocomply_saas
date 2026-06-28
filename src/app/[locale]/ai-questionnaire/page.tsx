import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ClipboardList, Globe2, ShieldCheck } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildAiGovernanceReadiness } from '@/server/ai-governance/readiness';
import { getCurrentUser } from '@/server/queries/auth';
import { listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

const copy = {
  en: { badge: 'AI usage questionnaire', title: 'AI Act intake questionnaire', subtitle: 'A structured intake that feeds the inventory, risk classification, policy pack and evidence workflow.', start: 'Register AI system', inventory: 'Open inventory', empty: 'No AI systems are registered yet. Start by registering the first AI use case.', context: 'Country-aware context' },
  pt: { badge: 'Questionário de uso de IA', title: 'Questionário de intake AI Act', subtitle: 'Um intake estruturado que alimenta inventário, classificação de risco, policy pack e evidências.', start: 'Registar sistema de IA', inventory: 'Abrir inventário', empty: 'Ainda não há sistemas de IA registados. Comece por registar o primeiro caso de uso.', context: 'Contexto por país' },
  es: { badge: 'Cuestionario de uso de IA', title: 'Cuestionario de intake AI Act', subtitle: 'Un intake estructurado que alimenta inventario, clasificación de riesgo, policy pack y evidencias.', start: 'Registrar sistema de IA', inventory: 'Abrir inventario', empty: 'Todavía no hay sistemas de IA registrados. Empieza registrando el primer caso de uso.', context: 'Contexto por país' },
  fr: { badge: 'Questionnaire usage IA', title: 'Questionnaire intake AI Act', subtitle: 'Un intake structuré qui alimente inventaire, classification de risque, policy pack et preuves.', start: 'Enregistrer un système IA', inventory: 'Ouvrir l’inventaire', empty: 'Aucun système IA enregistré. Commencez par le premier cas d’usage.', context: 'Contexte par pays' },
  it: { badge: 'Questionario uso IA', title: 'Questionario intake AI Act', subtitle: 'Un intake strutturato che alimenta inventario, classificazione rischio, policy pack ed evidenze.', start: 'Registra sistema IA', inventory: 'Apri inventario', empty: 'Nessun sistema IA registrato. Inizia registrando il primo caso d’uso.', context: 'Contesto per paese' },
  de: { badge: 'KI-Nutzungsfragebogen', title: 'AI-Act-Intake-Fragebogen', subtitle: 'Ein strukturierter Intake für Inventar, Risikoklassifizierung, Policy-Pack und Nachweise.', start: 'KI-System erfassen', inventory: 'Inventar öffnen', empty: 'Noch keine KI-Systeme erfasst. Beginnen Sie mit dem ersten Anwendungsfall.', context: 'Länderkontext' },
} as const;

const questionnaireSections = [
  { title: '1. Purpose and business owner', body: 'What is the AI system used for, which business process depends on it and who is accountable for approval?' },
  { title: '2. Organization role', body: 'Confirm whether the organization is acting as provider, deployer, importer, distributor or another actor.' },
  { title: '3. EU AI Act risk domain', body: 'Select the operational domain: employment, education, essential services, biometrics, critical infrastructure or lower-risk productivity use.' },
  { title: '4. Data and people impact', body: 'Record personal data, human interaction, automated decision support and affected groups.' },
  { title: '5. Transparency and content', body: 'Capture generated content, chatbot/user interaction and disclosure needs.' },
  { title: '6. Vendor and model evidence', body: 'Attach vendor documentation, subprocessors, model provider context and assurance gaps.' },
  { title: '7. Country and authority context', body: 'Record operating countries and local language expectations without pretending that authority reporting is complete before review.' },
  { title: '8. Action plan and evidence pack', body: 'Turn answers into classification, missing evidence, owner tasks and export-ready board/audit outputs.' },
];

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

export default async function AiQuestionnairePage({ params }: { params: Promise<{ locale: string }> }) {
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage="AI Governance" />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Badge variant="outline" className="rounded-full"><ClipboardList className="mr-1 h-3.5 w-3.5" />{t.badge}</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full"><Link href={`/${locale}/ai-systems#product-map`}>{t.inventory}<ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link href={`/${locale}/ai-systems`}>{t.start}</Link></Button>
            </div>
          </div>

          <div id="country-aware-context" className="mt-6 rounded-3xl border bg-muted/20 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold"><Globe2 className="mr-2 inline h-4 w-4" />{t.context}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{readiness.countryContext.regionLabel} · {readiness.countryContext.language}</p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full">{readiness.countryContext.locale}</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {readiness.countryContext.guidance.map((item) => <div key={item} className="rounded-2xl border bg-background p-4 text-sm leading-6 text-muted-foreground">{item}</div>)}
            </div>
          </div>

          {systems.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8" />
              {t.empty}
              <div className="mt-5"><Button asChild className="rounded-full"><Link href={`/${locale}/ai-systems`}>{t.start}</Link></Button></div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {questionnaireSections.map((section) => (
              <article key={section.title} className="rounded-3xl border bg-background p-5 shadow-sm">
                <h2 className="font-semibold leading-6">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
