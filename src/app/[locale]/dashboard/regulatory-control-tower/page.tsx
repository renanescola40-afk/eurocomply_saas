'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

const locales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
type Locale = (typeof locales)[number];
type WorkstreamStatus = 'not_started' | 'in_progress' | 'ready' | 'blocked' | 'not_applicable';

type Workstream = {
  id: string;
  label: string;
  articleReference: string;
  weight: number;
  status: WorkstreamStatus;
  lifecycleState: string | null;
  updatedAt: string | null;
  route: string | null;
  requiredAction: string | null;
};

type Snapshot = {
  overallStatus: 'not_started' | 'in_progress' | 'ready' | 'blocked';
  activationPercent: number;
  readyPercent: number;
  readyCount: number;
  blockedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  notApplicableCount: number;
  workstreams: Workstream[];
  requiredActions: string[];
  evidenceBoundary: string;
};

type Copy = {
  back: string;
  badge: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  activation: string;
  readiness: string;
  ready: string;
  blocked: string;
  active: string;
  notStarted: string;
  workstreams: string;
  actions: string;
  refresh: string;
  loading: string;
  error: string;
  open: string;
  lifecycle: string;
  updated: string;
  status: Record<WorkstreamStatus, string>;
};

const english: Copy = {
  back: 'Back to dashboard',
  badge: 'EU AI Act · Regulatory operations',
  title: 'Regulatory Control Tower',
  subtitle: 'One tenant-scoped view across the evidence workflows that support your EU AI Act readiness programme.',
  disclaimer: 'This control tower reports persisted workflow states. It is not certification, legal advice or authorization to place an AI system on the market.',
  activation: 'Workflow activation',
  readiness: 'Evidence readiness',
  ready: 'Ready workflows',
  blocked: 'Blocked workflows',
  active: 'In progress',
  notStarted: 'Not started',
  workstreams: 'Regulatory workstreams',
  actions: 'Required actions',
  refresh: 'Refresh',
  loading: 'Loading regulatory workflows…',
  error: 'The regulatory control tower could not be loaded.',
  open: 'Open workflow',
  lifecycle: 'Lifecycle state',
  updated: 'Last updated',
  status: {
    not_started: 'Not started',
    in_progress: 'In progress',
    ready: 'Ready',
    blocked: 'Blocked',
    not_applicable: 'Not applicable',
  },
};

