'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileHeart, RefreshCw, Save, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const locales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
type Locale = (typeof locales)[number];
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
  highest_residual_impact: string;
  reviewer_id: string | null;
  approver_id: string | null;
};
type Evidence = { id: string; assessment_id: string; control_id: string; evidence_type: string; status: string };
type AiSystem = { id: string; name: string; risk_level: string; lifecycle_status: string };
type Snapshot = { assessments: Assessment[]; evidence: Evidence[] };

const english = {
  back: 'Back to control tower', badge: 'EU AI Act · Article 27', title: 'FRIA Workspace',
  subtitle: 'Create, assess, mitigate and independently approve fundamental-rights impact assessments.',
  disclaimer: 'Decision support only. This workspace does not replace legal review, a DPIA or regulator assessment.',
  newAssessment: 'Create assessment', save: 'Save assessment', approve: 'Approve', evidence: 'Submit evidence',
  refresh: 'Refresh', empty: 'No FRIA assessment exists yet.', saved: 'Workflow saved and audit evidence persisted.',
  error: 'The FRIA workflow could not be completed.', invalidJson: 'One or more structured JSON fields are invalid.',
};
const portuguese = {
  ...english,
  back: 'Voltar à torre de controlo', badge: 'EU AI Act · Artigo 27', title: 'Workspace FRIA',
  subtitle: 'Crie, avalie, mitigue e aprove avaliações de impacto sobre direitos fundamentais.',
  disclaimer: 'Apoio à decisão apenas. Este workspace não substitui revisão jurídica, DPIA ou avaliação do regulador.',
  newAssessment: 'Criar avaliação', save: 'Guardar avaliação', approve: 'Aprovar', evidence: 'Submeter evidência',
  refresh: 'Atualizar', empty: 'Ainda não existe avaliação FRIA.', saved: 'Workflow guardado e evidência de auditoria persistida.',
  error: 'Não foi possível concluir o workflow FRIA.', invalidJson: 'Um ou mais campos JSON estruturados são inválidos.',
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
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export default function FriaPage() {
  const params = useParams<{ locale?: string }>();
  const locale = (locales.includes(params.locale as Locale) ? params.locale : 'en') as Locale;
  const text = useMemo(() => locale === 'pt' ? portuguese : english, [locale]);
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
  const [residual, setResidual] = useState('unknown');
  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [controlId, setControlId] = useState('FRIA-01');
  const [evidenceRef, setEvidenceRef] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [friaResponse, systemsResponse] = await Promise.all([
        fetch('/api/ai-governance/fria', { cache: 'no-store', credentials: 'same-origin' }),
        fetch('/api/ai-systems', { cache: 'no-store', credentials: 'same-origin' }),
      ]);
      const fria = await friaResponse.json() as Snapshot & { error?: string };
      const inventory = await systemsResponse.json() as { systems?: AiSystem[]; error?: string } | AiSystem[];
      if (!friaResponse.ok) throw new Error(fria.error ?? 'fria_load_failed');
      if (!systemsResponse.ok) throw new Error(!Array.isArray(inventory) ? inventory.error : 'inventory_load_failed');
      const inventorySystems = Array.isArray(inventory) ? inventory : inventory.systems ?? [];
      setSnapshot(fria);
      setSystems(inventorySystems);
      if (!aiSystemId && inventorySystems[0]) setAiSystemId(inventorySystems[0].id);
      if (!selected && fria.assessments[0]) setSelected(fria.assessments[0].id);
    } catch {
      setNotice(text.error);
    } finally {
      setBusy(false);
    }
  }, [aiSystemId, selected, text.error]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const item = snapshot?.assessments.find((assessment) => assessment.id === selected);
    if (!item) return;
    setAiSystemId(item.ai_system_id);
    setApplicability(item.applicability);
    setIntendedPurpose(String(item.context?.intendedPurpose ?? ''));
    setAffectedGroups((item.affected_groups ?? []).join('\n'));
    setRights((item.rights_map ?? []).join('\n'));
    setImpact(jsonText(item.impact_analysis));
    setMitigation(jsonText(item.mitigation_plan));
    setOversight(jsonText(item.oversight_plan));
    setRedress(jsonText(item.complaints_redress));
    setResidual(item.highest_residual_impact);
    setReviewerId(item.reviewer_id ?? '');
    setApproverId(item.approver_id ?? '');
  }, [selected, snapshot]);

  async function run(workflow: string, body: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/ai-governance/fria?workflow=${encodeURIComponent(workflow)}`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string; assessment?: Assessment };
      if (!response.ok) throw new Error(payload.error ?? 'workflow_failed');
      if (payload.assessment) setSelected(payload.assessment.id);
      setNotice(text.saved);
      await load();
    } catch {
      setNotice(text.error);
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrent(assessment: Assessment) {
    const impactAnalysis = parseObject(impact);
    const mitigationPlan = parseObject(mitigation);
    const oversightPlan = parseObject(oversight);
    const complaintsRedress = parseObject(redress);
    if (!impactAnalysis || !mitigationPlan || !oversightPlan || !complaintsRedress) {
      setNotice(text.invalidJson);
      return;
    }
    await run('assessment_update', {
      assessmentId: assessment.id, applicability,
      context: { intendedPurpose, publicAuthorityOrPublicService: true, highRiskSystem: true, vulnerableGroupsConsidered: true },
      affectedGroups: lines(affectedGroups), rightsMap: lines(rights), impactAnalysis, mitigationPlan, oversightPlan, complaintsRedress,
      highestResidualImpact: residual, reviewerId: reviewerId || null, approverId: approverId || null,
      legalReviewComplete: ['none', 'low', 'medium'].includes(residual), monitoringPlanComplete: true,
      dataProtectionCoordinationComplete: true,
    });
  }

  const current = snapshot?.assessments.find((assessment) => assessment.id === selected);
  return (
    <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Button asChild variant="ghost"><Link href={`/${locale}/dashboard/regulatory-control-tower`}><ArrowLeft className="mr-2 h-4 w-4" />{text.back}</Link></Button>
          <Badge className="mt-3 border-violet-400/30 bg-violet-400/10 text-violet-200">{text.badge}</Badge>
          <h1 className="mt-3 text-4xl font-black">{text.title}</h1><p className="mt-2 text-slate-400">{text.subtitle}</p>
        </div>
        <Card className="border-amber-400/20 bg-amber-400/[0.06]"><CardContent className="flex gap-3 p-4 text-sm text-amber-100"><ShieldCheck className="h-5 w-5" /><p>{text.disclaimer}</p></CardContent></Card>
        {notice && <Card className="border-white/10 bg-white/[0.04]"><CardContent className="p-4">{notice}</CardContent></Card>}
        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="border-white/10 bg-white/[0.035]">
            <CardHeader><CardTitle>Assessments</CardTitle><CardDescription>{snapshot?.assessments.length ?? 0} records</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <select aria-label="AI system" className="w-full rounded-md border border-white/10 bg-black p-2" value={aiSystemId} onChange={(event) => setAiSystemId(event.target.value)}>
                <option value="">Select an AI system</option>
                {systems.map((system) => <option key={system.id} value={system.id}>{system.name} · {system.risk_level}</option>)}
              </select>
              <Button className="w-full" disabled={busy || !aiSystemId} onClick={() => void run('assessment_create', { aiSystemId, applicability, context: { intendedPurpose, publicAuthorityOrPublicService: true, highRiskSystem: true } })}><FileHeart className="mr-2 h-4 w-4" />{text.newAssessment}</Button>
              {snapshot?.assessments.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={`w-full rounded-xl border p-3 text-left ${selected === item.id ? 'border-violet-400/40 bg-violet-400/10' : 'border-white/10 bg-black/20'}`}><div className="flex justify-between"><span>v{item.version}</span><span>{item.stage}</span></div><p className="mt-1 truncate text-xs text-slate-500">{systems.find((system) => system.id === item.ai_system_id)?.name ?? item.ai_system_id}</p></button>)}
            </CardContent>
          </Card>
          <div className="space-y-6">
            {!current ? <Card className="border-white/10 bg-white/[0.035]"><CardContent className="p-8 text-slate-400">{text.empty}</CardContent></Card> : <>
              <Card className="border-white/10 bg-white/[0.035]">
                <CardHeader><div className="flex items-center justify-between"><div><CardTitle>Assessment v{current.version}</CardTitle><CardDescription>{current.stage}</CardDescription></div>{current.stage === 'approved' ? <CheckCircle2 className="text-emerald-300" /> : <AlertTriangle className="text-amber-300" />}</div></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div><Label>Applicability</Label><select className="mt-2 w-full rounded-md border border-white/10 bg-black p-2" value={applicability} onChange={(event) => setApplicability(event.target.value as Assessment['applicability'])}><option value="uncertain">uncertain</option><option value="required">required</option><option value="not_required">not required</option></select></div>
                  <div><Label>Residual impact</Label><select className="mt-2 w-full rounded-md border border-white/10 bg-black p-2" value={residual} onChange={(event) => setResidual(event.target.value)}>{['unknown', 'none', 'low', 'medium', 'high', 'critical'].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
                  <div className="md:col-span-2"><Label>Intended purpose</Label><Textarea value={intendedPurpose} onChange={(event) => setIntendedPurpose(event.target.value)} /></div>
                  <div><Label>Affected groups</Label><Textarea value={affectedGroups} onChange={(event) => setAffectedGroups(event.target.value)} placeholder="One per line" /></div>
                  <div><Label>Rights map</Label><Textarea value={rights} onChange={(event) => setRights(event.target.value)} placeholder="One per line" /></div>
                  <div><Label>Impact analysis (JSON)</Label><Textarea value={impact} onChange={(event) => setImpact(event.target.value)} className="font-mono text-xs" /></div>
                  <div><Label>Mitigation plan (JSON)</Label><Textarea value={mitigation} onChange={(event) => setMitigation(event.target.value)} className="font-mono text-xs" /></div>
                  <div><Label>Human oversight (JSON)</Label><Textarea value={oversight} onChange={(event) => setOversight(event.target.value)} className="font-mono text-xs" /></div>
                  <div><Label>Complaints and redress (JSON)</Label><Textarea value={redress} onChange={(event) => setRedress(event.target.value)} className="font-mono text-xs" /></div>
                  <div><Label>Reviewer UUID</Label><Input value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} /></div>
                  <div><Label>Approver UUID</Label><Input value={approverId} onChange={(event) => setApproverId(event.target.value)} /></div>
                  <div className="md:col-span-2 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void saveCurrent(current)}><Save className="mr-2 h-4 w-4" />{text.save}</Button><Button variant="outline" disabled={busy} onClick={() => void run('assessment_approve', { assessmentId: current.id, rationale: 'Independent approval after evidence and control review.' })}>{text.approve}</Button><Button variant="ghost" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />{text.refresh}</Button></div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle>Evidence</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 md:flex-row"><Input value={controlId} onChange={(event) => setControlId(event.target.value)} placeholder="FRIA-01" /><Input value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} placeholder="organization-id/path or evidence reference" /><Button disabled={busy || !evidenceRef} onClick={() => void run('evidence_submit', { assessmentId: current.id, controlId, evidenceType: 'supporting_document', storageReference: evidenceRef })}>{text.evidence}</Button></CardContent></Card>
            </>}
          </div>
        </section>
      </div>
    </main>
  );
}
