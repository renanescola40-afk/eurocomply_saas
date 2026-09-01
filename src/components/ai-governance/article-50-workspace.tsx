'use client';

import { useEffect, useMemo, useState } from 'react';

import { getArticle50DeadlineView } from '@/lib/article-50-deadlines';

type SystemRecord = {
  id: string;
  name: string;
  use_case: string;
  role: string;
  interacts_with_people: boolean;
  generates_content: boolean;
};

type AssessmentRecord = {
  id: string;
  ai_system_id: string;
  version: number;
  status: 'BLOCKED' | 'NEEDS_REVIEW' | 'READY';
  placed_on_market_at: string | null;
  provider_machine_readable_marking: boolean;
  deployer_disclosure: boolean;
  final_amending_act_verified: boolean;
  official_journal_evidence_id: string | null;
  disclosure_copy: string | null;
  disclosure_language: string | null;
  disclosure_channel: string | null;
  display_evidence_reference: string | null;
  marking_evidence_reference: string | null;
  blockers: string[];
  warnings: string[];
  created_at: string;
};

type EvidenceRecord = {
  id: string;
  assessment_id: string;
  evidence_type: string;
  storage_reference: string | null;
  source_url: string | null;
  environment: string;
  status: string;
  created_at: string;
};

type WorkspacePayload = {
  systems: SystemRecord[];
  assessments: AssessmentRecord[];
  latestAssessments: Record<string, AssessmentRecord>;
  evidence: EvidenceRecord[];
  portfolio: {
    summary: { total: number; ready: number; needsReview: number; blocked: number };
  };
  legalSourceVersion: string;
  role: string;
  truthBoundary: string;
};

type AssessmentForm = {
  systemId: string;
  placedOnMarketAt: string;
  providerMachineReadableMarking: boolean;
  deployerDisclosure: boolean;
  finalAmendingActVerifiedInOfficialJournal: boolean;
  officialJournalEvidenceId: string;
  disclosureCopy: string;
  disclosureLanguage: string;
  disclosureChannel: string;
  displayEvidenceReference: string;
  markingEvidenceReference: string;
};

type EvidenceForm = {
  assessmentId: string;
  evidenceType: string;
  storageReference: string;
  sha256Digest: string;
  sourceUrl: string;
  environment: 'local' | 'ci' | 'staging' | 'production' | 'customer';
  limitations: string;
  validUntil: string;
};

const emptyAssessment: AssessmentForm = {
  systemId: '',
  placedOnMarketAt: '',
  providerMachineReadableMarking: false,
  deployerDisclosure: false,
  finalAmendingActVerifiedInOfficialJournal: false,
  officialJournalEvidenceId: '',
  disclosureCopy: '',
  disclosureLanguage: 'pt-PT',
  disclosureChannel: 'website',
  displayEvidenceReference: '',
  markingEvidenceReference: '',
};

const emptyEvidence: EvidenceForm = {
  assessmentId: '',
  evidenceType: 'proof_of_display',
  storageReference: '',
  sha256Digest: '',
  sourceUrl: '',
  environment: 'customer',
  limitations: '',
  validUntil: '',
};

const disclosureTemplates = {
  interaction:
    'Está a interagir diretamente com um sistema de inteligência artificial. Pode solicitar apoio humano através de [canal de contacto].',
  deepfake:
    'Este conteúdo foi gerado ou manipulado por inteligência artificial e pode não representar pessoas, objetos, lugares ou acontecimentos reais.',
  publicInterest:
    'Este texto sobre matéria de interesse público foi gerado ou manipulado com inteligência artificial e não foi sujeito a revisão humana ou controlo editorial.',
};

function statusClass(status: AssessmentRecord['status']) {
  if (status === 'READY') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'NEEDS_REVIEW') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-red-500/30 bg-red-500/10 text-red-200';
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Não registado';
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined,
  }).format(new Date(value));
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = typeof payload.error === 'string' ? payload.error : 'request_failed';
    throw new Error(error);
  }
  return payload;
}

const fieldClassName = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/35 px-3 py-2 text-white outline-none transition focus:border-blue-400/60 focus-visible:ring-2 focus-visible:ring-blue-400/50';
const panelClassName = 'rounded-xl border border-slate-800/80 bg-[#0d1522] p-5';

