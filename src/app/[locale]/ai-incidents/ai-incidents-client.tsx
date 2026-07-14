'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, FileWarning, Plus, ShieldAlert, TimerReset } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AiSystemRecord } from '@/server/queries/ai-systems';
import type { AiIncidentRecord } from '@/server/queries/ai-incidents';
import {
  serializeAiIncidentLocalDateTime,
  type AiIncidentSeverity,
} from '@/lib/ai-governance/incidents';

type Props = {
  locale: string;
  initialIncidents: AiIncidentRecord[];
  systems: AiSystemRecord[];
  organizationName?: string | null;
};

type FormState = {
  aiSystemId: string;
  title: string;
  summary: string;
  category: string;
  severity: string;
  detectedAt: string;
  reportStatus: string;
  authority: string;
  internalOwner: string;
};

const defaultForm: FormState = {
  aiSystemId: '',
  title: '',
  summary: '',
  category: 'malfunction',
  severity: 'monitor',
  detectedAt: new Date().toISOString().slice(0, 16),
  reportStatus: 'draft',
  authority: '',
  internalOwner: '',
};

const copy = {
  en: {
    badge: 'AI Governance', title: 'Serious incident register', subtitle: 'Capture AI incidents, triage severity and keep escalation deadlines visible for audit readiness.', org: 'Organization', total: 'Incidents', urgent: 'Urgent review', open: 'Open assessments', addTitle: 'Register incident', addSubtitle: 'Record the facts quickly: affected system, impact, severity, owner and authority context.', system: 'Affected AI system', noSystem: 'No specific system / unknown', titleField: 'Incident title', summary: 'What happened and who may be affected?', category: 'Incident category', severity: 'Severity', detectedAt: 'Detected at', status: 'Report status', authority: 'Authority / regulator context', owner: 'Internal owner', submit: 'Create incident record', saving: 'Creating...', empty: 'No AI incidents registered yet.', deadlines: 'Deadline plan', actions: 'Next actions', migration: 'The AI incident register table is not available yet. Apply the Supabase migration before saving incidents.', error: 'Could not create AI incident.',
  },
  pt: {
    badge: 'Governação de IA', title: 'Registo de incidentes graves', subtitle: 'Registe incidentes de IA, faça triagem de severidade e mantenha prazos de escalamento visíveis para auditoria.', org: 'Organização', total: 'Incidentes', urgent: 'Revisão urgente', open: 'Avaliações abertas', addTitle: 'Registar incidente', addSubtitle: 'Registe rapidamente os factos: sistema afetado, impacto, severidade, responsável e contexto de autoridade.', system: 'Sistema de IA afetado', noSystem: 'Sem sistema específico / desconhecido', titleField: 'Título do incidente', summary: 'O que aconteceu e quem pode ser afetado?', category: 'Categoria do incidente', severity: 'Severidade', detectedAt: 'Detetado em', status: 'Estado de reporte', authority: 'Autoridade / contexto regulatório', owner: 'Responsável interno', submit: 'Criar registo de incidente', saving: 'A criar...', empty: 'Ainda não há incidentes de IA registados.', deadlines: 'Plano de prazos', actions: 'Próximas ações', migration: 'A tabela de incidentes de IA ainda não está disponível. Aplique a migration Supabase antes de guardar incidentes.', error: 'Não foi possível criar o incidente de IA.',
  },
  es: {
    badge: 'Gobierno de IA', title: 'Registro de incidentes graves', subtitle: 'Registra incidentes de IA, evalúa severidad y conserva plazos de escalado para auditoría.', org: 'Organización', total: 'Incidentes', urgent: 'Revisión urgente', open: 'Evaluaciones abiertas', addTitle: 'Registrar incidente', addSubtitle: 'Registra los hechos: sistema afectado, impacto, severidad, responsable y contexto de autoridad.', system: 'Sistema de IA afectado', noSystem: 'Sin sistema específico / desconocido', titleField: 'Título del incidente', summary: '¿Qué ocurrió y quién puede verse afectado?', category: 'Categoría del incidente', severity: 'Severidad', detectedAt: 'Detectado en', status: 'Estado de reporte', authority: 'Autoridad / contexto regulatorio', owner: 'Responsable interno', submit: 'Crear registro de incidente', saving: 'Creando...', empty: 'Todavía no hay incidentes de IA registrados.', deadlines: 'Plan de plazos', actions: 'Próximas acciones', migration: 'La tabla de incidentes de IA aún no está disponible. Aplica la migración de Supabase antes de guardar incidentes.', error: 'No se pudo crear el incidente de IA.',
  },
  fr: {
    badge: 'Gouvernance IA', title: 'Registre des incidents graves', subtitle: 'Capturez les incidents IA, qualifiez la sévérité et gardez les échéances visibles.', org: 'Organisation', total: 'Incidents', urgent: 'Revue urgente', open: 'Évaluations ouvertes', addTitle: 'Enregistrer un incident', addSubtitle: 'Documentez les faits : système affecté, impact, sévérité, responsable et autorité.', system: 'Système IA affecté', noSystem: 'Aucun système spécifique / inconnu', titleField: 'Titre de l’incident', summary: 'Que s’est-il passé et qui peut être affecté ?', category: 'Catégorie', severity: 'Sévérité', detectedAt: 'Détecté le', status: 'Statut de rapport', authority: 'Autorité / contexte réglementaire', owner: 'Responsable interne', submit: 'Créer l’incident', saving: 'Création...', empty: 'Aucun incident IA enregistré.', deadlines: 'Plan d’échéances', actions: 'Prochaines actions', migration: 'La table des incidents IA n’est pas disponible. Appliquez la migration Supabase.', error: 'Impossible de créer l’incident IA.',
  },
  it: {
    badge: 'Governance IA', title: 'Registro incidenti gravi', subtitle: 'Registra incidenti IA, valuta severità e mantieni visibili le scadenze di escalation.', org: 'Organizzazione', total: 'Incidenti', urgent: 'Revisione urgente', open: 'Valutazioni aperte', addTitle: 'Registra incidente', addSubtitle: 'Registra i fatti: sistema coinvolto, impatto, severità, responsabile e autorità.', system: 'Sistema IA coinvolto', noSystem: 'Nessun sistema specifico / sconosciuto', titleField: 'Titolo incidente', summary: 'Cosa è successo e chi può essere interessato?', category: 'Categoria incidente', severity: 'Severità', detectedAt: 'Rilevato il', status: 'Stato report', authority: 'Autorità / contesto regolatorio', owner: 'Responsabile interno', submit: 'Crea record incidente', saving: 'Creazione...', empty: 'Nessun incidente IA registrato.', deadlines: 'Piano scadenze', actions: 'Prossime azioni', migration: 'La tabella incidenti IA non è disponibile. Applica la migration Supabase.', error: 'Impossibile creare incidente IA.',
  },
  de: {
    badge: 'KI-Governance', title: 'Register schwerwiegender Vorfälle', subtitle: 'KI-Vorfälle erfassen, Schweregrad triagieren und Eskalationsfristen sichtbar halten.', org: 'Organisation', total: 'Vorfälle', urgent: 'Dringende Prüfung', open: 'Offene Bewertungen', addTitle: 'Vorfall erfassen', addSubtitle: 'Fakten erfassen: betroffenes System, Auswirkung, Schweregrad, Owner und Behörde.', system: 'Betroffenes KI-System', noSystem: 'Kein spezifisches System / unbekannt', titleField: 'Vorfalltitel', summary: 'Was ist passiert und wer kann betroffen sein?', category: 'Vorfallkategorie', severity: 'Schweregrad', detectedAt: 'Erkannt am', status: 'Meldestatus', authority: 'Behörde / regulatorischer Kontext', owner: 'Interner Owner', submit: 'Vorfall anlegen', saving: 'Erstellung...', empty: 'Noch keine KI-Vorfälle erfasst.', deadlines: 'Fristenplan', actions: 'Nächste Schritte', migration: 'Die KI-Vorfalltabelle ist nicht verfügbar. Supabase-Migration anwenden.', error: 'KI-Vorfall konnte nicht erstellt werden.',
  },
} as const;

