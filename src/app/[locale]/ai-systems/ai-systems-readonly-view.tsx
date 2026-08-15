import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import type { AiGovernanceReadiness } from '@/server/ai-governance/readiness';
import type { AiSystemRecord } from '@/server/queries/ai-systems';

const copy: Record<string, {
  eyebrow: string;
  title: string;
  body: string;
  readiness: string;
  systems: string;
  empty: string;
  detail: string;
  risk: string;
  lifecycle: string;
}> = {
  en: { eyebrow: 'AI Governance · Read only', title: 'AI systems inventory', body: 'Your role can review AI systems, risk classification and governance readiness. Creating or reassessing systems requires AI governance management permission.', readiness: 'Readiness score', systems: 'Registered systems', empty: 'No AI systems are registered yet.', detail: 'Open detail', risk: 'Risk', lifecycle: 'Lifecycle' },
  pt: { eyebrow: 'Governação de IA · Apenas leitura', title: 'Inventário de sistemas de IA', body: 'A sua função pode consultar sistemas de IA, classificação de risco e prontidão de governação. Criar ou reavaliar sistemas exige permissão de gestão de IA.', readiness: 'Score de prontidão', systems: 'Sistemas registados', empty: 'Ainda não existem sistemas de IA registados.', detail: 'Abrir detalhe', risk: 'Risco', lifecycle: 'Ciclo de vida' },
  es: { eyebrow: 'Gobernanza de IA · Solo lectura', title: 'Inventario de sistemas de IA', body: 'Tu rol puede consultar sistemas de IA, clasificación de riesgo y preparación de gobernanza. Crear o reevaluar sistemas requiere permiso de gestión de IA.', readiness: 'Score de preparación', systems: 'Sistemas registrados', empty: 'Todavía no hay sistemas de IA registrados.', detail: 'Abrir detalle', risk: 'Riesgo', lifecycle: 'Ciclo de vida' },
  fr: { eyebrow: 'Gouvernance IA · Lecture seule', title: 'Inventaire des systèmes IA', body: 'Votre rôle peut consulter les systèmes IA, leur classification de risque et la préparation de gouvernance. La création ou réévaluation exige une permission de gestion IA.', readiness: 'Score de préparation', systems: 'Systèmes enregistrés', empty: 'Aucun système IA enregistré.', detail: 'Ouvrir le détail', risk: 'Risque', lifecycle: 'Cycle de vie' },
  it: { eyebrow: 'Governance IA · Sola lettura', title: 'Inventario dei sistemi IA', body: 'Il tuo ruolo può consultare sistemi IA, classificazione del rischio e readiness di governance. Creazione e rivalutazione richiedono il permesso di gestione IA.', readiness: 'Score di readiness', systems: 'Sistemi registrati', empty: 'Nessun sistema IA registrato.', detail: 'Apri dettaglio', risk: 'Rischio', lifecycle: 'Ciclo di vita' },
  de: { eyebrow: 'KI-Governance · Nur Lesen', title: 'KI-Systeminventar', body: 'Ihre Rolle kann KI-Systeme, Risikoklassifizierung und Governance-Bereitschaft einsehen. Erstellen oder Neubewerten erfordert KI-Governance-Verwaltungsrechte.', readiness: 'Readiness-Score', systems: 'Erfasste Systeme', empty: 'Noch keine KI-Systeme erfasst.', detail: 'Details öffnen', risk: 'Risiko', lifecycle: 'Lebenszyklus' },
};

export function AiSystemsReadonlyView({
  locale,
  systems,
  organizationName,
  readiness,
}: {
  locale: string;
  systems: AiSystemRecord[];
  organizationName?: string | null;
  readiness: AiGovernanceReadiness;
}) {
  const t = copy[locale] ?? copy.en;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="ai-readonly-inventory-title">
      <div className="rounded-[2rem] border bg-background/95 p-6 shadow-sm md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{t.eyebrow}</p>
        <h1 id="ai-readonly-inventory-title" className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{t.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{t.body}</p>
        {organizationName ? <p className="mt-3 text-sm font-medium text-muted-foreground">{organizationName}</p> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t.readiness}</p>
            <p className="mt-2 text-3xl font-semibold">{readiness.score === null ? '—' : `${readiness.score}%`}</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t.systems}</p>
            <p className="mt-2 text-3xl font-semibold">{systems.length}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {systems.length === 0 ? (
          <p className="rounded-3xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground" role="status">{t.empty}</p>
        ) : systems.map((system) => (
          <article key={system.id} className="rounded-3xl border bg-background p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-semibold">{system.name}</h2>
                  <Badge variant="outline">{t.risk}: {system.risk_level}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{system.classification_summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t.lifecycle}: {system.lifecycle_status}</p>
              </div>
              <Link href={`/${locale}/ai-systems/${system.id}`} className="inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                {t.detail}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
