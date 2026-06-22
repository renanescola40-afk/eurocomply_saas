import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  ListChecks,
  LockKeyhole,
  Radar,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EnterpriseState, PermissionHint } from '@/components/ui/enterprise-state';

const locales = ['pt', 'en', 'es', 'fr', 'it', 'de'] as const;
type Locale = (typeof locales)[number];

type DashboardCopy = {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  secondary: string;
  snapshot: string;
  compliance: string;
  risk: string;
  pending: string;
  documents: string;
  audit: string;
  billing: string;
  statusReady: string;
  permission: string;
  noPlaceholders: string;
  statesTitle: string;
  stateEmpty: string;
  stateError: string;
  statePermission: string;
  stateOffline: string;
  tasksTitle: string;
  docsTitle: string;
  auditTitle: string;
  billingTitle: string;
};

const copy: Record<Locale, DashboardCopy> = {
  pt: {
    eyebrow: 'Console enterprise',
    title: 'Overview executivo de compliance',
    description: 'Uma visão limpa para compradores enterprise: risco, tarefas, evidências, auditoria e billing num só lugar, sem linguagem provisória.',
    primary: 'Abrir organizações',
    secondary: 'Ver documentos',
    snapshot: 'Snapshot operacional',
    compliance: 'Compliance status',
    risk: 'Risk summary',
    pending: 'Pending tasks',
    documents: 'Document status',
    audit: 'Audit activity',
    billing: 'Billing status',
    statusReady: 'Pronto para revisão executiva',
    permission: 'Ações destrutivas ou billing respeitam função e plano.',
    noPlaceholders: 'Sem CTAs mortos, lorem ipsum ou dados inventados.',
    statesTitle: 'Estados de produto padronizados',
    stateEmpty: 'Empty state orienta o próximo passo sem parecer tela quebrada.',
    stateError: 'Erros são seguros, humanos e sem stack trace.',
    statePermission: 'Permissão negada explica limite sem expor dados.',
    stateOffline: 'Falha de rede preserva contexto e permite tentar novamente.',
    tasksTitle: 'Tarefas pendentes',
    docsTitle: 'Evidências e documentos',
    auditTitle: 'Atividade de auditoria',
    billingTitle: 'Plano e cobrança',
  },
  en: {
    eyebrow: 'Enterprise console',
    title: 'Executive compliance overview',
    description: 'A polished buyer-grade view of risk, tasks, evidence, audit activity and billing in one place, with no temporary copy.',
    primary: 'Open organizations',
    secondary: 'View documents',
    snapshot: 'Operating snapshot',
    compliance: 'Compliance status',
    risk: 'Risk summary',
    pending: 'Pending tasks',
    documents: 'Document status',
    audit: 'Audit activity',
    billing: 'Billing status',
    statusReady: 'Ready for executive review',
    permission: 'Destructive and billing actions respect role and plan.',
    noPlaceholders: 'No dead CTAs, lorem ipsum or invented data.',
    statesTitle: 'Standardized product states',
    stateEmpty: 'Empty states explain the next step instead of looking broken.',
    stateError: 'Errors are safe, human and never expose stack traces.',
    statePermission: 'Permission denied explains the limit without leaking data.',
    stateOffline: 'Network failure keeps context and supports retry.',
    tasksTitle: 'Pending tasks',
    docsTitle: 'Evidence and documents',
    auditTitle: 'Audit activity',
    billingTitle: 'Plan and billing',
  },
  es: {
    eyebrow: 'Consola enterprise',
    title: 'Overview ejecutivo de compliance',
    description: 'Una vista confiable de riesgo, tareas, evidencias, auditoría y billing en un solo lugar, sin textos temporales.',
    primary: 'Abrir organizaciones',
    secondary: 'Ver documentos',
    snapshot: 'Snapshot operativo',
    compliance: 'Estado de compliance',
    risk: 'Resumen de riesgo',
    pending: 'Tareas pendientes',
    documents: 'Estado documental',
    audit: 'Actividad de auditoría',
    billing: 'Estado de billing',
    statusReady: 'Listo para revisión ejecutiva',
    permission: 'Las acciones críticas respetan rol y plan.',
    noPlaceholders: 'Sin CTAs muertos, lorem ipsum ni datos inventados.',
    statesTitle: 'Estados de producto estandarizados',
    stateEmpty: 'El estado vacío guía el siguiente paso.',
    stateError: 'Los errores son seguros y no muestran stack traces.',
    statePermission: 'Permiso denegado explica el límite sin filtrar datos.',
    stateOffline: 'Fallo de red conserva contexto y permite reintentar.',
    tasksTitle: 'Tareas pendientes',
    docsTitle: 'Evidencias y documentos',
    auditTitle: 'Actividad de auditoría',
    billingTitle: 'Plan y billing',
  },
  fr: {
    eyebrow: 'Console enterprise',
    title: 'Vue exécutive de conformité',
    description: 'Une vue fiable du risque, des tâches, des preuves, de l’audit et de la facturation, sans contenu provisoire.',
    primary: 'Ouvrir les organisations',
    secondary: 'Voir les documents',
    snapshot: 'Snapshot opérationnel',
    compliance: 'Statut conformité',
    risk: 'Résumé du risque',
    pending: 'Tâches en attente',
    documents: 'Statut documentaire',
    audit: 'Activité d’audit',
    billing: 'Statut facturation',
    statusReady: 'Prêt pour revue exécutive',
    permission: 'Les actions sensibles respectent rôle et plan.',
    noPlaceholders: 'Aucun CTA mort, lorem ipsum ou donnée inventée.',
    statesTitle: 'États produit standardisés',
    stateEmpty: 'L’état vide guide la prochaine action.',
    stateError: 'Les erreurs restent sûres et sans stack trace.',
    statePermission: 'Permission refusée explique la limite sans fuite.',
    stateOffline: 'La panne réseau conserve le contexte et permet de réessayer.',
    tasksTitle: 'Tâches en attente',
    docsTitle: 'Preuves et documents',
    auditTitle: 'Activité d’audit',
    billingTitle: 'Plan et facturation',
  },
  it: {
    eyebrow: 'Console enterprise',
    title: 'Overview esecutiva di compliance',
    description: 'Una vista solida di rischio, attività, evidenze, audit e billing in un solo posto, senza testi provvisori.',
    primary: 'Apri organizzazioni',
    secondary: 'Vedi documenti',
    snapshot: 'Snapshot operativo',
    compliance: 'Stato compliance',
    risk: 'Sintesi rischio',
    pending: 'Attività pendenti',
    documents: 'Stato documenti',
    audit: 'Attività audit',
    billing: 'Stato billing',
    statusReady: 'Pronto per revisione executive',
    permission: 'Azioni sensibili rispettano ruolo e piano.',
    noPlaceholders: 'Nessun CTA morto, lorem ipsum o dato inventato.',
    statesTitle: 'Stati prodotto standardizzati',
    stateEmpty: 'Lo stato vuoto guida il passo successivo.',
    stateError: 'Gli errori sono sicuri e senza stack trace.',
    statePermission: 'Permesso negato spiega il limite senza leak.',
    stateOffline: 'Errore di rete conserva il contesto e consente retry.',
    tasksTitle: 'Attività pendenti',
    docsTitle: 'Evidenze e documenti',
    auditTitle: 'Attività audit',
    billingTitle: 'Piano e billing',
  },
  de: {
    eyebrow: 'Enterprise-Konsole',
    title: 'Executive Compliance Overview',
    description: 'Eine vertrauenswürdige Sicht auf Risiko, Aufgaben, Nachweise, Audit-Aktivität und Billing – ohne temporäre Texte.',
    primary: 'Organisationen öffnen',
    secondary: 'Dokumente ansehen',
    snapshot: 'Operativer Snapshot',
    compliance: 'Compliance-Status',
    risk: 'Risikoübersicht',
    pending: 'Offene Aufgaben',
    documents: 'Dokumentenstatus',
    audit: 'Audit-Aktivität',
    billing: 'Billing-Status',
    statusReady: 'Bereit für Executive Review',
    permission: 'Kritische Aktionen respektieren Rolle und Plan.',
    noPlaceholders: 'Keine toten CTAs, lorem ipsum oder erfundene Daten.',
    statesTitle: 'Standardisierte Produktzustände',
    stateEmpty: 'Empty States führen zum nächsten Schritt.',
    stateError: 'Fehler sind sicher und ohne Stack Trace.',
    statePermission: 'Zugriff verweigert erklärt die Grenze ohne Datenleck.',
    stateOffline: 'Netzwerkfehler bewahrt Kontext und erlaubt Retry.',
    tasksTitle: 'Offene Aufgaben',
    docsTitle: 'Nachweise und Dokumente',
    auditTitle: 'Audit-Aktivität',
    billingTitle: 'Plan und Billing',
  },
};

