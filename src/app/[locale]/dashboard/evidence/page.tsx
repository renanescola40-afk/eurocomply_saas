'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Plus, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import {
  createEvidenceItem,
  resolveEvidenceOrganization,
  summarizeEvidence,
  tryListEvidenceItems,
  type EvidenceItem,
  type EvidenceType,
} from '@/lib/evidence/storage';

const copy = {
  en: {
    back: 'Back to dashboard', badge: 'Evidence Vault', title: 'Audit evidence center', subtitle: 'Register policies, procedures, risk assessments and proof linked to EU AI Act articles.',
    titleInput: 'Evidence title', ownerInput: 'Owner or team', articlesInput: 'Articles, e.g. Article 9, Article 14', add: 'Add evidence', coverage: 'Evidence Coverage', valid: 'Valid evidence', review: 'Needs review', expired: 'Expired', recent: 'Evidence register', empty: 'No evidence yet. Add your first policy or procedure.',
  },
  pt: {
    back: 'Voltar ao dashboard', badge: 'Evidence Vault', title: 'Centro de evidências de auditoria', subtitle: 'Registe políticas, procedimentos, avaliações de risco e provas ligadas aos artigos do EU AI Act.',
    titleInput: 'Título da evidência', ownerInput: 'Responsável ou equipa', articlesInput: 'Artigos, ex: Article 9, Article 14', add: 'Adicionar evidência', coverage: 'Cobertura de evidências', valid: 'Evidências válidas', review: 'Precisam revisão', expired: 'Expiradas', recent: 'Registo de evidências', empty: 'Nenhuma evidência ainda. Adicione a primeira política ou procedimento.',
  },
  es: {
    back: 'Volver al dashboard', badge: 'Evidence Vault', title: 'Centro de evidencias de auditoría', subtitle: 'Registra políticas, procedimientos, evaluaciones de riesgo y pruebas vinculadas al EU AI Act.',
    titleInput: 'Título de la evidencia', ownerInput: 'Responsable o equipo', articlesInput: 'Artículos, ej: Article 9, Article 14', add: 'Agregar evidencia', coverage: 'Cobertura de evidencias', valid: 'Evidencias válidas', review: 'Requieren revisión', expired: 'Expiradas', recent: 'Registro de evidencias', empty: 'Aún no hay evidencias. Agrega tu primera política o procedimiento.',
  },
  fr: {
    back: 'Retour au dashboard', badge: 'Evidence Vault', title: 'Centre de preuves audit', subtitle: 'Enregistrez politiques, procédures, évaluations de risque et preuves liées à l’EU AI Act.',
    titleInput: 'Titre de la preuve', ownerInput: 'Responsable ou équipe', articlesInput: 'Articles, ex : Article 9, Article 14', add: 'Ajouter une preuve', coverage: 'Couverture des preuves', valid: 'Preuves valides', review: 'À revoir', expired: 'Expirées', recent: 'Registre des preuves', empty: 'Aucune preuve pour le moment. Ajoutez votre première politique ou procédure.',
  },
  it: {
    back: 'Torna alla dashboard', badge: 'Evidence Vault', title: 'Centro evidenze audit', subtitle: 'Registra policy, procedure, risk assessment e prove collegate agli articoli EU AI Act.',
    titleInput: 'Titolo evidenza', ownerInput: 'Responsabile o team', articlesInput: 'Articoli, es: Article 9, Article 14', add: 'Aggiungi evidenza', coverage: 'Copertura evidenze', valid: 'Evidenze valide', review: 'Da revisionare', expired: 'Scadute', recent: 'Registro evidenze', empty: 'Nessuna evidenza. Aggiungi la prima policy o procedura.',
  },
  de: {
    back: 'Zurück zum Dashboard', badge: 'Evidence Vault', title: 'Audit-Nachweiszentrum', subtitle: 'Erfassen Sie Richtlinien, Verfahren, Risikoanalysen und Nachweise zu EU-AI-Act-Artikeln.',
    titleInput: 'Nachweistitel', ownerInput: 'Owner oder Team', articlesInput: 'Artikel, z. B. Article 9, Article 14', add: 'Nachweis hinzufügen', coverage: 'Nachweisabdeckung', valid: 'Gültige Nachweise', review: 'Prüfung nötig', expired: 'Abgelaufen', recent: 'Nachweisregister', empty: 'Noch keine Nachweise. Fügen Sie die erste Richtlinie oder das erste Verfahren hinzu.',
  },
} as const;

