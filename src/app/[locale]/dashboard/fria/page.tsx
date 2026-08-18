'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileHeart, RefreshCw, Save, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  const selectClass = 'mt-2 w-full rounded-md border border-white/10 bg-black p-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-60';
  const checkClass = 'flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200';

  return (
    <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white" aria-busy={busy}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Button asChild variant="ghost">
            <Link href={`/${locale}/dashboard/regulatory-control-tower`} className="focus-visible:ring-2 focus-visible:ring-violet-300">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />{text.back}
            </Link>
          </Button>
          <Badge className="mt-3 border-violet-400/30 bg-violet-400/10 text-violet-200">{text.badge}</Badge>
          <h1 className="mt-3 text-4xl font-black">{text.title}</h1>
          <p className="mt-2 max-w-3xl text-slate-400">{text.subtitle}</p>
        </div>

        <Card className="border-amber-400/20 bg-amber-400/[0.06]">
          <CardContent className="flex gap-3 p-4 text-sm text-amber-100">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{text.disclaimer}</p>
          </CardContent>
        </Card>

        {notice && (
          <Card className="border-white/10 bg-white/[0.04]" role="status" aria-live="polite">
            <CardContent className="p-4">{notice}</CardContent>
          </Card>
        )}

        {!snapshot && busy ? (
          <Card className="border-white/10 bg-white/[0.035]">
            <CardContent className="p-8 text-slate-400">{text.loading}</CardContent>
          </Card>
        ) : null}

        {snapshot && !canManage ? <Card className="border-amber-400/20 bg-amber-400/[0.06]">
          <CardHeader>
            <CardTitle>{text.deniedTitle}</CardTitle>
            <CardDescription className="text-amber-100/80">{text.deniedBody}</CardDescription>
          </CardHeader>
        </Card> : null}

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="border-white/10 bg-white/[0.035]">
            <CardHeader>
              <CardTitle>{text.assessments}</CardTitle>
              <CardDescription>{text.records(snapshot?.assessments.length ?? 0)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canManage ? (
                <>
                  <Label htmlFor="fria-ai-system" className="sr-only">{text.selectAiSystem}</Label>
                  <select
                    id="fria-ai-system"
                    aria-label={text.selectAiSystem}
                    className={selectClass}
                    value={aiSystemId}
                    onChange={(event) => setAiSystemId(event.target.value)}
                  >
                    <option value="">{text.selectAiSystem}</option>
                    {systems.map((system) => (
                      <option key={system.id} value={system.id}>{system.name} · {system.risk_level}</option>
                    ))}
                  </select>
                  <Button
                    className="w-full focus-visible:ring-2 focus-visible:ring-violet-300"
                    disabled={busy || !aiSystemId}
                    onClick={() => void createAssessment()}
                  >
                    <FileHeart className="mr-2 h-4 w-4" aria-hidden="true" />{text.createAssessment}
                  </Button>
                </>
              ) : null}

              {snapshot?.assessments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-assessment-id={item.id}
                  onClick={() => setSelected(item.id)}
                  aria-pressed={selected === item.id}
                  className={`w-full rounded-xl border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${selected === item.id ? 'border-violet-400/40 bg-violet-400/10' : 'border-white/10 bg-black/20'}`}
                >
                  <div className="flex justify-between gap-3"><span>{text.assessmentVersion(item.version)}</span><span>{item.stage}</span></div>
                  <p className="mt-1 truncate text-xs text-slate-500">{systems.find((system) => system.id === item.ai_system_id)?.name ?? item.ai_system_id}</p>
                </button>
              ))}

              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void load()}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />{text.refresh}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {!current ? (
              <Card className="border-white/10 bg-white/[0.035]">
                <CardContent className="p-8 text-slate-400">{text.emptyAssessment}</CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-white/10 bg-white/[0.035]">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle>{text.assessmentVersion(current.version)}</CardTitle>
                        <CardDescription>{current.stage}</CardDescription>
                      </div>
                      {current.stage === 'approved'
                        ? <CheckCircle2 className="text-emerald-300" aria-hidden="true" />
                        : <AlertTriangle className="text-amber-300" aria-hidden="true" />}
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="fria-applicability">{text.applicability}</Label>
                      <select id="fria-applicability" className={selectClass} disabled={!canManage} value={applicability} onChange={(event) => setApplicability(event.target.value as Assessment['applicability'])}>
                        {(['uncertain', 'required', 'not_required'] as const).map((value) => <option key={value} value={value}>{text.applicabilityOptions[value]}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="fria-residual">{text.residualImpact}</Label>
                      <select id="fria-residual" className={selectClass} disabled={!canManage} value={residual} onChange={(event) => setResidual(event.target.value as Assessment['highest_residual_impact'])}>
                        {(['unknown', 'none', 'low', 'medium', 'high', 'critical'] as const).map((value) => <option key={value} value={value}>{text.residualOptions[value]}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="fria-purpose">{text.intendedPurpose}</Label>
                      <Textarea id="fria-purpose" disabled={!canManage} value={intendedPurpose} onChange={(event) => setIntendedPurpose(event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="fria-groups">{text.affectedGroups}</Label>
                      <Textarea id="fria-groups" disabled={!canManage} value={affectedGroups} onChange={(event) => setAffectedGroups(event.target.value)} placeholder={text.onePerLine} />
                    </div>
                    <div>
                      <Label htmlFor="fria-rights">{text.rightsMap}</Label>
                      <Textarea id="fria-rights" disabled={!canManage} value={rights} onChange={(event) => setRights(event.target.value)} placeholder={text.onePerLine} />
                    </div>
                    <div>
                      <Label htmlFor="fria-impact">{text.impactAnalysis}</Label>
                      <Textarea id="fria-impact" disabled={!canManage} value={impact} onChange={(event) => setImpact(event.target.value)} className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label htmlFor="fria-mitigation">{text.mitigationPlan}</Label>
                      <Textarea id="fria-mitigation" disabled={!canManage} value={mitigation} onChange={(event) => setMitigation(event.target.value)} className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label htmlFor="fria-oversight">{text.oversightPlan}</Label>
                      <Textarea id="fria-oversight" disabled={!canManage} value={oversight} onChange={(event) => setOversight(event.target.value)} className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label htmlFor="fria-redress">{text.redressPlan}</Label>
                      <Textarea id="fria-redress" disabled={!canManage} value={redress} onChange={(event) => setRedress(event.target.value)} className="font-mono text-xs" />
                    </div>
                    {canManage ? (
                      <div className="md:col-span-2 grid gap-3 sm:grid-cols-2" aria-label="FRIA control assertions">
                        <label className={checkClass}><input type="checkbox" checked={publicAuthorityOrPublicService} onChange={(event) => setPublicAuthorityOrPublicService(event.target.checked)} /><span>{controlCopy.publicAuthority}</span></label>
                        <label className={checkClass}><input type="checkbox" checked={highRiskSystem} onChange={(event) => setHighRiskSystem(event.target.checked)} /><span>{controlCopy.highRisk}</span></label>
                        <label className={checkClass}><input type="checkbox" checked={vulnerableGroupsConsidered} onChange={(event) => setVulnerableGroupsConsidered(event.target.checked)} /><span>{controlCopy.vulnerableGroups}</span></label>
                        <label className={checkClass}><input type="checkbox" checked={monitoringPlanComplete} onChange={(event) => setMonitoringPlanComplete(event.target.checked)} /><span>{controlCopy.monitoring}</span></label>
                        <label className={checkClass}><input type="checkbox" checked={dataProtectionCoordinationComplete} onChange={(event) => setDataProtectionCoordinationComplete(event.target.checked)} /><span>{controlCopy.dataProtection}</span></label>
                      </div>
                    ) : null}
                    <p className="md:col-span-2 text-xs text-slate-500">{text.structuredHelp}</p>
                  </CardContent>
                </Card>

                {canManage && current.stage !== 'approved' && current.stage !== 'retired' ? (
                  <Card className="border-white/10 bg-white/[0.035]">
                    <CardHeader>
                      <CardTitle>{text.assignmentsTitle}</CardTitle>
                      <CardDescription>{text.assignmentsBody}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                      {candidatesLoading ? <p className="md:col-span-3 text-sm text-slate-400" role="status">{text.candidatesLoading}</p> : null}
                      {candidatesError ? <p className="md:col-span-3 text-sm text-rose-300" role="alert">{text.candidatesError}</p> : null}
                      {!candidatesLoading && !candidatesError && candidates.length === 0 ? <p className="md:col-span-3 text-sm text-amber-200" role="status">{text.candidatesEmpty}</p> : null}

                      <div>
                        <Label htmlFor="fria-reviewer">{text.reviewer}</Label>
                        <select id="fria-reviewer" className={selectClass} value={reviewerId} onChange={(event) => setReviewerId(event.target.value)}>
                          <option value="">{text.unassigned}</option>
                          {candidatesFor('reviewer').map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidateLabel(candidate)}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="fria-approver">{text.approver}</Label>
                        <select id="fria-approver" className={selectClass} value={approverId} onChange={(event) => setApproverId(event.target.value)}>
                          <option value="">{text.unassigned}</option>
                          {candidatesFor('approver').map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidateLabel(candidate)}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="fria-legal-reviewer">{text.legalReviewer}</Label>
                        <select id="fria-legal-reviewer" className={selectClass} value={legalReviewerId} onChange={(event) => setLegalReviewerId(event.target.value)}>
                          <option value="">{text.unassigned}</option>
                          {candidatesFor('legalReviewer').map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidateLabel(candidate)}</option>)}
                        </select>
                      </div>
                      <p className="md:col-span-3 text-xs text-slate-500">{text.separationHint}</p>
                      <label className={`${checkClass} md:col-span-3`}>
                        <input type="checkbox" checked={legalReviewComplete} onChange={(event) => setLegalReviewComplete(event.target.checked)} />
                        <span>{text.legalReviewComplete}</span>
                      </label>
                      <Button className="md:col-span-3" disabled={busy} onClick={() => void saveCurrent(current)}>
                        <Save className="mr-2 h-4 w-4" aria-hidden="true" />{busy ? text.saving : text.saveAssessment}
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}

                {canManage && current.stage !== 'approved' && current.stage !== 'retired' ? (
                  <Card className="border-white/10 bg-white/[0.035]">
                    <CardHeader>
                      <CardTitle>{text.evidenceTitle}</CardTitle>
                      <CardDescription>{text.evidenceBody}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="fria-control-id">{text.controlId}</Label>
                        <Input id="fria-control-id" value={controlId} onChange={(event) => setControlId(event.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="fria-evidence-type">{text.evidenceType}</Label>
                        <Input id="fria-evidence-type" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} placeholder={text.evidenceTypePlaceholder} />
                      </div>
                      <div>
                        <Label htmlFor="fria-storage-ref">{text.storageReference}</Label>
                        <Input id="fria-storage-ref" value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} placeholder={text.storageReferencePlaceholder} />
                      </div>
                      <div>
                        <Label htmlFor="fria-evidence-digest">{text.digest}</Label>
                        <Input id="fria-evidence-digest" value={evidenceDigest} onChange={(event) => setEvidenceDigest(event.target.value)} placeholder={text.digestPlaceholder} />
                      </div>
                      <p className="md:col-span-2 text-xs text-slate-500">{text.evidenceHelp}</p>
                      <Button className="md:col-span-2" disabled={busy || evidenceType.trim().length < 2 || (!evidenceRef.trim() && !evidenceDigest.trim())} onClick={() => void submitEvidence(current)}>{text.submitEvidence}</Button>
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="border-white/10 bg-white/[0.035]">
                  <CardHeader>
                    <CardTitle>{text.evidenceRecords(currentEvidence.length)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {currentEvidence.length === 0 ? <p className="text-sm text-slate-400">{text.noEvidence}</p> : currentEvidence.map((item) => (
                      <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                        <span className="font-semibold">{item.control_id}</span><span className="mx-2 text-slate-600">·</span><span>{item.evidence_type}</span><span className="ml-2 text-slate-500">{item.status}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {canManage && current.stage !== 'approved' && current.stage !== 'retired' ? (
                  <Card className="border-white/10 bg-white/[0.035]">
                    <CardHeader>
                      <CardTitle>{text.approvalTitle}</CardTitle>
                      <CardDescription>{text.approvalBody}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="fria-approval-rationale">{text.approvalRationale}</Label>
                        <Textarea id="fria-approval-rationale" value={approvalRationale} onChange={(event) => setApprovalRationale(event.target.value)} placeholder={text.approvalPlaceholder} />
                      </div>
                      <Button disabled={busy || approvalRationale.trim().length < 10} onClick={() => void approveCurrent(current)}>{text.approve}</Button>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
