'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <main className="space-y-6 text-white">
      <Button
        variant="ghost"
        onClick={() => router.push(`/${locale}/dashboard`)}
        className="h-9 px-2 text-white/50 hover:bg-white/[0.05] hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
      </Button>

      <header className="border-b border-white/[0.07] pb-6">
        <Badge className="mb-3 rounded-lg border-blue-400/20 bg-blue-500/[0.09] text-blue-200">{t.badge}</Badge>
        <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48 md:text-base">{t.subtitle}</p>
      </header>

      <ExecutiveComplianceSummary userId={user?.id} fallbackScore={0} />

      <section className="rounded-xl border border-white/[0.08] bg-[#0d1522] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white/88">
              <ShieldCheck className="h-4 w-4 text-blue-300" />
              {t.next}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-white/45">{t.nextBody}</p>
          </div>
          <Button
            onClick={() => router.push(`/${locale}/dashboard/gap-analysis`)}
            className="shrink-0 bg-blue-600 text-white hover:bg-blue-500"
          >
            Gap Analysis
          </Button>
        </div>
      </section>
    </main>
  );
}
