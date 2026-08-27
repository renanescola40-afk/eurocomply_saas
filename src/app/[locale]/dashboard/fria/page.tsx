'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileHeart, RefreshCw, Save, ShieldCheck } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getFriaWorkflowCopy } from '@/lib/i18n/fria-workflow-copy';
import { locales, type Locale } from '@/lib/i18n/routing';
import { roleHasPermission } from '@/lib/security/permissions';

type Assessment = {
  id: string;
  ai_system_id: string;
  version: number;
  applicability: 'required' | 'not_required' | 'uncertain';
  stage: string;
  context: Record<string, unknown>;
  affected_groups: unknown[];
  rights_map: unknown[];
  impact_analysis: Record<string, unknown>;
  mitigation_plan: Record<string, unknown>;
  oversight_plan: Record<string, unknown>;
  complaints_redress: Record<string, unknown>;
  highest_residual_impact: 'unknown' | 'none' | 'low' | 'medium' | 'high' | 'critical';
  reviewer_id: string | null;
  approver_id: string | null;
  legal_reviewer_id: string | null;
  legal_review_completed_at: string | null;
  updated_at: string;
};

type Evidence = {
  id: string;
  assessment_id: string;
  control_id: string;
  evidence_type: string;
  status: string;
};

type AiSystem = {
  id: string;
  name: string;
  risk_level: string;
  lifecycle_status: string;
};

type Snapshot = {
  assessments: Assessment[];
  evidence: Evidence[];
  role?: string | null;
};

type AssignmentKind = 'reviewer' | 'approver' | 'legalReviewer';

type AssigneeCandidate = {
  userId: string;
  displayName: string;
  email: string | null;
  role: string;
  eligibleFor: AssignmentKind[];
};

type AssigneeResponse = {
  candidates?: AssigneeCandidate[];
  error?: string;
};

type WorkflowResponse = {
  error?: string;
  assessment?: Assessment;
  evidence?: Evidence;
};

type ControlCopy = {
  publicAuthority: string;
  highRisk: string;
  vulnerableGroups: string;
  monitoring: string;
  dataProtection: string;
};

const CONTROL_COPY: Record<Locale, ControlCopy> = {
  en: {
    publicAuthority: 'Public authority or public-service context applies',
    highRisk: 'High-risk system context applies',
    vulnerableGroups: 'Vulnerable groups were considered',
    monitoring: 'Monitoring plan is complete',
    dataProtection: 'Data-protection coordination is complete',
  },
  pt: {
    publicAuthority: 'Aplica-se contexto de autoridade pública ou serviço público',
    highRisk: 'Aplica-se contexto de sistema de alto risco',
    vulnerableGroups: 'Os grupos vulneráveis foram considerados',
    monitoring: 'O plano de monitorização está concluído',
    dataProtection: 'A coordenação de proteção de dados está concluída',
  },
  es: {
    publicAuthority: 'Se aplica un contexto de autoridad o servicio público',
    highRisk: 'Se aplica un contexto de sistema de alto riesgo',
    vulnerableGroups: 'Se consideraron los grupos vulnerables',
    monitoring: 'El plan de supervisión está completo',
    dataProtection: 'La coordinación de protección de datos está completa',
  },
  fr: {
    publicAuthority: 'Un contexte d’autorité ou de service public s’applique',
    highRisk: 'Un contexte de système à haut risque s’applique',
    vulnerableGroups: 'Les groupes vulnérables ont été pris en compte',
    monitoring: 'Le plan de suivi est terminé',
    dataProtection: 'La coordination de la protection des données est terminée',
  },
  it: {
    publicAuthority: 'Si applica un contesto di autorità o servizio pubblico',
    highRisk: 'Si applica un contesto di sistema ad alto rischio',
    vulnerableGroups: 'Sono stati considerati i gruppi vulnerabili',
    monitoring: 'Il piano di monitoraggio è completo',
    dataProtection: 'Il coordinamento sulla protezione dei dati è completo',
  },
  de: {
    publicAuthority: 'Ein Behörden- oder öffentlicher Dienstkontext liegt vor',
    highRisk: 'Ein Hochrisiko-Systemkontext liegt vor',
    vulnerableGroups: 'Schutzbedürftige Gruppen wurden berücksichtigt',
    monitoring: 'Der Überwachungsplan ist vollständig',
    dataProtection: 'Die Datenschutzkoordination ist abgeschlossen',
  },
};

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function jsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseObject(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function candidateLabel(candidate: AssigneeCandidate) {
  const identity = candidate.email && candidate.email !== candidate.displayName
    ? `${candidate.displayName} · ${candidate.email}`
    : candidate.displayName;
  return `${identity} · ${candidate.role}`;
}

const controlClass = 'mt-2 w-full rounded-lg border border-white/[0.085] bg-black/20 px-3 py-2.5 text-sm text-white/82 outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus-visible:ring-2 focus-visible:ring-emerald-300/55 disabled:cursor-not-allowed disabled:opacity-55';
const textareaClass = `${controlClass} min-h-28 resize-y`;
const secondaryButton = 'inline-flex min-h-9 items-center justify-center rounded-lg border border-white/[0.085] bg-white/[0.025] px-3 text-xs font-semibold text-white/62 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50';
const checkClass = 'flex items-start gap-3 rounded-lg border border-white/[0.075] bg-black/15 px-3 py-3 text-sm leading-5 text-white/62';

function SurfaceHeader({ title, description, right }: { title: string; description?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.055] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-white/88">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-white/36">{description}</p> : null}
      </div>
      {right}
    </div>
  );
}

