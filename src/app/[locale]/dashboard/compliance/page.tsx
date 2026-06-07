'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ClipboardList, FileArchive, FileText, LayoutDashboard, Radar, ShieldCheck, Sparkles, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ExecutiveComplianceSummary from '@/components/ExecutiveComplianceSummary';
import { useAuth } from '@/hooks/useAuth';

const copy = {
  en: {
    back: 'Back to dashboard',
    badge: 'Compliance Command Center',
    title: 'Operate your AI compliance program like a control room',
    subtitle: 'Assess EU AI Act readiness, turn gaps into remediation work, collect evidence and generate audit packs without losing the executive thread.',
    executive: 'Executive cockpit',
    executiveText: 'Board-ready score, critical exposure, overdue work and readiness signal.',
    gap: 'Gap analysis engine',
    gapText: 'Run EU AI Act readiness checks and generate findings, tasks and priorities.',
    evidence: 'Evidence vault',
    evidenceText: 'Map policies, procedures and proof to articles, controls and audit needs.',
    audit: 'Audit pack builder',
    auditText: 'Package score, findings, tasks and evidence into an audit-ready export.',
    open: 'Open workspace',
    workflow: 'Program workflow',
    workflowText: 'Assess readiness, remediate gaps, prove controls, export audit evidence.',
  },
  pt: {
    back: 'Voltar ao dashboard',
    badge: 'Compliance Command Center',
    title: 'Opere o compliance de IA como uma sala de comando',
    subtitle: 'Avalie prontidão para o EU AI Act, transforme gaps em remediações, organize evidências e gere audit packs sem perder a visão executiva.',
    executive: 'Cockpit executivo',
    executiveText: 'Score, exposição crítica, tarefas em atraso e prontidão para auditoria.',
    gap: 'Motor de gap analysis',
    gapText: 'Rode avaliações EU AI Act e gere findings, tarefas e prioridades automaticamente.',
    evidence: 'Cofre de evidências',
    evidenceText: 'Mapeie políticas, procedimentos e provas para artigos, controles e auditoria.',
    audit: 'Gerador de audit pack',
    auditText: 'Empacote score, findings, tarefas e evidências em uma exportação audit-ready.',
    open: 'Abrir workspace',
    workflow: 'Fluxo do programa',
    workflowText: 'Avaliar prontidão, remediar gaps, provar controles e exportar evidências.',
  },
  es: {
    back: 'Volver al dashboard',
    badge: 'Compliance Command Center',
    title: 'Opera el compliance de IA como una sala de control',
    subtitle: 'Evalúa preparación EU AI Act, convierte brechas en remediación, organiza evidencias y genera audit packs.',
    executive: 'Cockpit ejecutivo',
    executiveText: 'Score, exposición crítica, tareas vencidas y preparación de auditoría.',
    gap: 'Motor de gap analysis',
    gapText: 'Evalúa EU AI Act y genera hallazgos, tareas y prioridades.',
    evidence: 'Bóveda de evidencias',
    evidenceText: 'Mapea políticas, procedimientos y pruebas a artículos y controles.',
    audit: 'Generador de audit pack',
    auditText: 'Empaqueta score, hallazgos, tareas y evidencias para auditoría.',
    open: 'Abrir workspace',
    workflow: 'Flujo del programa',
    workflowText: 'Evaluar preparación, remediar brechas, probar controles y exportar evidencias.',
  },
  fr: {
    back: 'Retour au dashboard',
    badge: 'Compliance Command Center',
    title: 'Pilotez la conformité IA comme une salle de contrôle',
    subtitle: 'Évaluez EU AI Act, transformez les écarts en remédiation, organisez les preuves et générez des audit packs.',
    executive: 'Cockpit exécutif',
    executiveText: 'Score, exposition critique, tâches en retard et préparation audit.',
    gap: 'Moteur de gap analysis',
    gapText: 'Évaluez EU AI Act et générez écarts, tâches et priorités.',
    evidence: 'Coffre de preuves',
    evidenceText: 'Mappez politiques, procédures et preuves aux articles et contrôles.',
    audit: 'Générateur audit pack',
    auditText: 'Préparez score, écarts, tâches et preuves pour l’audit.',
    open: 'Ouvrir workspace',
    workflow: 'Flux programme',
    workflowText: 'Évaluer, remédier, prouver les contrôles et exporter les preuves.',
  },
  it: {
    back: 'Torna alla dashboard',
    badge: 'Compliance Command Center',
    title: 'Gestisci la compliance IA come una control room',
    subtitle: 'Valuta EU AI Act, trasforma gap in remediation, organizza evidenze e genera audit pack.',
    executive: 'Cockpit executive',
    executiveText: 'Score, esposizione critica, task scaduti e audit readiness.',
    gap: 'Motore gap analysis',
    gapText: 'Valuta EU AI Act e genera finding, task e priorità.',
    evidence: 'Evidence vault',
    evidenceText: 'Mappa policy, procedure e prove ad articoli e controlli.',
    audit: 'Audit pack builder',
    auditText: 'Prepara score, finding, task ed evidenze per l’audit.',
    open: 'Apri workspace',
    workflow: 'Flusso programma',
    workflowText: 'Valutare, rimediare, provare controlli ed esportare evidenze.',
  },
  de: {
    back: 'Zurück zum Dashboard',
    badge: 'Compliance Command Center',
    title: 'Steuern Sie KI-Compliance wie einen Kontrollraum',
    subtitle: 'Bewerten Sie EU AI Act Readiness, machen Sie Lücken zu Aufgaben, sammeln Sie Nachweise und erstellen Sie Audit Packs.',
    executive: 'Executive Cockpit',
    executiveText: 'Score, kritische Exposition, überfällige Aufgaben und Audit Readiness.',
    gap: 'Gap-Analysis Engine',
    gapText: 'EU AI Act prüfen und Findings, Aufgaben und Prioritäten erstellen.',
    evidence: 'Evidence Vault',
    evidenceText: 'Richtlinien, Verfahren und Nachweise Artikeln und Kontrollen zuordnen.',
    audit: 'Audit-Pack Builder',
    auditText: 'Score, Findings, Aufgaben und Nachweise auditbereit exportieren.',
    open: 'Workspace öffnen',
    workflow: 'Programmablauf',
    workflowText: 'Readiness bewerten, Lücken schließen, Kontrollen belegen und Nachweise exportieren.',
  },
} as const;