type Locale = keyof typeof copy;

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'valid' || normalized === 'approved' || normalized === 'ready') return 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300';
  if (normalized.includes('expired')) return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  if (normalized.includes('review')) return 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300';
  return 'border-slate-700 bg-slate-900/60 text-slate-400';
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function EvidenceVaultPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const t = copy[locale];
  const requestedOrganizationId = searchParams.get('organizationId');

  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [articleRefs, setArticleRefs] = useState('Article 9');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('policy');
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => summarizeEvidence(items), [items]);

  async function loadEvidence() {
    if (!user?.id) return;
    try {
      const resolvedOrganizationId = await resolveEvidenceOrganization(user.id, requestedOrganizationId);
      setOrganizationId(resolvedOrganizationId);
      setTenantError(null);
      const evidence = await tryListEvidenceItems({ organizationId: resolvedOrganizationId, limit: 50 });
      setItems(evidence);
    } catch (error) {
      setOrganizationId(null);
      setItems([]);
      setTenantError(error instanceof Error ? error.message : 'Evidence Vault organization could not be resolved.');
    }
  }

  useEffect(() => {
    loadEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedOrganizationId, user?.id]);

  async function handleCreateEvidence() {
    if (!organizationId || !title.trim()) return;
    setSaving(true);
    try {
      const refs = articleRefs.split(',').map((item) => item.trim()).filter(Boolean);
      await createEvidenceItem({
        organizationId,
        title: title.trim(),
        ownerName: ownerName.trim() || undefined,
        evidenceType,
        articleRefs: refs,
        status: 'draft',
      });
      setTitle('');
      setOwnerName('');
      await loadEvidence();
    } finally {
      setSaving(false);
    }
  }

  const metrics = [
    { label: t.coverage, value: `${summary.coverage}%`, progress: summary.coverage },
    { label: t.valid, value: String(summary.valid) },
    { label: t.review, value: String(summary.needsReview) },
    { label: t.expired, value: String(summary.expired) },
  ];
  const inputClass = 'h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20';

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">{t.badge}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white">{t.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{t.subtitle}</p>
          </div>
          <button type="button" onClick={() => router.push(`/${locale}/dashboard`)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-medium text-slate-300 transition hover:border-blue-500/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t.back}
          </button>
        </header>

        {tenantError ? <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-200" role="alert">{tenantError}</p> : null}

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 lg:grid-cols-4" aria-label={t.coverage}>
          {metrics.map((metric) => (
            <article key={metric.label} className="bg-[#0d1624] px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-600">{metric.label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-100">{metric.value}</p>
              {typeof metric.progress === 'number' ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={metric.progress} aria-label={metric.label}>
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, metric.progress))}%` }} />
                </div>
              ) : null}
            </article>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-labelledby="add-evidence-title">
            <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
              <Plus className="h-4 w-4 text-blue-400" aria-hidden="true" />
              <div>
                <h2 id="add-evidence-title" className="text-sm font-semibold text-slate-100">{t.add}</h2>
                <p className="mt-0.5 text-xs text-slate-600">Assessment → Finding → Evidence → Audit Pack</p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t.titleInput} className={inputClass} />
              <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder={t.ownerInput} className={inputClass} />
              <input value={articleRefs} onChange={(event) => setArticleRefs(event.target.value)} placeholder={t.articlesInput} className={inputClass} />
              <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value as EvidenceType)} className={inputClass}>
                <option value="policy">Policy</option>
                <option value="procedure">Procedure</option>
                <option value="risk_assessment">Risk assessment</option>
                <option value="training">Training</option>
                <option value="vendor_review">Vendor review</option>
                <option value="technical_documentation">Technical documentation</option>
                <option value="document">Document</option>
              </select>
              <button type="button" onClick={handleCreateEvidence} disabled={saving || !organizationId || !title.trim()} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {saving ? '...' : t.add}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-labelledby="recent-evidence-title">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <div>
                  <h2 id="recent-evidence-title" className="text-sm font-semibold text-slate-100">{t.recent}</h2>
                  <p className="mt-1 text-xs text-slate-600">Live workspace evidence linked to governance obligations.</p>
                </div>
              </div>
              <span className="rounded-md border border-slate-800 bg-[#0d1624] px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-400">{items.length}</span>
            </div>

            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500" role="status">{t.empty}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full border-collapse text-left">
                  <thead className="bg-[#080e18]">
                    <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                      <th className="px-5 py-3 sm:px-6">Evidence</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Articles</th>
                      <th className="px-5 py-3 text-right sm:px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {items.map((item) => (
                      <tr key={item.id} className="bg-[#0b121e] transition hover:bg-[#0e1827]">
                        <td className="px-5 py-4 sm:px-6">
                          <p className="max-w-[320px] truncate text-sm font-semibold text-slate-100">{item.title}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-400">{humanize(item.evidence_type)}</td>
                        <td className="px-4 py-4 text-xs text-slate-400">{item.owner_name || '—'}</td>
                        <td className="px-4 py-4 text-xs text-slate-500">{(item.article_refs || []).length ? (item.article_refs || []).join(' · ') : '—'}</td>
                        <td className="px-5 py-4 text-right sm:px-6">
                          <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(item.status)}`}>{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
