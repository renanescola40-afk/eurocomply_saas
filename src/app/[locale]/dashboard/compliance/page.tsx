'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileArchive, FileText, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ExecutiveComplianceSummary from '@/components/ExecutiveComplianceSummary';
import { useAuth } from '@/hooks/useAuth';

const copy = {
  en: {
    back: 'Back to dashboard',
    badge: 'Compliance Command Center',
    title: 'Run your AI compliance program from one place',
    subtitle: 'Assess readiness, manage remediation work, register evidence and generate audit packs for the EU AI Act.',
    executive: 'Executive Dashboard',
    executiveText: 'Live compliance score, critical findings, tasks and audit readiness.',
    gap: 'Gap Analysis',
    gapText: 'Assess EU AI Act readiness and automatically create findings and tasks.',
    evidence: 'Evidence Vault',
    evidenceText: 'Register policies, procedures and proof mapped to EU AI Act articles.',
    audit: 'Audit Pack',
    auditText: 'Generate an audit-ready export from score, findings, tasks and evidence.',
    open: 'Open',
  },
  pt: {
    back: 'Voltar ao dashboard',
    badge: 'Compliance Command Center',
    title: 'Gerencie seu programa de compliance de IA em um só lugar',
    subtitle: 'Avalie prontidão, acompanhe remediações, registre evidências e gere audit packs para o EU AI Act.',
    executive: 'Dashboard Executivo',
    executiveText: 'Score, findings críticos, tarefas e prontidão de auditoria em tempo real.',
    gap: 'Gap Analysis',
    gapText: 'Avalie a prontidão EU AI Act e crie findings e tarefas automaticamente.',
    evidence: 'Evidence Vault',
    evidenceText: 'Registre políticas, procedimentos e provas vinculadas aos artigos do EU AI Act.',
    audit: 'Audit Pack',
    auditText: 'Gere um pacote de auditoria com score, findings, tarefas e evidências.',
    open: 'Abrir',
  },
  es: {
    back: 'Volver al dashboard',
    badge: 'Compliance Command Center',
    title: 'Gestiona tu programa de compliance de IA en un solo lugar',
    subtitle: 'Evalúa preparación, remediaciones, evidencias y audit packs para el EU AI Act.',
    executive: 'Dashboard Ejecutivo',
    executiveText: 'Score, hallazgos críticos, tareas y preparación de auditoría.',
    gap: 'Gap Analysis',
    gapText: 'Evalúa preparación EU AI Act y crea hallazgos y tareas automáticamente.',
    evidence: 'Evidence Vault',
    evidenceText: 'Registra políticas, procedimientos y pruebas vinculadas a artículos.',
    audit: 'Audit Pack',
    auditText: 'Genera un paquete de auditoría con score, hallazgos, tareas y evidencias.',
    open: 'Abrir',
  },
  fr: {
    back: 'Retour au dashboard',
    badge: 'Compliance Command Center',
    title: 'Pilotez votre conformité IA depuis un seul endroit',
    subtitle: 'Évaluez la préparation, les remédiations, les preuves et les audit packs EU AI Act.',
    executive: 'Dashboard Exécutif',
    executiveText: 'Score, écarts critiques, tâches et préparation audit.',
    gap: 'Gap Analysis',
    gapText: 'Évaluez la préparation EU AI Act et créez écarts/tâches automatiquement.',
    evidence: 'Evidence Vault',
    evidenceText: 'Enregistrez politiques, procédures et preuves liées aux articles.',
    audit: 'Audit Pack',
    auditText: 'Générez un pack audit avec score, écarts, tâches et preuves.',
    open: 'Ouvrir',
  },
  it: {
    back: 'Torna alla dashboard',
    badge: 'Compliance Command Center',
    title: 'Gestisci la compliance IA da un unico posto',
    subtitle: 'Valuta readiness, remediation, evidenze e audit pack per EU AI Act.',
    executive: 'Dashboard Executive',
    executiveText: 'Score, finding critici, task e audit readiness.',
    gap: 'Gap Analysis',
    gapText: 'Valuta EU AI Act readiness e crea finding/task automaticamente.',
    evidence: 'Evidence Vault',
    evidenceText: 'Registra policy, procedure e prove collegate agli articoli.',
    audit: 'Audit Pack',
    auditText: 'Genera un audit pack con score, finding, task ed evidenze.',
    open: 'Apri',
  },
  de: {
    back: 'Zurück zum Dashboard',
    badge: 'Compliance Command Center',
    title: 'Steuern Sie Ihr KI-Compliance-Programm zentral',
    subtitle: 'Bewertung, Remediation, Nachweise und Audit Packs für den EU AI Act.',
    executive: 'Executive Dashboard',
    executiveText: 'Score, kritische Findings, Aufgaben und Audit Readiness.',
    gap: 'Gap Analysis',
    gapText: 'EU-AI-Act-Readiness bewerten und Findings/Aufgaben erstellen.',
    evidence: 'Evidence Vault',
    evidenceText: 'Richtlinien, Verfahren und Nachweise Artikeln zuordnen.',
    audit: 'Audit Pack',
    auditText: 'Audit-Paket mit Score, Findings, Aufgaben und Nachweisen erstellen.',
    open: 'Öffnen',
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
    { title: t.executive, text: t.executiveText, icon: LayoutDashboard, href: `/${locale}/dashboard/executive` },
    { title: t.gap, text: t.gapText, icon: ClipboardList, href: `/${locale}/dashboard/gap-analysis` },
    { title: t.evidence, text: t.evidenceText, icon: FileText, href: `/${locale}/dashboard/evidence` },
    { title: t.audit, text: t.auditText, icon: FileArchive, href: `/${locale}/dashboard/audit-pack` },
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.24),transparent_34rem)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="mb-6 text-white/70 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>

        <section className="mb-8 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-blue-950/20">
          <Badge className="mb-4 border-white/10 bg-white/[0.06] text-white/70">{t.badge}</Badge>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{t.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/58">{t.subtitle}</p>
            </div>
            <ShieldCheck className="hidden h-14 w-14 text-blue-200/70 lg:block" />
          </div>
        </section>

        <ExecutiveComplianceSummary userId={user?.id} fallbackScore={0} />

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.href} className="border-white/10 bg-white/[0.045] text-white">
                <CardHeader>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription className="min-h-16 text-white/48">{module.text}</CardDescription>
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