const categoryOptions = [
  ['malfunction', 'Malfunction'],
  ['data_or_security', 'Data or security'],
  ['serious_harm', 'Serious harm'],
  ['fundamental_rights', 'Fundamental rights'],
  ['transparency_failure', 'Transparency failure'],
  ['prohibited_use_signal', 'Prohibited-use signal'],
  ['other', 'Other'],
] as const;

const severityOptions = [
  ['monitor', 'Monitor'],
  ['serious', 'Serious'],
  ['critical', 'Critical'],
] as const;

const statusOptions = [
  ['draft', 'Draft'],
  ['assessing', 'Assessing'],
  ['reportable', 'Reportable'],
  ['reported', 'Reported'],
  ['closed', 'Closed'],
] as const;

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

function severityTone(severity: AiIncidentSeverity) {
  if (severity === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (severity === 'serious') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
}

function findSystemName(systems: AiSystemRecord[], id: string | null) {
  if (!id) return null;
  return systems.find((system) => system.id === id)?.name ?? null;
}

function formatDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AiIncidentsClient({ locale, initialIncidents, systems, organizationName }: Props) {
  const t = getCopy(locale);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const stats = useMemo(() => {
    const urgent = incidents.filter((incident) => incident.severity === 'critical' || incident.category === 'serious_harm' || incident.category === 'prohibited_use_signal').length;
    const open = incidents.filter((incident) => incident.report_status !== 'closed' && incident.report_status !== 'reported').length;
    return { urgent, open };
  }, [incidents]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice('');

    const response = await fetch('/api/ai-incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        detectedAt: serializeAiIncidentLocalDateTime(form.detectedAt),
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setNotice(payload?.error === 'ai_incidents_table_missing' ? t.migration : payload?.message ?? t.error);
      setIsSubmitting(false);
      return;
    }

    setIncidents((current) => [payload.incident as AiIncidentRecord, ...current]);
    setForm({ ...defaultForm, detectedAt: new Date().toISOString().slice(0, 16) });
    setIsSubmitting(false);
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="outline" className="rounded-full"><ShieldAlert className="mr-1 h-3.5 w-3.5" />{t.badge}</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
            {organizationName ? <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">{t.org}: {organizationName}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border bg-muted/20 p-4"><FileWarning className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{incidents.length}</p><p className="text-xs text-muted-foreground">{t.total}</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><AlertTriangle className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{stats.urgent}</p><p className="text-xs text-muted-foreground">{t.urgent}</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><TimerReset className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{stats.open}</p><p className="text-xs text-muted-foreground">{t.open}</p></div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 rounded-3xl border bg-muted/20 p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">{t.addTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.addSubtitle}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select value={form.aiSystemId} onChange={(event) => update('aiSystemId', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.system}>
              <option value="">{t.noSystem}</option>
              {systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
            </select>
            <input required value={form.title} onChange={(event) => update('title', event.target.value)} placeholder={t.titleField} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <select value={form.category} onChange={(event) => update('category', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.category}>
              {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={form.severity} onChange={(event) => update('severity', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.severity}>
              {severityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input type="datetime-local" value={form.detectedAt} onChange={(event) => update('detectedAt', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.detectedAt} />
            <select value={form.reportStatus} onChange={(event) => update('reportStatus', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.status}>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input value={form.authority} onChange={(event) => update('authority', event.target.value)} placeholder={t.authority} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={form.internalOwner} onChange={(event) => update('internalOwner', event.target.value)} placeholder={t.owner} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <textarea required minLength={12} value={form.summary} onChange={(event) => update('summary', event.target.value)} placeholder={t.summary} className="min-h-28 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary md:col-span-2" />
          </div>
          {notice ? <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{notice}</div> : null}
          <Button type="submit" disabled={isSubmitting} className="mt-5 rounded-full">
            <Plus className="h-4 w-4" />{isSubmitting ? t.saving : t.submit}
          </Button>
        </form>

        <div className="mt-8 grid gap-4">
          {incidents.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground"><FileWarning className="mx-auto mb-3 h-8 w-8" />{t.empty}</div>
          ) : incidents.map((incident) => {
            const systemName = findSystemName(systems, incident.ai_system_id);
            return (
              <article key={incident.id} className="rounded-3xl border bg-background p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">{incident.title}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${severityTone(incident.severity)}`}>{incident.severity}</span>
                      <Badge variant="outline">{incident.report_status}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{incident.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{incident.category}</Badge>
                      {systemName ? <Badge variant="outline">{systemName}</Badge> : null}
                      {incident.internal_owner ? <Badge variant="outline">{incident.internal_owner}</Badge> : null}
                      {incident.authority ? <Badge variant="outline">{incident.authority}</Badge> : null}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground"><CalendarClock className="ml-auto mb-2 h-5 w-5 text-primary" />{formatDate(incident.detected_at)}</div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <h3 className="text-sm font-semibold">{t.deadlines}</h3>
                    <ul className="mt-2 space-y-3 text-sm text-muted-foreground">
                      {incident.deadline_plan.map((deadline) => <li key={`${deadline.label}-${deadline.dueAt}`}>• <span className="font-medium text-foreground">{deadline.label}</span>{deadline.dueAt ? ` — ${formatDate(deadline.dueAt)}` : ''}<br /><span className="text-xs">{deadline.description}</span></li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <h3 className="text-sm font-semibold">{t.actions}</h3>
                    <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                      {incident.next_actions.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
