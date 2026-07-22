'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const signalCodes = ['subliminal_manipulation','vulnerability_exploitation','social_scoring','criminal_risk_prediction','untargeted_facial_scraping','emotion_inference_workplace_education','biometric_categorisation_sensitive_traits','real_time_remote_biometric_public_space'] as const;
type SignalCode = (typeof signalCodes)[number];
type Review = { id: string; system_reference: string; review_version: number; applicability: string; status: string; updated_at: string };
type Signal = { id: string; review_id: string; signal_code: SignalCode; answer: string; legal_conclusion: string; status: string; rationale: string; deployment_context: string; consequence_analysis: string; exception_claimed: boolean; reviewer_user_id: string | null; legal_reviewer_user_id: string | null; content_digest: string | null; updated_at: string };
type Snapshot = { reviews: Review[]; signals: Signal[]; evidence: unknown[]; decisions: unknown[] };

const copy = {
  en: { title: 'Prohibited Practices Workspace', subtitle: 'Document, evidence and independently review all eight Article 5 signals.', back: 'Back to control tower', create: 'Create review', save: 'Save signal', approve: 'Approve review', evidence: 'Submit evidence', empty: 'No review exists yet.', disclaimer: 'Decision support only. This workflow does not determine legal applicability or authorize deployment.' },
  pt: { title: 'Workspace de Práticas Proibidas', subtitle: 'Documente, evidencie e reveja de forma independente os oito sinais do Artigo 5.', back: 'Voltar à torre de controlo', create: 'Criar revisão', save: 'Guardar sinal', approve: 'Aprovar revisão', evidence: 'Submeter evidência', empty: 'Ainda não existe revisão.', disclaimer: 'Apoio à decisão apenas. Este workflow não determina aplicabilidade jurídica nem autoriza deployment.' },
};

