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
    titleInput: 'Evidence title', ownerInput: 'Owner or team', articlesInput: 'Articles, e.g. Article 9, Article 14', add: 'Add evidence', coverage: 'Evidence Coverage', valid: 'Valid evidence', review: 'Needs review', expired: 'Expired', recent: 'Recent evidence', empty: 'No evidence yet. Add your first policy or procedure.',
  },
  pt: {
    back: 'Voltar ao dashboard', badge: 'Evidence Vault', title: 'Centro de evidências de auditoria', subtitle: 'Registre políticas, procedimentos, avaliações de risco e provas ligadas aos artigos do EU AI Act.',
    titleInput: 'Título da evidência', ownerInput: 'Responsável ou equipe', articlesInput: 'Artigos, ex: Article 9, Article 14', add: 'Adicionar evidência', coverage: 'Cobertura de evidências', valid: 'Evidências válidas', review: 'Precisam revisão', expired: 'Expiradas', recent: 'Evidências recentes', empty: 'Nenhuma evidência ainda. Adicione sua primeira política ou procedimento.',
  },
  es: {
    back: 'Volver al dashboard', badge: 'Evidence Vault', title: 'Centro de evidencias de auditoría', subtitle: 'Registra políticas, procedimientos, evaluaciones de riesgo y pruebas vinculadas al EU AI Act.',
    titleInput: 'Título de la evidencia', ownerInput: 'Responsable o equipo', articlesInput: 'Artículos, ej: Article 9, Article 14', add: 'Agregar evidencia', coverage: 'Cobertura de evidencias', valid: 'Evidencias válidas', review: 'Requieren revisión', expired: 'Expiradas', recent: 'Evidencias recientes', empty: 'Aún no hay evidencias. Agrega tu primera política o procedimiento.',
  },
  fr: {
    back: 'Retour au dashboard', badge: 'Evidence Vault', title: 'Centre de preuves audit', subtitle: 'Enregistrez politiques, procédures, évaluations de risque et preuves liées à l’EU AI Act.',
    titleInput: 'Titre de la preuve', ownerInput: 'Responsable ou équipe', articlesInput: 'Articles, ex : Article 9, Article 14', add: 'Ajouter une preuve', coverage: 'Couverture des preuves', valid: 'Preuves valides', review: 'À revoir', expired: 'Expirées', recent: 'Preuves récentes', empty: 'Aucune preuve pour le moment. Ajoutez votre première politique ou procédure.',
  },
  it: {
    back: 'Torna alla dashboard', badge: 'Evidence Vault', title: 'Centro evidenze audit', subtitle: 'Registra policy, procedure, risk assessment e prove collegate agli articoli EU AI Act.',
    titleInput: 'Titolo evidenza', ownerInput: 'Responsabile o team', articlesInput: 'Articoli, es: Article 9, Article 14', add: 'Aggiungi evidenza', coverage: 'Copertura evidenze', valid: 'Evidenze valide', review: 'Da revisionare', expired: 'Scadute', recent: 'Evidenze recenti', empty: 'Nessuna evidenza. Aggiungi la prima policy o procedura.',
  },
  de: {
    back: 'Zurück zum Dashboard', badge: 'Evidence Vault', title: 'Audit-Nachweiszentrum', subtitle: 'Erfassen Sie Richtlinien, Verfahren, Risikoanalysen und Nachweise zu EU-AI-Act-Artikeln.',
    titleInput: 'Nachweistitel', ownerInput: 'Owner oder Team', articlesInput: 'Artikel, z. B. Article 9, Article 14', add: 'Nachweis hinzufügen', coverage: 'Nachweisabdeckung', valid: 'Gültige Nachweise', review: 'Prüfung nötig', expired: 'Abgelaufen', recent: 'Aktuelle Nachweise', empty: 'Noch keine Nachweise. Fügen Sie die erste Richtlinie oder das erste Verfahren hinzu.',
  },
} as const;

type Locale = keyof typeof copy;

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
  const inputClass = 'w-full rounded-xl border border-white/[0.09] bg-black/20 px-3 py-2.5 text-sm text-white/82 outline-none transition placeholder:text-white/25 focus:border-emerald-300/35 focus-visible:ring-2 focus-visible:ring-emerald-300/55';

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-4 border-b border-white/[0.065] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{t.badge}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{t.subtitle}</p>
          </div>
          <button type="button" onClick={() => router.push(`/${locale}/dashboard`)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm font-medium text-white/58 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t.back}
          </button>
        </header>

        {tenantError ? <p className="rounded-xl border border-amber-300/20 bg-amber-300/[0.055] px-4 py-3 text-sm text-amber-100" role="alert">{tenantError}</p> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t.coverage}>
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-xl border border-white/[0.075] bg-[#101715] p-4">
              <p className="text-xs font-medium text-white/40">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white/88">{metric.value}</p>
              {typeof metric.progress === 'number' ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={metric.progress} aria-label={metric.label}>
                  <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(0, Math.min(100, metric.progress))}%` }} />
                </div>
              ) : null}
            </article>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="add-evidence-title">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
              <Plus className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              <div>
                <h2 id="add-evidence-title" className="text-sm font-semibold text-white/88">{t.add}</h2>
                <p className="mt-0.5 text-xs text-white/34">Assessment → Finding → Evidence → Audit Pack</p>
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
              <button type="button" onClick={handleCreateEvidence} disabled={saving || !organizationId || !title.trim()} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {saving ? '...' : t.add}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="recent-evidence-title">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-emerald-300" aria-hidden="true" /><h2 id="recent-evidence-title" className="text-sm font-semibold text-white/88">{t.recent}</h2></div>
              <span className="text-xs text-white/30">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="p-6 text-sm text-white/42" role="status">{t.empty}</p>
            ) : (
              <div className="divide-y divide-white/[0.055]">
                {items.map((item) => (
                  <article key={item.id} className="px-5 py-4 transition-colors hover:bg-white/[0.018]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white/84">{item.title}</p>
                        <p className="mt-1 text-xs text-white/36">{item.owner_name || '-'} · {item.evidence_type}</p>
                        {(item.article_refs || []).length ? <p className="mt-2 text-xs text-white/42">{(item.article_refs || []).join(' · ')}</p> : null}
                      </div>
                      <span className="shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/48">{item.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