export default function FriaPage() {
  const params = useParams<{ locale?: string }>();
  const searchParams = useSearchParams();
  const locale = (locales.includes(params.locale as Locale) ? params.locale : 'en') as Locale;
  const assessmentHint = searchParams.get('assessment');
  const text = useMemo(() => getFriaWorkflowCopy(locale), [locale]);
  const controlCopy = CONTROL_COPY[locale];

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [systems, setSystems] = useState<AiSystem[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [aiSystemId, setAiSystemId] = useState('');
  const [applicability, setApplicability] = useState<Assessment['applicability']>('uncertain');
  const [intendedPurpose, setIntendedPurpose] = useState('');
  const [affectedGroups, setAffectedGroups] = useState('');
  const [rights, setRights] = useState('');
  const [impact, setImpact] = useState('{}');
  const [mitigation, setMitigation] = useState('{}');
  const [oversight, setOversight] = useState('{}');
  const [redress, setRedress] = useState('{}');
  const [residual, setResidual] = useState<Assessment['highest_residual_impact']>('unknown');

  const [publicAuthorityOrPublicService, setPublicAuthorityOrPublicService] = useState(false);
  const [highRiskSystem, setHighRiskSystem] = useState(false);
  const [vulnerableGroupsConsidered, setVulnerableGroupsConsidered] = useState(false);
  const [monitoringPlanComplete, setMonitoringPlanComplete] = useState(false);
  const [dataProtectionCoordinationComplete, setDataProtectionCoordinationComplete] = useState(false);

  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [legalReviewerId, setLegalReviewerId] = useState('');
  const [legalReviewComplete, setLegalReviewComplete] = useState(false);
  const [candidates, setCandidates] = useState<AssigneeCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState(false);

  const [controlId, setControlId] = useState('FRIA-01');
  const [evidenceType, setEvidenceType] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [evidenceDigest, setEvidenceDigest] = useState('');
  const [approvalRationale, setApprovalRationale] = useState('');

  const canManage = roleHasPermission(snapshot?.role, 'manage_ai_governance');
  const current = useMemo(
    () => snapshot?.assessments.find((assessment) => assessment.id === selected),
    [selected, snapshot],
  );
  const currentEvidence = useMemo(
    () => snapshot?.evidence.filter((item) => item.assessment_id === selected) ?? [],
    [selected, snapshot],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      const [friaResponse, systemsResponse] = await Promise.all([
        fetch('/api/ai-governance/fria', { cache: 'no-store', credentials: 'same-origin' }),
        fetch('/api/ai-systems', { cache: 'no-store', credentials: 'same-origin' }),
      ]);
      const fria = await friaResponse.json() as Snapshot & { error?: string };
      const inventory = await systemsResponse.json() as { systems?: AiSystem[]; error?: string } | AiSystem[];
      if (!friaResponse.ok) throw new Error(fria.error ?? 'fria_load_failed');
      if (!systemsResponse.ok) {
        throw new Error(!Array.isArray(inventory) ? inventory.error ?? 'inventory_load_failed' : 'inventory_load_failed');
      }
      const inventorySystems = Array.isArray(inventory) ? inventory : inventory.systems ?? [];
      setSnapshot(fria);
      setSystems(inventorySystems);
      setAiSystemId((value) => value || inventorySystems[0]?.id || '');
      setSelected((value) => {
        if (value && fria.assessments.some((assessment) => assessment.id === value)) return value;
        if (assessmentHint && fria.assessments.some((assessment) => assessment.id === assessmentHint)) return assessmentHint;
        return fria.assessments[0]?.id || '';
      });
    } catch {
      setNotice(text.loadError);
    } finally {
      setBusy(false);
    }
  }, [assessmentHint, text.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!current) return;
    setAiSystemId(current.ai_system_id);
    setApplicability(current.applicability);
    setIntendedPurpose(String(current.context?.intendedPurpose ?? ''));
    setAffectedGroups((current.affected_groups ?? []).join('\n'));
    setRights((current.rights_map ?? []).join('\n'));
    setImpact(jsonText(current.impact_analysis));
    setMitigation(jsonText(current.mitigation_plan));
    setOversight(jsonText(current.oversight_plan));
    setRedress(jsonText(current.complaints_redress));
    setResidual(current.highest_residual_impact);
    setPublicAuthorityOrPublicService(Boolean(current.context?.publicAuthorityOrPublicService));
    setHighRiskSystem(Boolean(current.context?.highRiskSystem));
    setVulnerableGroupsConsidered(Boolean(current.context?.vulnerableGroupsConsidered));
    setMonitoringPlanComplete(Boolean(current.context?.monitoringPlanComplete));
    setDataProtectionCoordinationComplete(Boolean(current.context?.dataProtectionCoordinationComplete));
    setReviewerId(current.reviewer_id ?? '');
    setApproverId(current.approver_id ?? '');
    setLegalReviewerId(current.legal_reviewer_id ?? '');
    setLegalReviewComplete(Boolean(current.legal_reviewer_id && current.legal_review_completed_at));
  }, [current]);

  useEffect(() => {
    if (!selected || !canManage) {
      setCandidates([]);
      setCandidatesLoading(false);
      setCandidatesError(false);
      return;
    }

    const controller = new AbortController();
    setCandidatesLoading(true);
    setCandidatesError(false);
    void (async () => {
      try {
        const response = await fetch(
          `/api/ai-governance/fria/assignees?assessment_id=${encodeURIComponent(selected)}`,
          { cache: 'no-store', credentials: 'same-origin', signal: controller.signal },
        );
        const payload = await response.json() as AssigneeResponse;
        if (!response.ok) throw new Error(payload.error ?? 'fria_assignee_load_failed');
        setCandidates(payload.candidates ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCandidates([]);
        setCandidatesError(true);
      } finally {
        if (!controller.signal.aborted) setCandidatesLoading(false);
      }
    })();

    return () => controller.abort();
  }, [canManage, selected]);

  function candidatesFor(kind: AssignmentKind) {
    return candidates.filter((candidate) => {
      if (!candidate.eligibleFor.includes(kind)) return false;
      if (kind === 'approver') return candidate.userId !== reviewerId;
      return true;
    });
  }

  async function run(workflow: string, body: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/ai-governance/fria?workflow=${encodeURIComponent(workflow)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as WorkflowResponse;
      if (!response.ok) throw new Error(payload.error ?? 'workflow_failed');
      if (payload.assessment) setSelected(payload.assessment.id);
      setNotice(text.saved);
      await load();
      return payload;
    } catch {
      setNotice(text.workflowError);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createAssessment() {
    if (!canManage || !aiSystemId) return;
    await run('assessment_create', {
      aiSystemId,
      applicability: 'uncertain',
      context: {},
    });
  }

  async function submitEvidence(assessment: Assessment) {
    if (!canManage || evidenceType.trim().length < 2) return;
    await run('evidence_submit', {
      assessmentId: assessment.id,
      controlId,
      evidenceType: evidenceType.trim(),
      storageReference: evidenceRef.trim() || null,
      sha256Digest: evidenceDigest.trim().toLowerCase() || null,
    });
  }

  async function saveCurrent(assessment: Assessment) {
    if (!canManage) return;
    const impactAnalysis = parseObject(impact);
    const mitigationPlan = parseObject(mitigation);
    const oversightPlan = parseObject(oversight);
    const complaintsRedress = parseObject(redress);
    if (!impactAnalysis || !mitigationPlan || !oversightPlan || !complaintsRedress) {
      setNotice(text.invalidJson);
      return;
    }
    if (approverId && approverId === reviewerId) {
      setNotice(text.workflowError);
      return;
    }

    await run('assessment_update', {
      assessmentId: assessment.id,
      expectedUpdatedAt: assessment.updated_at,
      applicability,
      context: {
        intendedPurpose,
        publicAuthorityOrPublicService, highRiskSystem, vulnerableGroupsConsidered,
      },
      affectedGroups: lines(affectedGroups),
      rightsMap: lines(rights),
      impactAnalysis,
      mitigationPlan,
      oversightPlan,
      complaintsRedress,
      highestResidualImpact: residual,
      reviewerId: reviewerId || null,
      approverId: approverId || null,
      legalReviewerId: legalReviewerId || null,
      legalReviewComplete,
      monitoringPlanComplete,
      dataProtectionCoordinationComplete,
    });
  }

  async function approveCurrent(assessment: Assessment) {
    if (!canManage || approvalRationale.trim().length < 10) return;
    await run('assessment_approve', {
      assessmentId: assessment.id,
      expectedUpdatedAt: assessment.updated_at,
      rationale: approvalRationale.trim(),
    });
  }

  return (
    <main className="min-h-0 bg-transparent text-white" aria-busy={busy}>
      <div className="w-full space-y-5">
        <header className="flex flex-col gap-4 border-b border-white/[0.065] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link href={`/${locale}/dashboard/regulatory-control-tower`} className="inline-flex items-center gap-2 text-xs font-medium text-white/42 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {text.back}
            </Link>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/65">{text.badge}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">{text.subtitle}</p>
          </div>
          <button type="button" className={secondaryButton} disabled={busy} onClick={() => void load()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" /> {text.refresh}
          </button>
        </header>

        <section className="flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-4 py-3 text-sm leading-6 text-amber-100/82" aria-label="FRIA legal boundary">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
          <p>{text.disclaimer}</p>
        </section>

        {notice ? <section className="rounded-xl border border-white/[0.075] bg-[#101715] px-4 py-3 text-sm text-white/62" role="status" aria-live="polite">{notice}</section> : null}
        {!snapshot && busy ? <section className="rounded-xl border border-white/[0.075] bg-[#101715] px-5 py-8 text-sm text-white/42" role="status">{text.loading}</section> : null}
        {snapshot && !canManage ? <section className="rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-5 py-4"><h2 className="text-sm font-semibold text-amber-100">{text.deniedTitle}</h2><p className="mt-1 text-sm leading-6 text-amber-100/65">{text.deniedBody}</p></section> : null}

        <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] lg:self-start lg:sticky lg:top-[92px]" aria-label={text.assessments}>
            <SurfaceHeader title={text.assessments} description={text.records(snapshot?.assessments.length ?? 0)} />
            {canManage ? (
              <div className="space-y-3 border-b border-white/[0.055] p-4">
                <Label htmlFor="fria-ai-system" className="sr-only">{text.selectAiSystem}</Label>
                <select id="fria-ai-system" aria-label={text.selectAiSystem} className={controlClass} value={aiSystemId} onChange={(event) => setAiSystemId(event.target.value)}>
                  <option value="">{text.selectAiSystem}</option>
                  {systems.map((system) => <option key={system.id} value={system.id}>{system.name} · {system.risk_level}</option>)}
                </select>
                <button type="button" className={`${primaryButton} w-full`} disabled={busy || !aiSystemId} onClick={() => void createAssessment()}><FileHeart className="mr-2 h-4 w-4" aria-hidden="true" />{text.createAssessment}</button>
              </div>
            ) : null}
            <div className="divide-y divide-white/[0.055]">
              {snapshot?.assessments.map((item) => (
                <button key={item.id} type="button" data-assessment-id={item.id} onClick={() => setSelected(item.id)} aria-pressed={selected === item.id} className={`w-full px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/55 ${selected === item.id ? 'bg-emerald-300/[0.07]' : 'hover:bg-white/[0.025]'}`}>
                  <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-white/82">{text.assessmentVersion(item.version)}</span><span className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] ${item.stage === 'approved' ? 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100' : 'border-white/[0.075] bg-white/[0.025] text-white/45'}`}>{item.stage}</span></div>
                  <p className="mt-1.5 truncate text-xs text-white/32">{systems.find((system) => system.id === item.ai_system_id)?.name ?? item.ai_system_id}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            {!current ? (
              <section className="rounded-xl border border-white/[0.075] bg-[#101715] px-5 py-10 text-sm text-white/42">{text.emptyAssessment}</section>
            ) : (
              <>
                <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
                  <SurfaceHeader title={text.assessmentVersion(current.version)} description={current.stage} right={current.stage === 'approved' ? <CheckCircle2 className="h-5 w-5 text-emerald-200" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5 text-amber-200" aria-hidden="true" />} />
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    <div><Label htmlFor="fria-applicability" className="text-xs text-white/48">{text.applicability}</Label><select id="fria-applicability" className={controlClass} disabled={!canManage} value={applicability} onChange={(event) => setApplicability(event.target.value as Assessment['applicability'])}>{(['uncertain', 'required', 'not_required'] as const).map((value) => <option key={value} value={value}>{text.applicabilityOptions[value]}</option>)}</select></div>
                    <div><Label htmlFor="fria-residual" className="text-xs text-white/48">{text.residualImpact}</Label><select id="fria-residual" className={controlClass} disabled={!canManage} value={residual} onChange={(event) => setResidual(event.target.value as Assessment['highest_residual_impact'])}>{(['unknown', 'none', 'low', 'medium', 'high', 'critical'] as const).map((value) => <option key={value} value={value}>{text.residualOptions[value]}</option>)}</select></div>
                    <div className="md:col-span-2"><Label htmlFor="fria-purpose" className="text-xs text-white/48">{text.intendedPurpose}</Label><Textarea id="fria-purpose" disabled={!canManage} value={intendedPurpose} onChange={(event) => setIntendedPurpose(event.target.value)} className={textareaClass} /></div>
                    <div><Label htmlFor="fria-groups" className="text-xs text-white/48">{text.affectedGroups}</Label><Textarea id="fria-groups" disabled={!canManage} value={affectedGroups} onChange={(event) => setAffectedGroups(event.target.value)} placeholder={text.onePerLine} className={textareaClass} /></div>
                    <div><Label htmlFor="fria-rights" className="text-xs text-white/48">{text.rightsMap}</Label><Textarea id="fria-rights" disabled={!canManage} value={rights} onChange={(event) => setRights(event.target.value)} placeholder={text.onePerLine} className={textareaClass} /></div>
                    <div><Label htmlFor="fria-impact" className="text-xs text-white/48">{text.impactAnalysis}</Label><Textarea id="fria-impact" disabled={!canManage} value={impact} onChange={(event) => setImpact(event.target.value)} className={`${textareaClass} font-mono text-xs`} /></div>
                    <div><Label htmlFor="fria-mitigation" className="text-xs text-white/48">{text.mitigationPlan}</Label><Textarea id="fria-mitigation" disabled={!canManage} value={mitigation} onChange={(event) => setMitigation(event.target.value)} className={`${textareaClass} font-mono text-xs`} /></div>
                    <div><Label htmlFor="fria-oversight" className="text-xs text-white/48">{text.oversightPlan}</Label><Textarea id="fria-oversight" disabled={!canManage} value={oversight} onChange={(event) => setOversight(event.target.value)} className={`${textareaClass} font-mono text-xs`} /></div>
                    <div><Label htmlFor="fria-redress" className="text-xs text-white/48">{text.redressPlan}</Label><Textarea id="fria-redress" disabled={!canManage} value={redress} onChange={(event) => setRedress(event.target.value)} className={`${textareaClass} font-mono text-xs`} /></div>
                    {canManage ? <div className="grid gap-2 md:col-span-2 sm:grid-cols-2" aria-label="FRIA control assertions"><label className={checkClass}><input type="checkbox" checked={publicAuthorityOrPublicService} onChange={(event) => setPublicAuthorityOrPublicService(event.target.checked)} /><span>{controlCopy.publicAuthority}</span></label><label className={checkClass}><input type="checkbox" checked={highRiskSystem} onChange={(event) => setHighRiskSystem(event.target.checked)} /><span>{controlCopy.highRisk}</span></label><label className={checkClass}><input type="checkbox" checked={vulnerableGroupsConsidered} onChange={(event) => setVulnerableGroupsConsidered(event.target.checked)} /><span>{controlCopy.vulnerableGroups}</span></label><label className={checkClass}><input type="checkbox" checked={monitoringPlanComplete} onChange={(event) => setMonitoringPlanComplete(event.target.checked)} /><span>{controlCopy.monitoring}</span></label><label className={checkClass}><input type="checkbox" checked={dataProtectionCoordinationComplete} onChange={(event) => setDataProtectionCoordinationComplete(event.target.checked)} /><span>{controlCopy.dataProtection}</span></label></div> : null}
                    <p className="text-xs leading-5 text-white/32 md:col-span-2">{text.structuredHelp}</p>
                  </div>
                </section>

                {canManage && current.stage !== 'approved' && current.stage !== 'retired' ? (
                  <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
                    <SurfaceHeader title={text.assignmentsTitle} description={text.assignmentsBody} />
                    <div className="grid gap-4 p-5 md:grid-cols-3">
                      {candidatesLoading ? <p className="text-sm text-white/42 md:col-span-3" role="status">{text.candidatesLoading}</p> : null}
                      {candidatesError ? <p className="text-sm text-rose-200 md:col-span-3" role="alert">{text.candidatesError}</p> : null}
                      {!candidatesLoading && !candidatesError && candidates.length === 0 ? <p className="text-sm text-amber-100 md:col-span-3" role="status">{text.candidatesEmpty}</p> : null}
                      <div><Label htmlFor="fria-reviewer" className="text-xs text-white/48">{text.reviewer}</Label><select id="fria-reviewer" className={controlClass} value={reviewerId} onChange={(event) => setReviewerId(event.target.value)}><option value="">{text.unassigned}</option>{candidatesFor('reviewer').map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidateLabel(candidate)}</option>)}</select></div>
                      <div><Label htmlFor="fria-approver" className="text-xs text-white/48">{text.approver}</Label><select id="fria-approver" className={controlClass} value={approverId} onChange={(event) => setApproverId(event.target.value)}><option value="">{text.unassigned}</option>{candidatesFor('approver').map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidateLabel(candidate)}</option>)}</select></div>
                      <div><Label htmlFor="fria-legal-reviewer" className="text-xs text-white/48">{text.legalReviewer}</Label><select id="fria-legal-reviewer" className={controlClass} value={legalReviewerId} onChange={(event) => setLegalReviewerId(event.target.value)}><option value="">{text.unassigned}</option>{candidatesFor('legalReviewer').map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidateLabel(candidate)}</option>)}</select></div>
                      <p className="text-xs leading-5 text-white/32 md:col-span-3">{text.separationHint}</p>
                      <label className={`${checkClass} md:col-span-3`}><input type="checkbox" checked={legalReviewComplete} onChange={(event) => setLegalReviewComplete(event.target.checked)} /><span>{text.legalReviewComplete}</span></label>
                      <button type="button" className={`${primaryButton} md:col-span-3`} disabled={busy} onClick={() => void saveCurrent(current)}><Save className="mr-2 h-4 w-4" aria-hidden="true" />{busy ? text.saving : text.saveAssessment}</button>
                    </div>
                  </section>
                ) : null}

                {canManage && current.stage !== 'approved' && current.stage !== 'retired' ? (
                  <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
                    <SurfaceHeader title={text.evidenceTitle} description={text.evidenceBody} />
                    <div className="grid gap-4 p-5 md:grid-cols-2">
                      <div><Label htmlFor="fria-control-id" className="text-xs text-white/48">{text.controlId}</Label><Input id="fria-control-id" value={controlId} onChange={(event) => setControlId(event.target.value)} className={controlClass} /></div>
                      <div><Label htmlFor="fria-evidence-type" className="text-xs text-white/48">{text.evidenceType}</Label><Input id="fria-evidence-type" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} placeholder={text.evidenceTypePlaceholder} className={controlClass} /></div>
                      <div><Label htmlFor="fria-storage-ref" className="text-xs text-white/48">{text.storageReference}</Label><Input id="fria-storage-ref" value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} placeholder={text.storageReferencePlaceholder} className={controlClass} /></div>
                      <div><Label htmlFor="fria-evidence-digest" className="text-xs text-white/48">{text.digest}</Label><Input id="fria-evidence-digest" value={evidenceDigest} onChange={(event) => setEvidenceDigest(event.target.value)} placeholder={text.digestPlaceholder} className={controlClass} /></div>
                      <p className="text-xs leading-5 text-white/32 md:col-span-2">{text.evidenceHelp}</p>
                      <button type="button" className={`${primaryButton} md:col-span-2`} disabled={busy || evidenceType.trim().length < 2 || (!evidenceRef.trim() && !evidenceDigest.trim())} onClick={() => void submitEvidence(current)}>{text.submitEvidence}</button>
                    </div>
                  </section>
                ) : null}

                <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
                  <SurfaceHeader title={text.evidenceRecords(currentEvidence.length)} />
                  {currentEvidence.length === 0 ? <p className="px-5 py-6 text-sm text-white/38">{text.noEvidence}</p> : <div className="divide-y divide-white/[0.055]">{currentEvidence.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-5 py-4 text-sm"><span className="font-semibold text-white/78">{item.control_id}</span><span className="text-white/20">·</span><span className="text-white/52">{item.evidence_type}</span><span className="ml-auto rounded-lg border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/42">{item.status}</span></div>)}</div>}
                </section>

                {canManage && current.stage !== 'approved' && current.stage !== 'retired' ? (
                  <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
                    <SurfaceHeader title={text.approvalTitle} description={text.approvalBody} />
                    <div className="space-y-4 p-5">
                      <div><Label htmlFor="fria-approval-rationale" className="text-xs text-white/48">{text.approvalRationale}</Label><Textarea id="fria-approval-rationale" value={approvalRationale} onChange={(event) => setApprovalRationale(event.target.value)} placeholder={text.approvalPlaceholder} className={textareaClass} /></div>
                      <button type="button" className={primaryButton} disabled={busy || approvalRationale.trim().length < 10} onClick={() => void approveCurrent(current)}>{text.approve}</button>
                    </div>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
