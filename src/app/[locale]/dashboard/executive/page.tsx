'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ExecutiveComplianceSummary from '@/components/ExecutiveComplianceSummary';
import { useAuth } from '@/hooks/useAuth';

const copy = {
  en: {
    back: 'Back to dashboard',
    badge: 'Executive Compliance Dashboard',
    title: 'Audit readiness command center',
    subtitle: 'Live executive view powered by your latest Gap Analysis, open findings and remediation tasks.',
    next: 'Next recommended step',
    nextBody: 'Run or update the Gap Analysis to refresh compliance score, findings and remediation tasks.',
  },
  pt: {
    back: 'Voltar ao dashboard',
    badge: 'Dashboard Executivo de Compliance',
    title: 'Central de prontidão para auditoria',
    subtitle: 'Visão executiva alimentada pelo último Gap Analysis, findings abertos e tarefas de remediação.',
    next: 'Próximo passo recomendado',
    nextBody: 'Execute ou atualize o Gap Analysis para atualizar score, findings e tarefas de remediação.',
  },
  es: {
    back: 'Volver al panel',
    badge: 'Dashboard Ejecutivo de Cumplimiento',
    title: 'Centro de preparación para auditoría',
    subtitle: 'Vista ejecutiva basada en el último Gap Analysis, hallazgos abiertos y tareas de remediación.',
    next: 'Siguiente paso recomendado',
    nextBody: 'Ejecuta o actualiza el Gap Analysis para refrescar score, hallazgos y tareas.',
  },
  fr: {
    back: 'Retour au tableau de bord',
    badge: 'Tableau de bord exécutif conformité',
    title: 'Centre de préparation audit',
    subtitle: 'Vue exécutive basée sur le dernier Gap Analysis, les écarts ouverts et les tâches de remédiation.',
    next: 'Prochaine étape recommandée',
    nextBody: 'Lancez ou mettez à jour le Gap Analysis pour actualiser score, écarts et tâches.',
  },
  it: {
    back: 'Torna alla dashboard',
    badge: 'Dashboard Executive Compliance',
    title: 'Centro di audit readiness',
    subtitle: 'Vista executive basata sull’ultimo Gap Analysis, finding aperti e attività di remediation.',
    next: 'Prossimo passo consigliato',
    nextBody: 'Esegui o aggiorna il Gap Analysis per aggiornare score, finding e attività.',
  },
  de: {
    back: 'Zurück zum Dashboard',
    badge: 'Executive Compliance Dashboard',
    title: 'Audit-Readiness-Kommandozentrale',
    subtitle: 'Executive-Ansicht basierend auf dem letzten Gap Analysis, offenen Findings und Remediation-Aufgaben.',
    next: 'Empfohlener nächster Schritt',
    nextBody: 'Führen Sie das Gap Analysis aus oder aktualisieren Sie es, um Score, Findings und Aufgaben zu erneuern.',
  },
} as const;

export default function ExecutiveDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as keyof typeof copy) || 'pt';
  const t = copy[locale] || copy.pt;
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.24),transparent_34rem)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="mb-6 text-white/70 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>

        <section className="mb-8 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-blue-950/20">
          <Badge className="mb-4 border-white/10 bg-white/[0.06] text-white/70">{t.badge}</Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{t.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/58">{t.subtitle}</p>
        </section>

        <ExecutiveComplianceSummary userId={user?.id} fallbackScore={0} />

        <Card className="mt-6 border-white/10 bg-white/[0.045] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{t.next}</CardTitle>
            <CardDescription className="text-white/48">{t.nextBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/${locale}/dashboard/gap-analysis`)} className="bg-white text-black hover:bg-white/90">
              Gap Analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