export default function ProhibitedPracticesPage() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale === 'pt' ? 'pt' : 'en';
  const text = copy[locale];
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selectedReview, setSelectedReview] = useState('');
  const [selectedSignal, setSelectedSignal] = useState<SignalCode>('subliminal_manipulation');
  const [systemReference, setSystemReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [answer, setAnswer] = useState('unknown');
  const [legalConclusion, setLegalConclusion] = useState('uncertain');
  const [rationale, setRationale] = useState('');
  const [deploymentContext, setDeploymentContext] = useState('');
  const [consequenceAnalysis, setConsequenceAnalysis] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [legalReviewerId, setLegalReviewerId] = useState('');
  const [digest, setDigest] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/ai-governance/prohibited-practices', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'load_failed');
      setSnapshot(payload);
      if (!selectedReview && payload.reviews[0]) setSelectedReview(payload.reviews[0].id);
    } catch { setNotice('Unable to load workflow.'); } finally { setBusy(false); }
  }, [selectedReview]);

  useEffect(() => { void load(); }, [load]);
  const currentReview = snapshot?.reviews.find((item) => item.id === selectedReview);
  const currentSignal = snapshot?.signals.find((item) => item.review_id === selectedReview && item.signal_code === selectedSignal);
  useEffect(() => {
    if (!currentSignal) return;
    setAnswer(currentSignal.answer); setLegalConclusion(currentSignal.legal_conclusion); setRationale(currentSignal.rationale);
    setDeploymentContext(currentSignal.deployment_context); setConsequenceAnalysis(currentSignal.consequence_analysis);
    setReviewerId(currentSignal.reviewer_user_id ?? ''); setLegalReviewerId(currentSignal.legal_reviewer_user_id ?? ''); setDigest(currentSignal.content_digest ?? '');
  }, [currentSignal]);

  async function run(workflow: string, body: Record<string, unknown>) {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/api/ai-governance/prohibited-practices?workflow=${workflow}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string; review?: Review };
      if (!response.ok) throw new Error(payload.error ?? 'workflow_failed');
      if (payload.review) setSelectedReview(payload.review.id);
      setNotice('Workflow saved and audit evidence persisted.'); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Workflow failed.'); } finally { setBusy(false); }
  }

  const signalLabel = useMemo(() => selectedSignal.replaceAll('_', ' '), [selectedSignal]);
  return <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white"><div className="mx-auto max-w-7xl space-y-6">
    <div><Button asChild variant="ghost"><Link href={`/${locale}/dashboard/regulatory-control-tower`}><ArrowLeft className="mr-2 h-4 w-4" />{text.back}</Link></Button><Badge className="mt-3 border-red-400/30 bg-red-400/10 text-red-200">EU AI Act · Article 5</Badge><h1 className="mt-3 text-4xl font-black">{text.title}</h1><p className="mt-2 text-slate-400">{text.subtitle}</p></div>
    <Card className="border-amber-400/20 bg-amber-400/[0.06]"><CardContent className="flex gap-3 p-4 text-sm text-amber-100"><ShieldAlert className="h-5 w-5" /><p>{text.disclaimer}</p></CardContent></Card>
    {notice && <Card className="border-white/10 bg-white/[0.04]"><CardContent className="p-4">{notice}</CardContent></Card>}
    <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle>Reviews</CardTitle><CardDescription>{snapshot?.reviews.length ?? 0} records</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={systemReference} onChange={(event) => setSystemReference(event.target.value)} placeholder="AI system reference" /><Button className="w-full" disabled={busy || systemReference.length < 3} onClick={() => void run('review_create', { systemReference, applicability: 'required' })}>{text.create}</Button>{snapshot?.reviews.map((review) => <button key={review.id} onClick={() => setSelectedReview(review.id)} className={`w-full rounded-xl border p-3 text-left ${selectedReview === review.id ? 'border-red-400/40 bg-red-400/10' : 'border-white/10 bg-black/20'}`}><div className="flex justify-between"><span>v{review.review_version}</span><span>{review.status}</span></div><p className="mt-1 truncate text-xs text-slate-500">{review.system_reference}</p></button>)}</CardContent></Card>
      {!currentReview ? <Card className="border-white/10 bg-white/[0.035]"><CardContent className="p-8 text-slate-400">{text.empty}</CardContent></Card> : <div className="space-y-6">
        <Card className="border-white/10 bg-white/[0.035]"><CardHeader><div className="flex items-center justify-between"><div><CardTitle>{signalLabel}</CardTitle><CardDescription>{currentReview.status}</CardDescription></div>{currentReview.status === 'approved' ? <CheckCircle2 className="text-emerald-300" /> : <AlertTriangle className="text-amber-300" />}</div></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Signal</Label><select className="mt-2 w-full rounded-md border border-white/10 bg-black p-2" value={selectedSignal} onChange={(event) => setSelectedSignal(event.target.value as SignalCode)}>{signalCodes.map((code) => <option key={code} value={code}>{code.replaceAll('_', ' ')}</option>)}</select></div>
          <div><Label>Answer</Label><select className="mt-2 w-full rounded-md border border-white/10 bg-black p-2" value={answer} onChange={(event) => setAnswer(event.target.value)}><option value="unknown">unknown</option><option value="no">no</option><option value="yes">yes</option></select></div>
          <div><Label>Legal conclusion</Label><select className="mt-2 w-full rounded-md border border-white/10 bg-black p-2" value={legalConclusion} onChange={(event) => setLegalConclusion(event.target.value)}><option value="uncertain">uncertain</option><option value="not_prohibited">not prohibited</option><option value="prohibited">prohibited</option><option value="exception_supported">exception supported</option></select></div>
          <div className="md:col-span-2"><Label>Rationale</Label><Textarea value={rationale} onChange={(event) => setRationale(event.target.value)} /></div><div><Label>Deployment context</Label><Textarea value={deploymentContext} onChange={(event) => setDeploymentContext(event.target.value)} /></div><div><Label>Consequence analysis</Label><Textarea value={consequenceAnalysis} onChange={(event) => setConsequenceAnalysis(event.target.value)} /></div>
          <div><Label>Reviewer UUID</Label><Input value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} /></div><div><Label>Legal reviewer UUID</Label><Input value={legalReviewerId} onChange={(event) => setLegalReviewerId(event.target.value)} /></div><div className="md:col-span-2"><Label>Content SHA-256</Label><Input value={digest} onChange={(event) => setDigest(event.target.value)} /></div>
          <div className="md:col-span-2 flex flex-wrap gap-3"><Button disabled={busy || !currentSignal} onClick={() => currentSignal && void run('signal_update', { reviewId: currentReview.id, signalCode: selectedSignal, expectedUpdatedAt: currentSignal.updated_at, answer, legalConclusion, rationale, deploymentContext, consequenceAnalysis, exceptionClaimed: legalConclusion === 'exception_supported', reviewerUserId: reviewerId, legalReviewerUserId: legalReviewerId || null, contentDigest: digest })}>{text.save}</Button><Button variant="outline" disabled={busy} onClick={() => void run('review_approve', { reviewId: currentReview.id, expectedUpdatedAt: currentReview.updated_at, rationale: 'Independent approval after all Article 5 signals and evidence were reviewed.' })}>{text.approve}</Button><Button variant="ghost" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        </CardContent></Card>
        {currentSignal && <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle>Evidence</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 md:flex-row"><Input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} placeholder="organization-id/path" /><Button disabled={busy || !evidenceReference || digest.length !== 64} onClick={() => void run('evidence_submit', { reviewId: currentReview.id, signalAssessmentId: currentSignal.id, evidenceType: 'legal_analysis', evidenceReference, sourceVersion: '1', evidenceDigest: digest })}>{text.evidence}</Button></CardContent></Card>}
      </div>}
    </section>
  </div></main>;
}
