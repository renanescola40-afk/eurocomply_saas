'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Database, RefreshCw, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Program = { id: string; system_reference: string; program_version: number; applicability: string; provider_role: string; status: string; dataset_count: number; approved_dataset_count: number; updated_at: string };
type Dataset = { id: string; program_id: string; name: string; lifecycle_role: string; status: string; dataset_version: string };
type Snapshot = { programs: Program[]; datasets: Dataset[]; assessments: unknown[]; mitigations: unknown[]; evidence: unknown[]; decisions: unknown[] };

export default function ProviderDataWorkspacePage() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [systemReference, setSystemReference] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [datasetPurpose, setDatasetPurpose] = useState('');
  const [datasetVersion, setDatasetVersion] = useState('1.0');
  const [sourceVersion, setSourceVersion] = useState('1.0');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/ai-governance/provider-data', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'load_failed');
      setSnapshot(payload);
      if (!selectedProgram && payload.programs[0]) setSelectedProgram(payload.programs[0].id);
    } catch { setNotice('Unable to load provider data governance.'); } finally { setBusy(false); }
  }, [selectedProgram]);

  useEffect(() => { void load(); }, [load]);
  const currentProgram = snapshot?.programs.find((item) => item.id === selectedProgram);
  const currentDatasets = snapshot?.datasets.filter((item) => item.program_id === selectedProgram) ?? [];

  async function run(workflow: string, body: Record<string, unknown>) {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/api/ai-governance/provider-data?workflow=${workflow}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string; program?: Program };
      if (!response.ok) throw new Error(payload.error ?? 'workflow_failed');
      if (payload.program) setSelectedProgram(payload.program.id);
      setNotice('Workflow saved and audit evidence persisted.');
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Workflow failed.'); } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white"><div className="mx-auto max-w-7xl space-y-6">
    <div><Button asChild variant="ghost"><Link href={`/${locale}/dashboard/regulatory-control-tower`}><ArrowLeft className="mr-2 h-4 w-4" />Back to control tower</Link></Button><Badge className="mt-3 border-cyan-400/30 bg-cyan-400/10 text-cyan-200">EU AI Act · Article 10</Badge><h1 className="mt-3 text-4xl font-black">High-Risk Provider Data Governance</h1><p className="mt-2 text-slate-400">Create versioned provider-data programmes, inventory datasets and track evidence-backed approval readiness.</p></div>
    <Card className="border-cyan-400/20 bg-cyan-400/[0.05]"><CardContent className="flex gap-3 p-4 text-sm text-cyan-100"><ShieldCheck className="h-5 w-5" /><p>This workspace records governance evidence. It does not prove dataset quality, representativeness, absence of bias or lawful processing.</p></CardContent></Card>
    {notice && <Card className="border-white/10 bg-white/[0.04]"><CardContent className="p-4">{notice}</CardContent></Card>}
    <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle>Programmes</CardTitle><CardDescription>{snapshot?.programs.length ?? 0} versioned records</CardDescription></CardHeader><CardContent className="space-y-3">
        <Label>AI system reference</Label><Input value={systemReference} onChange={(event) => setSystemReference(event.target.value)} placeholder="AI-SYSTEM-001" />
        <Button disabled={busy || systemReference.trim().length < 3} onClick={() => run('program_create', { systemReference, applicability: 'required', providerRole: 'provider' })}>Create programme</Button>
        <div className="space-y-2">{snapshot?.programs.map((program) => <button key={program.id} onClick={() => setSelectedProgram(program.id)} className="w-full rounded-xl border border-white/10 p-3 text-left hover:bg-white/5"><div className="font-semibold">{program.system_reference} · v{program.program_version}</div><div className="text-xs text-slate-400">{program.status} · {program.approved_dataset_count}/{program.dataset_count} datasets approved</div></button>)}</div>
      </CardContent></Card>
      <div className="space-y-6">
        <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Dataset inventory</CardTitle><CardDescription>{currentProgram ? currentProgram.system_reference : 'Select a programme'}</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
          <div><Label>Name</Label><Input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} /></div><div><Label>Version</Label><Input value={datasetVersion} onChange={(event) => setDatasetVersion(event.target.value)} /></div>
          <div className="md:col-span-2"><Label>Purpose</Label><Textarea value={datasetPurpose} onChange={(event) => setDatasetPurpose(event.target.value)} /></div><div><Label>Source version</Label><Input value={sourceVersion} onChange={(event) => setSourceVersion(event.target.value)} /></div>
          <div className="flex items-end"><Button disabled={!currentProgram || busy} onClick={() => currentProgram && run('dataset_create', { programId: currentProgram.id, name: datasetName, purpose: datasetPurpose, lifecycleRole: 'training', sourceCategory: 'internal', datasetVersion, sourceVersion })}>Add dataset</Button></div>
          <div className="md:col-span-2 space-y-2">{currentDatasets.map((dataset) => <div key={dataset.id} className="rounded-xl border border-white/10 p-3"><div className="font-semibold">{dataset.name} · {dataset.dataset_version}</div><div className="text-xs text-slate-400">{dataset.lifecycle_role} · {dataset.status}</div></div>)}</div>
        </CardContent></Card>
        {currentProgram && <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle>Independent approval</CardTitle><CardDescription>Approval remains blocked until every dataset is approved and all governance controls are complete.</CardDescription></CardHeader><CardContent><Button disabled={busy} onClick={() => run('program_approve', { programId: currentProgram.id, expectedUpdatedAt: currentProgram.updated_at, rationale: 'Independent review confirms that all required provider data governance controls are complete.' })}>Approve programme</Button></CardContent></Card>}
      </div>
    </section>
    <Button variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
  </div></main>;
}