'use client';

import { Activity, AlertTriangle, CheckCircle2, FileSearch, ShieldCheck } from 'lucide-react';
import type { AiSystemRecord } from '@/server/queries/ai-systems';

type ReadinessCardProps = {
  locale: string;
  systems: AiSystemRecord[];
};

const copy = {
  en: {
    title: 'AI governance readiness',
    subtitle: 'Operational score based on the current AI inventory, high-risk exposure and evidence readiness.',
    score: 'Readiness score',
    inventory: 'Inventory started',
    highRisk: 'High-risk items reviewed',
    transparency: 'Transparency items tracked',
    evidence: 'Evidence and owners visible',
    empty: 'Add the first AI system to start the readiness score.',
    review: 'Review needed',
    healthy: 'On track',
  },
  pt: {
    title: 'Prontidão de governação de IA',
    subtitle: 'Score operacional baseado no inventário atual, exposição de alto risco e prontidão de evidências.',
    score: 'Score de prontidão',
    inventory: 'Inventário iniciado',
    highRisk: 'Itens alto risco revistos',
    transparency: 'Transparência acompanhada',
    evidence: 'Evidências e responsáveis visíveis',
    empty: 'Adicione o primeiro sistema de IA para iniciar o score de prontidão.',
    review: 'Revisão necessária',
    healthy: 'No caminho certo',
  },
  es: {
    title: 'Preparación de gobierno de IA',
    subtitle: 'Score operativo basado en inventario, exposición de alto riesgo y preparación de evidencias.',
    score: 'Score de preparación',
    inventory: 'Inventario iniciado',
    highRisk: 'Ítems alto riesgo revisados',
    transparency: 'Transparencia seguida',
    evidence: 'Evidencias y responsables visibles',
    empty: 'Añade el primer sistema de IA para iniciar el score.',
    review: 'Revisión necesaria',
    healthy: 'En buen camino',
  },
  fr: {
    title: 'Préparation gouvernance IA', subtitle: 'Score opérationnel basé sur l’inventaire, le haut risque et les preuves.', score: 'Score de préparation', inventory: 'Inventaire démarré', highRisk: 'Haut risque revu', transparency: 'Transparence suivie', evidence: 'Preuves et responsables visibles', empty: 'Ajoutez le premier système IA pour démarrer le score.', review: 'Revue nécessaire', healthy: 'Sur la bonne voie',
  },
  it: {
    title: 'Prontezza governance IA', subtitle: 'Score operativo basato su inventario, alto rischio ed evidenze.', score: 'Score di prontezza', inventory: 'Inventario avviato', highRisk: 'Alto rischio revisionato', transparency: 'Trasparenza monitorata', evidence: 'Evidenze e owner visibili', empty: 'Aggiungi il primo sistema IA per avviare lo score.', review: 'Revisione necessaria', healthy: 'In linea',
  },
  de: {
    title: 'KI-Governance-Readiness', subtitle: 'Operativer Score basierend auf Inventar, High-Risk-Exposition und Nachweisen.', score: 'Readiness-Score', inventory: 'Inventar gestartet', highRisk: 'High-Risk geprüft', transparency: 'Transparenz verfolgt', evidence: 'Nachweise und Owner sichtbar', empty: 'Erfassen Sie das erste KI-System, um den Score zu starten.', review: 'Prüfung nötig', healthy: 'Auf Kurs',
  },
} as const;

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

function calculateReadiness(systems: AiSystemRecord[]) {
  if (systems.length === 0) {
    return {
      score: 0,
      hasInventory: false,
      highRiskReady: false,
      transparencyTracked: false,
      evidenceVisible: false,
      needsReview: true,
    };
  }

  const highRiskCount = systems.filter((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review').length;
  const transparencyCount = systems.filter((system) => system.risk_level === 'limited_transparency').length;
  const withOwners = systems.filter((system) => Boolean(system.owner_team)).length;
  const withVendorEvidenceTargets = systems.filter((system) => Boolean(system.vendor_name)).length;

  const hasInventory = true;
  const highRiskReady = highRiskCount === 0 || systems.some((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review');
  const transparencyTracked = transparencyCount === 0 || systems.some((system) => system.risk_level === 'limited_transparency');
  const evidenceVisible = withOwners / systems.length >= 0.5 || withVendorEvidenceTargets > 0;

  const score = Math.min(100, Math.round(
    25 +
    (hasInventory ? 25 : 0) +
    (highRiskReady ? 20 : 0) +
    (transparencyTracked ? 15 : 0) +
    (evidenceVisible ? 15 : 0),
  ));

  return {
    score,
    hasInventory,
    highRiskReady,
    transparencyTracked,
    evidenceVisible,
    needsReview: highRiskCount > 0 || score < 70,
  };
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-background p-3 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export function ReadinessCard({ locale, systems }: ReadinessCardProps) {
  const t = getCopy(locale);
  const readiness = calculateReadiness(systems);

  return (
    <section className="mt-8 rounded-3xl border bg-muted/20 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4" />{t.title}</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{systems.length === 0 ? t.empty : t.subtitle}</p>
        </div>
        <div className="rounded-3xl border bg-background p-5 text-center lg:min-w-48">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{t.score}</p>
          <p className="mt-2 text-4xl font-bold">{readiness.score}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{readiness.needsReview ? t.review : t.healthy}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <CheckItem ok={readiness.hasInventory} label={t.inventory} />
        <CheckItem ok={readiness.highRiskReady} label={t.highRisk} />
        <CheckItem ok={readiness.transparencyTracked} label={t.transparency} />
        <CheckItem ok={readiness.evidenceVisible} label={t.evidence} />
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        <span>{systems.length} AI systems · {systems.filter((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review').length} high-risk review · {systems.filter((system) => system.risk_level === 'limited_transparency').length} transparency</span>
        <FileSearch className="h-4 w-4" />
      </div>
    </section>
  );
}