const translations: Record<Locale, Partial<Copy>> = {
  en: {},
  pt: {
    back: 'Voltar ao dashboard',
    badge: 'EU AI Act · Operações regulatórias',
    title: 'Torre de Controlo Regulatório',
    subtitle: 'Uma visão tenant-scoped dos workflows de evidência que apoiam o programa de prontidão para o EU AI Act.',
    disclaimer: 'Esta torre mostra estados persistidos dos workflows. Não é certificação, aconselhamento jurídico nem autorização para colocar um sistema de IA no mercado.',
    activation: 'Ativação dos workflows', readiness: 'Prontidão das evidências', ready: 'Workflows prontos', blocked: 'Workflows bloqueados',
    active: 'Em progresso', notStarted: 'Não iniciados', workstreams: 'Workstreams regulatórios', actions: 'Ações necessárias',
    refresh: 'Atualizar', loading: 'A carregar workflows regulatórios…', error: 'Não foi possível carregar a torre de controlo regulatório.',
    open: 'Abrir workflow', lifecycle: 'Estado do ciclo', updated: 'Última atualização',
    status: { not_started: 'Não iniciado', in_progress: 'Em progresso', ready: 'Pronto', blocked: 'Bloqueado', not_applicable: 'Não aplicável' },
  },
  es: {
    back: 'Volver al panel', title: 'Torre de Control Regulatorio', subtitle: 'Vista central de los flujos de evidencia del EU AI Act.',
    activation: 'Activación de flujos', readiness: 'Preparación de evidencias', ready: 'Flujos listos', blocked: 'Flujos bloqueados',
    active: 'En progreso', notStarted: 'No iniciados', workstreams: 'Flujos regulatorios', actions: 'Acciones requeridas', refresh: 'Actualizar',
    status: { not_started: 'No iniciado', in_progress: 'En progreso', ready: 'Listo', blocked: 'Bloqueado', not_applicable: 'No aplicable' },
  },
  fr: {
    back: 'Retour au tableau de bord', title: 'Tour de contrôle réglementaire', subtitle: 'Vue centralisée des workflows de preuve liés à l’AI Act.',
    activation: 'Activation des workflows', readiness: 'Préparation des preuves', ready: 'Workflows prêts', blocked: 'Workflows bloqués',
    active: 'En cours', notStarted: 'Non démarrés', workstreams: 'Workflows réglementaires', actions: 'Actions requises', refresh: 'Actualiser',
    status: { not_started: 'Non démarré', in_progress: 'En cours', ready: 'Prêt', blocked: 'Bloqué', not_applicable: 'Non applicable' },
  },
  it: {
    back: 'Torna alla dashboard', title: 'Torre di controllo normativa', subtitle: 'Vista centrale dei workflow di evidenza per l’AI Act.',
    activation: 'Attivazione workflow', readiness: 'Prontezza evidenze', ready: 'Workflow pronti', blocked: 'Workflow bloccati',
    active: 'In corso', notStarted: 'Non avviati', workstreams: 'Workflow normativi', actions: 'Azioni richieste', refresh: 'Aggiorna',
    status: { not_started: 'Non avviato', in_progress: 'In corso', ready: 'Pronto', blocked: 'Bloccato', not_applicable: 'Non applicabile' },
  },
  de: {
    back: 'Zurück zum Dashboard', title: 'Regulatorischer Kontrollturm', subtitle: 'Zentrale Ansicht der EU-AI-Act-Nachweisworkflows.',
    activation: 'Workflow-Aktivierung', readiness: 'Nachweisbereitschaft', ready: 'Bereite Workflows', blocked: 'Blockierte Workflows',
    active: 'In Bearbeitung', notStarted: 'Nicht gestartet', workstreams: 'Regulatorische Workflows', actions: 'Erforderliche Maßnahmen', refresh: 'Aktualisieren',
    status: { not_started: 'Nicht gestartet', in_progress: 'In Bearbeitung', ready: 'Bereit', blocked: 'Blockiert', not_applicable: 'Nicht anwendbar' },
  },
};

function tone(status: WorkstreamStatus) {
  if (status === 'ready' || status === 'not_applicable') return 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100';
  if (status === 'blocked') return 'border-rose-300/20 bg-rose-300/[0.07] text-rose-100';
  if (status === 'in_progress') return 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100';
  return 'border-white/[0.075] bg-white/[0.025] text-white/48';
}

function iconFor(status: WorkstreamStatus) {
  if (status === 'ready' || status === 'not_applicable') return CheckCircle2;
  if (status === 'blocked') return AlertTriangle;
  if (status === 'in_progress') return Workflow;
  return CircleDashed;
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function ProgressLine({ value, label }: { value: number; label: string }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalized}>
      <div className="h-full rounded-full bg-emerald-300" style={{ width: `${normalized}%` }} />
    </div>
  );
}