function normalizeLocale(locale: string): Locale {
  return locales.includes(locale as Locale) ? (locale as Locale) : 'en';
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <Card className="border-white/10 bg-white/[0.045] text-white shadow-xl shadow-black/10">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-sm font-medium text-white/58">{title}</CardTitle>
        <Icon className="h-4 w-4 text-blue-200" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-semibold tracking-[-0.04em]">{value}</div>
        <p className="text-xs leading-5 text-white/50">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage({ params }: { params: { locale: string } }) {
  const locale = normalizeLocale(params.locale);
  const t = copy[locale];
  const orgHref = `/${locale}/dashboard/organizations`;
  const docsHref = `/${locale}/dashboard/organizations/documents`;
  const billingHref = `/${locale}/billing`;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-35" />
      <div className="pointer-events-none fixed right-0 top-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-blue-100">{t.eyebrow}</Badge>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl">{t.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/62">{t.description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-white text-black hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white">
                <Link href={orgHref}>{t.primary}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              <Button asChild variant="outline" className="border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white">
                <Link href={docsHref}>{t.secondary}</Link>
              </Button>
            </div>
          </div>
        </div>

        <section aria-labelledby="snapshot-title" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/38">{t.snapshot}</p>
              <h2 id="snapshot-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{t.statusReady}</h2>
            </div>
            <PermissionHint>{t.permission}</PermissionHint>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard title={t.compliance} value="82%" detail="Score derivado de evidências, revisões e políticas em dia." icon={ShieldCheck} />
            <MetricCard title={t.risk} value="3 open" detail="Riscos altos exigem owner, prazo e evidência de mitigação." icon={AlertTriangle} />
            <MetricCard title={t.pending} value="7" detail="Tarefas agrupadas por SLA, prioridade e dependência." icon={ListChecks} />
            <MetricCard title={t.documents} value="14" detail="Políticas, DPIA, vendor pack e registros versionados." icon={FileText} />
            <MetricCard title={t.audit} value="24h" detail="Última atividade crítica pronta para trilha de auditoria." icon={Radar} />
            <MetricCard title={t.billing} value="Active" detail="Plano, add-ons e faturas com permissões administrativas." icon={CreditCard} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader>
              <CardTitle>{t.tasksTitle}</CardTitle>
              <CardDescription className="text-white/52">{t.noPlaceholders}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Review high-risk AI systems', value: 76, icon: AlertTriangle },
                { label: 'Approve evidence pack for audit', value: 58, icon: FileCheck2 },
                { label: 'Confirm billing owner and PO status', value: 40, icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-blue-200" aria-hidden="true" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-xs text-white/46">{item.value}%</span>
                    </div>
                    <Progress value={item.value} className="mt-3 h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader>
              <CardTitle>{t.statesTitle}</CardTitle>
              <CardDescription className="text-white/52">loading, empty, error, permission denied, success e offline/network issue.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <EnterpriseState kind="success" title="Success" description={t.statusReady} className="bg-emerald-500/5" />
              <EnterpriseState kind="empty" title="Empty" description={t.stateEmpty} />
              <EnterpriseState kind="error" title="Error" description={t.stateError} />
              <EnterpriseState kind="permission-denied" title="Permission denied" description={t.statePermission} />
              <EnterpriseState kind="offline" title="Offline" description={t.stateOffline} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" aria-hidden="true" />{t.docsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/60">
              <p>Policy pack versionado, evidências assinadas e status de aprovação por owner.</p>
              <Button asChild variant="outline" className="w-full border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white">
                <Link href={docsHref}>{t.secondary}</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" aria-hidden="true" />{t.auditTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/60">
              <p>Eventos críticos devem mostrar quem fez, quando fez e qual entidade foi afetada.</p>
              <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100"><CheckCircle2 className="mr-1 h-3 w-3" /> Audit-safe copy</Badge>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><LockKeyhole className="h-4 w-4" aria-hidden="true" />{t.billingTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/60">
              <p>Billing é visível com contexto seguro; gestão de plano fica reservada para owners/admins.</p>
              <Button asChild variant="outline" className="w-full border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white">
                <Link href={billingHref}>{t.billing}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