export function Article50Workspace({ locale }: { locale: string }) {
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [assessment, setAssessment] = useState<AssessmentForm>(emptyAssessment);
  const [evidence, setEvidence] = useState<EvidenceForm>(emptyEvidence);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await readJson(
        await fetch('/api/ai-governance/article-50', {
          credentials: 'same-origin',
          cache: 'no-store',
        }),
      ) as WorkspacePayload;
      setWorkspace(payload);
      const firstSystem = payload.systems[0];
      if (firstSystem) {
        selectSystem(firstSystem.id, payload);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'article50_load_failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSystem = (systemId: string, source = workspace) => {
    if (!source) return;
    const latest = source.latestAssessments[systemId];
    setAssessment({
      systemId,
      placedOnMarketAt: latest?.placed_on_market_at ?? '',
      providerMachineReadableMarking: latest?.provider_machine_readable_marking ?? false,
      deployerDisclosure: latest?.deployer_disclosure ?? false,
      finalAmendingActVerifiedInOfficialJournal: latest?.final_amending_act_verified ?? false,
      officialJournalEvidenceId: latest?.official_journal_evidence_id ?? '',
      disclosureCopy: latest?.disclosure_copy ?? '',
      disclosureLanguage: latest?.disclosure_language ?? 'pt-PT',
      disclosureChannel: latest?.disclosure_channel ?? 'website',
      displayEvidenceReference: latest?.display_evidence_reference ?? '',
      markingEvidenceReference: latest?.marking_evidence_reference ?? '',
    });
    setEvidence((current) => ({
      ...current,
      assessmentId: latest?.id ?? '',
    }));
    setSuccess(null);
    setError(null);
  };

  const selectedSystem = useMemo(
    () => workspace?.systems.find((system) => system.id === assessment.systemId) ?? null,
    [assessment.systemId, workspace],
  );
  const selectedLatest = assessment.systemId
    ? workspace?.latestAssessments[assessment.systemId]
    : undefined;

  const preExisting = Boolean(
    assessment.placedOnMarketAt && assessment.placedOnMarketAt < '2026-08-02',
  );
  const markingDeadline = getArticle50DeadlineView({
    obligation: 'article_50_2_machine_readable_marking',
    systemPlacedOnMarketBefore2026_08_02: preExisting,
    finalAmendingActVerifiedInOfficialJournal:
      assessment.finalAmendingActVerifiedInOfficialJournal,
  });
  const disclosureDeadline = getArticle50DeadlineView({
    obligation: 'article_50_4_deployer_disclosure',
    systemPlacedOnMarketBefore2026_08_02: preExisting,
    finalAmendingActVerifiedInOfficialJournal:
      assessment.finalAmendingActVerifiedInOfficialJournal,
  });

  const saveAssessment = async () => {
    if (!assessment.systemId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await readJson(
        await fetch('/api/ai-governance/article-50?workflow=assessment_create', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...assessment,
            placedOnMarketAt: assessment.placedOnMarketAt || null,
            officialJournalEvidenceId: assessment.officialJournalEvidenceId || null,
            disclosureCopy: assessment.disclosureCopy || null,
            disclosureLanguage: assessment.disclosureLanguage || null,
            disclosureChannel: assessment.disclosureChannel || null,
            displayEvidenceReference: assessment.displayEvidenceReference || null,
            markingEvidenceReference: assessment.markingEvidenceReference || null,
          }),
        }),
      );
      setSuccess('Nova versão da avaliação guardada com trilho de auditoria.');
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'article50_save_failed');
    } finally {
      setSaving(false);
    }
  };

  const submitEvidence = async () => {
    if (!evidence.assessmentId) {
      setError('Guarde primeiro uma versão da avaliação.');
      return;
    }
    setSubmittingEvidence(true);
    setError(null);
    setSuccess(null);
    try {
      await readJson(
        await fetch('/api/ai-governance/article-50?workflow=evidence_submit', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: evidence.assessmentId,
            evidenceType: evidence.evidenceType,
            storageReference: evidence.storageReference || null,
            sha256Digest: evidence.sha256Digest || null,
            sourceUrl: evidence.sourceUrl || null,
            environment: evidence.environment,
            limitations: evidence.limitations
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean),
            validUntil: evidence.validUntil
              ? new Date(evidence.validUntil).toISOString()
              : null,
          }),
        }),
      );
      setSuccess('Evidência registada. O estado submetido não equivale a aprovação.');
      setEvidence((current) => ({
        ...emptyEvidence,
        assessmentId: current.assessmentId,
      }));
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'article50_evidence_failed');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-white/60">A carregar o workspace do Artigo 50…</div>;
  }

  if (!workspace) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
        Não foi possível carregar o workspace. {error}
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-16 text-slate-100" aria-labelledby="article-50-title">
      <header className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              EU AI Act · Artigo 50
            </p>
            <h1 id="article-50-title" className="mt-2 text-2xl font-semibold text-white">
              Transparência operacional
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              Avalie cada sistema, separe deveres de provider e deployer, retenha prova de
              marcação e de exibição e mantenha versões históricas. A data-base vinculativa é
              2 de agosto de 2026.
            </p>
          </div>
          <a
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white/80 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            href="https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems"
            target="_blank"
            rel="noreferrer"
          >
            Orientações oficiais da Comissão
          </a>
        </div>
        <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-50/90">
          {workspace.truthBoundary}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do portfólio">
        {[
          ['Sistemas', workspace.portfolio.summary.total],
          ['Ready', workspace.portfolio.summary.ready],
          ['Revisão', workspace.portfolio.summary.needsReview],
          ['Bloqueados', workspace.portfolio.summary.blocked],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-5">
            <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </section>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      {success ? (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className={panelClassName}>
          <h2 className="text-base font-semibold text-white">Sistemas de IA</h2>
          <p className="mt-1 text-sm text-white/50">
            A organização e o tenant são derivados no servidor.
          </p>
          <div className="mt-4 space-y-2">
            {workspace.systems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-white/50">
                Adicione primeiro um sistema ao inventário de IA.
              </p>
            ) : workspace.systems.map((system) => {
              const latest = workspace.latestAssessments[system.id];
              return (
                <button
                  key={system.id}
                  type="button"
                  onClick={() => selectSystem(system.id)}
                  aria-pressed={assessment.systemId === system.id}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    assessment.systemId === system.id
                      ? 'border-blue-400/40 bg-blue-500/10'
                      : 'border-slate-800 bg-slate-950/20 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{system.name}</span>
                    {latest ? (
                      <span className={`rounded-lg border px-2 py-1 text-[11px] ${statusClass(latest.status)}`}>
                        {latest.status}
                      </span>
                    ) : (
                      <span className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-white/45">
                        Sem avaliação
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">
                    {system.use_case || 'Caso de uso não descrito'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className={panelClassName}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                {selectedSystem?.name ?? 'Selecione um sistema'}
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Cada gravação cria uma versão imutável, sem sobrescrever decisões anteriores.
              </p>
            </div>
            {selectedLatest ? (
              <span className={`rounded-lg border px-3 py-1 text-xs ${statusClass(selectedLatest.status)}`}>
                v{selectedLatest.version} · {selectedLatest.status}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/70">
              Data de colocação no mercado/serviço
              <input
                type="date"
                value={assessment.placedOnMarketAt}
                onChange={(event) => setAssessment((current) => ({ ...current, placedOnMarketAt: event.target.value }))}
                className={fieldClassName}
              />
            </label>
            <label className="text-sm text-white/70">
              Idioma do aviso
              <input
                value={assessment.disclosureLanguage}
                onChange={(event) => setAssessment((current) => ({ ...current, disclosureLanguage: event.target.value }))}
                maxLength={32}
                className={fieldClassName}
              />
            </label>
            <label className="text-sm text-white/70">
              Canal do aviso
              <select
                value={assessment.disclosureChannel}
                onChange={(event) => setAssessment((current) => ({ ...current, disclosureChannel: event.target.value }))}
                className={fieldClassName}
              >
                <option value="website">Website</option>
                <option value="chat">Chat</option>
                <option value="phone">Telefone/IVR</option>
                <option value="email">Email</option>
                <option value="video">Vídeo</option>
                <option value="social">Rede social</option>
                <option value="document">Documento</option>
              </select>
            </label>
            <label className="text-sm text-white/70">
              Prova de exibição
              <input
                value={assessment.displayEvidenceReference}
                onChange={(event) => setAssessment((current) => ({ ...current, displayEvidenceReference: event.target.value }))}
                placeholder="org-id/article50/screenshots/..."
                maxLength={1024}
                className={fieldClassName}
              />
            </label>
          </div>

          <fieldset className="mt-5 space-y-3">
            <legend className="text-sm font-medium text-white">Controlos declarados</legend>
            <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/20 p-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={assessment.providerMachineReadableMarking}
                onChange={(event) => setAssessment((current) => ({ ...current, providerMachineReadableMarking: event.target.checked }))}
                className="mt-1"
              />
              <span>Provider: marcação machine-readable implementada e testada.</span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/20 p-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={assessment.deployerDisclosure}
                onChange={(event) => setAssessment((current) => ({ ...current, deployerDisclosure: event.target.checked }))}
                className="mt-1"
              />
              <span>Deployer: aviso human-readable efetivamente exibido às pessoas afetadas.</span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/20 p-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={assessment.finalAmendingActVerifiedInOfficialJournal}
                onChange={(event) => setAssessment((current) => ({ ...current, finalAmendingActVerifiedInOfficialJournal: event.target.checked }))}
                className="mt-1"
              />
              <span>O ato final de alteração foi verificado no Jornal Oficial e a prova foi retida.</span>
            </label>
          </fieldset>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/70">
              Referência da prova de marcação
              <input
                value={assessment.markingEvidenceReference}
                onChange={(event) => setAssessment((current) => ({ ...current, markingEvidenceReference: event.target.value }))}
                maxLength={1024}
                className={fieldClassName}
              />
            </label>
            <label className="text-sm text-white/70">
              ID da prova do Jornal Oficial
              <input
                value={assessment.officialJournalEvidenceId}
                onChange={(event) => setAssessment((current) => ({ ...current, officialJournalEvidenceId: event.target.value }))}
                maxLength={512}
                className={fieldClassName}
              />
            </label>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setAssessment((current) => ({ ...current, disclosureCopy: disclosureTemplates.interaction }))} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-white/70 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06]">Interação</button>
              <button type="button" onClick={() => setAssessment((current) => ({ ...current, disclosureCopy: disclosureTemplates.deepfake }))} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-white/70 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06]">Deepfake</button>
              <button type="button" onClick={() => setAssessment((current) => ({ ...current, disclosureCopy: disclosureTemplates.publicInterest }))} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-white/70 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06]">Interesse público</button>
            </div>
            <label className="text-sm text-white/70">
              Cópia exata do aviso
              <textarea
                value={assessment.disclosureCopy}
                onChange={(event) => setAssessment((current) => ({ ...current, disclosureCopy: event.target.value }))}
                rows={5}
                maxLength={8000}
                className={fieldClassName}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[markingDeadline, disclosureDeadline].map((deadline) => (
              <div key={deadline.obligation} className="rounded-lg border border-slate-800 bg-slate-950/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                  {deadline.obligation.includes('50_2') ? 'Provider · Art. 50(2)' : 'Deployer · Art. 50(4)'}
                </p>
                <p className="mt-2 text-sm text-white/80">{deadline.customerLabel}</p>
                {deadline.warning ? <p className="mt-2 text-xs leading-5 text-amber-200">{deadline.warning}</p> : null}
              </div>
            ))}
          </div>

          {selectedLatest?.blockers?.length ? (
            <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm font-medium text-red-100">Bloqueios da versão atual</p>
              <ul className="mt-2 space-y-1 text-sm text-red-100/80">
                {selectedLatest.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!assessment.systemId || saving}
            onClick={() => void saveAssessment()}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar nova versão'}
          </button>
        </div>
      </section>

      <section className={panelClassName}>
        <h2 className="text-base font-semibold text-white">Registar evidência</h2>
        <p className="mt-1 text-sm text-white/50">
          Uma evidência submetida permanece pendente até revisão. Não cole segredos, tokens ou dados pessoais no formulário.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm text-white/70">
            Avaliação
            <select
              value={evidence.assessmentId}
              onChange={(event) => setEvidence((current) => ({ ...current, assessmentId: event.target.value }))}
              className={fieldClassName}
            >
              <option value="">Selecione</option>
              {workspace.assessments.map((item) => (
                <option key={item.id} value={item.id}>
                  {workspace.systems.find((system) => system.id === item.ai_system_id)?.name ?? item.ai_system_id} · v{item.version}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-white/70">
            Tipo
            <select
              value={evidence.evidenceType}
              onChange={(event) => setEvidence((current) => ({ ...current, evidenceType: event.target.value }))}
              className={fieldClassName}
            >
              <option value="placement_date">Data de colocação</option>
              <option value="machine_readable_marking">Marcação machine-readable</option>
              <option value="human_readable_disclosure">Aviso human-readable</option>
              <option value="official_journal_source">Fonte do Jornal Oficial</option>
              <option value="proof_of_display">Prova de exibição</option>
              <option value="accessibility_validation">Validação de acessibilidade</option>
              <option value="translation_review">Revisão de tradução</option>
            </select>
          </label>
          <label className="text-sm text-white/70">
            Ambiente
            <select
              value={evidence.environment}
              onChange={(event) => setEvidence((current) => ({ ...current, environment: event.target.value as EvidenceForm['environment'] }))}
              className={fieldClassName}
            >
              <option value="local">Local</option>
              <option value="ci">CI</option>
              <option value="staging">Staging</option>
              <option value="production">Produção</option>
              <option value="customer">Cliente</option>
            </select>
          </label>
          <label className="text-sm text-white/70">
            Referência de storage
            <input value={evidence.storageReference} onChange={(event) => setEvidence((current) => ({ ...current, storageReference: event.target.value }))} className={fieldClassName} />
          </label>
          <label className="text-sm text-white/70">
            SHA-256
            <input value={evidence.sha256Digest} onChange={(event) => setEvidence((current) => ({ ...current, sha256Digest: event.target.value.toLowerCase() }))} maxLength={64} className={`${fieldClassName} font-mono text-xs`} />
          </label>
          <label className="text-sm text-white/70">
            URL HTTPS da fonte
            <input type="url" value={evidence.sourceUrl} onChange={(event) => setEvidence((current) => ({ ...current, sourceUrl: event.target.value }))} className={fieldClassName} />
          </label>
          <label className="text-sm text-white/70 md:col-span-2">
            Limitações, uma por linha
            <textarea value={evidence.limitations} onChange={(event) => setEvidence((current) => ({ ...current, limitations: event.target.value }))} rows={3} className={fieldClassName} />
          </label>
          <label className="text-sm text-white/70">
            Válida até
            <input type="datetime-local" value={evidence.validUntil} onChange={(event) => setEvidence((current) => ({ ...current, validUntil: event.target.value }))} className={fieldClassName} />
          </label>
        </div>
        <button
          type="button"
          disabled={!evidence.assessmentId || submittingEvidence}
          onClick={() => void submitEvidence()}
          className="mt-5 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:border-blue-400/35 hover:bg-blue-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submittingEvidence ? 'A registar…' : 'Registar evidência'}
        </button>
      </section>

      <section className={panelClassName}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Histórico de evidência</h2>
            <p className="mt-1 text-sm text-white/50">Fonte jurídica: {workspace.legalSourceVersion}</p>
          </div>
          <span className="text-xs text-white/40">Perfil: {workspace.role} · locale: {locale}</span>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/35 text-xs uppercase tracking-wide text-white/35">
              <tr>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Ambiente</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Referência</th>
                <th className="px-3 py-2">Criada</th>
              </tr>
            </thead>
            <tbody>
              {workspace.evidence.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-white/45">Nenhuma evidência registada.</td></tr>
              ) : workspace.evidence.map((item) => (
                <tr key={item.id} className="border-t border-slate-800 text-white/65">
                  <td className="px-3 py-3">{item.evidence_type}</td>
                  <td className="px-3 py-3">{item.environment}</td>
                  <td className="px-3 py-3">{item.status}</td>
                  <td className="max-w-xs truncate px-3 py-3">{item.storage_reference ?? item.source_url ?? 'Digest retido'}</td>
                  <td className="px-3 py-3">{formatDate(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