export default function RegulatoryControlTowerPage() {
  const params = useParams<{ locale?: string }>();
  const locale = locales.includes(params.locale as Locale) ? (params.locale as Locale) : 'en';
  const text = useMemo(() => ({ ...english, ...translations[locale], status: { ...english.status, ...translations[locale].status } }), [locale]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch('/api/ai-governance/regulatory-control-tower', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'load_failed');
      setSnapshot(payload);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="min-h-0 bg-transparent text-white" aria-busy={loading}>
      <div className="w-full space-y-5">
        <header className="flex flex-col gap-4 border-b border-white/[0.065] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link href={`/${locale}/dashboard/organizations`} className="inline-flex items-center gap-2 text-xs font-medium text-white/42 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {text.back}
            </Link>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/65">{text.badge}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">{text.subtitle}</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-white/65 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {text.refresh}
          </button>
        </header>

        <section className="flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-4 py-3 text-sm leading-6 text-amber-100/82" aria-label="Regulatory boundary">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
          <p>{text.disclaimer}</p>
        </section>

        {loading && !snapshot ? (
          <section className="rounded-xl border border-white/[0.075] bg-[#101715] px-5 py-8 text-sm text-white/42" role="status">{text.loading}</section>
        ) : error || !snapshot ? (
          <section className="rounded-xl border border-rose-300/15 bg-rose-300/[0.045] px-5 py-8 text-sm text-rose-100" role="alert">{text.error}</section>
        ) : (
          <>
            <section className="grid overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] sm:grid-cols-2 xl:grid-cols-4" aria-label="Regulatory workflow summary">
              <article className="p-5 xl:border-r xl:border-white/[0.055]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/36">{text.activation}</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{snapshot.activationPercent}%</p>
                <ProgressLine value={snapshot.activationPercent} label={text.activation} />
              </article>
              <article className="border-t border-white/[0.055] p-5 sm:border-l sm:border-t-0 xl:border-r">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/36">{text.readiness}</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{snapshot.readyPercent}%</p>
                <ProgressLine value={snapshot.readyPercent} label={text.readiness} />
              </article>
              <article className="border-t border-white/[0.055] p-5 xl:border-r xl:border-t-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/36">{text.ready}</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-emerald-100">{snapshot.readyCount}</p>
                <p className="mt-3 text-xs text-white/35">{snapshot.notApplicableCount} {text.status.not_applicable.toLowerCase()}</p>
              </article>
              <article className="border-t border-white/[0.055] p-5 sm:border-l xl:border-l-0 xl:border-t-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/36">{text.blocked}</p>
                <p className={`mt-2 text-3xl font-semibold tracking-[-0.035em] ${snapshot.blockedCount > 0 ? 'text-rose-100' : 'text-white'}`}>{snapshot.blockedCount}</p>
                <p className="mt-3 text-xs text-white/35">{snapshot.inProgressCount} {text.active.toLowerCase()} · {snapshot.notStartedCount} {text.notStarted.toLowerCase()}</p>
              </article>
            </section>

            <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="regulatory-workstreams-title">
              <div className="border-b border-white/[0.055] px-5 py-4">
                <h2 id="regulatory-workstreams-title" className="text-sm font-semibold text-white/88">{text.workstreams}</h2>
                <p className="mt-1 text-xs text-white/35">{snapshot.evidenceBoundary}</p>
              </div>
              <div className="divide-y divide-white/[0.055]">
                {snapshot.workstreams.map((workstream) => {
                  const Icon = iconFor(workstream.status);
                  const route = workstream.route ? `/${locale}${workstream.route}` : null;
                  return (
                    <article key={workstream.id} className="grid gap-4 px-5 py-4 transition-colors hover:bg-white/[0.018] lg:grid-cols-[minmax(0,1.2fr)_170px_190px_minmax(180px,0.8fr)_110px] lg:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone(workstream.status)}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                        <div className="min-w-0">
                          <p className="font-medium text-white/86">{workstream.label}</p>
                          <p className="mt-1 text-xs text-white/34">{workstream.articleReference} · weight {workstream.weight}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">Status</p>
                        <span className={`mt-1.5 inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${tone(workstream.status)}`}>{text.status[workstream.status]}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">{text.lifecycle}</p>
                        <p className="mt-1.5 text-xs text-white/58">{workstream.lifecycleState ?? '—'}</p>
                        <p className="mt-1 text-[11px] text-white/30">{text.updated}: {formatDate(workstream.updatedAt, locale)}</p>
                      </div>
                      <p className="text-xs leading-5 text-white/45">{workstream.requiredAction ?? '—'}</p>
                      <div className="lg:text-right">
                        {route ? <Link href={route} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-semibold text-white/62 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{text.open}</Link> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {snapshot.requiredActions.length > 0 ? (
              <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="required-actions-title">
                <div className="border-b border-white/[0.055] px-5 py-4">
                  <h2 id="required-actions-title" className="text-sm font-semibold text-white/88">{text.actions}</h2>
                </div>
                <ol className="divide-y divide-white/[0.055]">
                  {snapshot.requiredActions.map((action, index) => (
                    <li key={`${index}-${action}`} className="flex gap-4 px-5 py-4 text-sm leading-6 text-white/55">
                      <span className="w-6 shrink-0 text-xs font-semibold text-emerald-200/65">{String(index + 1).padStart(2, '0')}</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
