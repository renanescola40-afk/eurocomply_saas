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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
  if (status === 'ready' || status === 'not_applicable') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  if (status === 'blocked') return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
  if (status === 'in_progress') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return 'border-white/10 bg-white/[0.045] text-slate-300';
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
    <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button asChild variant="ghost" className="mb-3 -ml-3 text-slate-300 hover:text-white">
              <Link href={`/${locale}/dashboard`}><ArrowLeft className="mr-2 h-4 w-4" />{text.back}</Link>
            </Button>
            <Badge className="border-violet-400/30 bg-violet-400/10 text-violet-200">{text.badge}</Badge>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">{text.subtitle}</p>
          </div>
          <Button onClick={() => void load()} disabled={loading} variant="outline" className="border-white/10 bg-white/[0.04]">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{text.refresh}
          </Button>
        </div>

        <Card className="border-amber-400/20 bg-amber-400/[0.06] text-amber-100">
          <CardContent className="flex gap-3 p-4 text-sm leading-6">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{text.disclaimer}</p>
          </CardContent>
        </Card>

        {loading && !snapshot ? (
          <Card className="border-white/10 bg-white/[0.035]"><CardContent className="p-8 text-slate-400">{text.loading}</CardContent></Card>
        ) : error || !snapshot ? (
          <Card className="border-rose-400/20 bg-rose-400/[0.06]"><CardContent className="p-8 text-rose-200">{text.error}</CardContent></Card>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-white/10 bg-white/[0.04]">
                <CardHeader className="pb-2"><CardDescription>{text.activation}</CardDescription><CardTitle className="text-3xl">{snapshot.activationPercent}%</CardTitle></CardHeader>
                <CardContent><Progress value={snapshot.activationPercent} className="h-2" /></CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.04]">
                <CardHeader className="pb-2"><CardDescription>{text.readiness}</CardDescription><CardTitle className="text-3xl">{snapshot.readyPercent}%</CardTitle></CardHeader>
                <CardContent><Progress value={snapshot.readyPercent} className="h-2" /></CardContent>
              </Card>
              <Card className="border-emerald-400/20 bg-emerald-400/[0.06]">
                <CardHeader className="pb-2"><CardDescription>{text.ready}</CardDescription><CardTitle className="text-3xl text-emerald-200">{snapshot.readyCount}</CardTitle></CardHeader>
                <CardContent className="text-sm text-slate-400">{snapshot.notApplicableCount} {text.status.not_applicable.toLowerCase()}</CardContent>
              </Card>
              <Card className={snapshot.blockedCount > 0 ? 'border-rose-400/25 bg-rose-400/[0.07]' : 'border-white/10 bg-white/[0.04]'}>
                <CardHeader className="pb-2"><CardDescription>{text.blocked}</CardDescription><CardTitle className="text-3xl">{snapshot.blockedCount}</CardTitle></CardHeader>
                <CardContent className="text-sm text-slate-400">{snapshot.inProgressCount} {text.active.toLowerCase()} · {snapshot.notStartedCount} {text.notStarted.toLowerCase()}</CardContent>
              </Card>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">{text.workstreams}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {snapshot.workstreams.map((workstream) => {
                  const Icon = iconFor(workstream.status);
                  const route = workstream.route ? `/${locale}${workstream.route}` : null;
                  return (
                    <Card key={workstream.id} className="border-white/10 bg-white/[0.035] transition hover:border-white/20">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tone(workstream.status)}`}><Icon className="h-5 w-5" /></span>
                            <div>
                              <CardTitle className="text-base">{workstream.label}</CardTitle>
                              <CardDescription className="mt-1">{workstream.articleReference} · weight {workstream.weight}</CardDescription>
                            </div>
                          </div>
                          <Badge className={tone(workstream.status)}>{text.status[workstream.status]}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                          <div><p className="text-xs text-slate-500">{text.lifecycle}</p><p className="mt-1 font-medium text-slate-200">{workstream.lifecycleState ?? '—'}</p></div>
                          <div><p className="text-xs text-slate-500">{text.updated}</p><p className="mt-1 font-medium text-slate-200">{formatDate(workstream.updatedAt, locale)}</p></div>
                        </div>
                        {workstream.requiredAction && <p className="leading-6 text-slate-400">{workstream.requiredAction}</p>}
                        {route && <Button asChild size="sm" variant="outline" className="border-white/10 bg-white/[0.04]"><Link href={route}>{text.open}</Link></Button>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {snapshot.requiredActions.length > 0 && (
              <Card className="border-white/10 bg-white/[0.035]">
                <CardHeader><CardTitle className="text-lg">{text.actions}</CardTitle></CardHeader>
                <CardContent><ol className="space-y-2 text-sm leading-6 text-slate-300">{snapshot.requiredActions.map((action, index) => <li key={`${index}-${action}`} className="flex gap-3"><span className="text-slate-600">{index + 1}.</span><span>{action}</span></li>)}</ol></CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