type Locale = keyof typeof copy;

export default function ComplianceCommandCenterPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const t = copy[locale];

  const modules = [
    { title: t.executive, text: t.executiveText, icon: LayoutDashboard, href: `/${locale}/dashboard/executive`, accent: 'from-blue-500/20 to-cyan-500/5' },
    { title: t.gap, text: t.gapText, icon: ClipboardList, href: `/${locale}/dashboard/gap-analysis`, accent: 'from-violet-500/20 to-fuchsia-500/5' },
    { title: t.evidence, text: t.evidenceText, icon: FileText, href: `/${locale}/dashboard/evidence`, accent: 'from-emerald-500/20 to-teal-500/5' },
    { title: t.audit, text: t.auditText, icon: FileArchive, href: `/${locale}/dashboard/audit-pack`, accent: 'from-amber-500/20 to-orange-500/5' },
  ];

  const workflow = [
    { label: 'Assess', icon: Radar },
    { label: 'Prioritize', icon: Target },
    { label: 'Remediate', icon: Zap },
    { label: 'Evidence', icon: ShieldCheck },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.28),transparent_34rem),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.12),transparent_24rem)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="mb-6 text-white/70 hover:bg-white/5 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-blue-950/20 backdrop-blur">
          <div className="grid gap-8 p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-9">
            <div>
              <Badge className="mb-5 border-white/10 bg-white/[0.06] text-white/70">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {t.badge}
              </Badge>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{t.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/58">{t.subtitle}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => router.push(`/${locale}/dashboard/gap-analysis`)} className="bg-white text-black hover:bg-white/90">
                  Start gap analysis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard/audit-pack`)} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  Build audit pack
                </Button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">{t.workflow}</p>
              <p className="mt-2 text-sm leading-6 text-white/56">{t.workflowText}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {workflow.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Icon className="h-5 w-5 text-blue-200" />
                        <span className="text-xs text-white/35">0{index + 1}</span>
                      </div>
                      <p className="mt-4 font-medium">{step.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <ExecutiveComplianceSummary userId={user?.id} fallbackScore={0} />

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.href} className={`group overflow-hidden border-white/10 bg-gradient-to-br ${module.accent} text-white transition hover:-translate-y-1 hover:border-blue-300/40 hover:shadow-2xl hover:shadow-blue-950/20`}>
                <CardHeader>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-blue-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/35 transition group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription className="min-h-20 text-white/52">{module.text}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => router.push(module.href)} className="w-full bg-white text-black hover:bg-white/90">
                    {t.open}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
