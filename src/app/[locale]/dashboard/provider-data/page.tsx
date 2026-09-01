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
    } catch {
      setNotice('Unable to load provider data governance.');
    } finally {
      setBusy(false);
    }
  }, [selectedProgram]);

  useEffect(() => { void load(); }, [load]);
  const currentProgram = snapshot?.programs.find((item) => item.id === selectedProgram);
  const currentDatasets = snapshot?.datasets.filter((item) => item.program_id === selectedProgram) ?? [];

  async function run(workflow: string, body: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/ai-governance/provider-data?workflow=${workflow}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string; program?: Program };
      if (!response.ok) throw new Error(payload.error ?? 'workflow_failed');
      if (payload.program) setSelectedProgram(payload.program.id);
      setNotice('Workflow saved and audit evidence persisted.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Workflow failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6 text-slate-100" aria-labelledby="provider-data-title">
      <header className="border-b border-slate-800/80 pb-5">
        <Button asChild variant="ghost" className="-ml-3 text-slate-300 hover:bg-slate-900 hover:text-white">
          <Link href={`/${locale}/dashboard/regulatory-control-tower`}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to control tower
          </Link>
        </Button>
        <Badge className="mt-3 border-blue-400/25 bg-blue-500/10 text-blue-200">EU AI Act · Article 10</Badge>
        <h1 id="provider-data-title" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">High-Risk Provider Data Governance</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Create versioned provider-data programmes, inventory datasets and track evidence-backed approval readiness.</p>
      </header>

      <div className="flex gap-3 rounded-xl border border-blue-400/15 bg-blue-500/[0.06] p-4 text-sm leading-6 text-blue-100/85">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" aria-hidden="true" />
        <p>This workspace records governance evidence. It does not prove dataset quality, representativeness, absence of bias or lawful processing.</p>
      </div>

      {notice && (
        <div className="rounded-xl border border-slate-800 bg-[#0d1522] p-4 text-sm text-slate-200" role="status">
          {notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="rounded-xl border-slate-800/80 bg-[#0d1522] text-slate-100 shadow-none">
          <CardHeader>
            <CardTitle>Programmes</CardTitle>
            <CardDescription className="text-slate-400">{snapshot?.programs.length ?? 0} versioned records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>AI system reference</Label>
            <Input value={systemReference} onChange={(event) => setSystemReference(event.target.value)} placeholder="AI-SYSTEM-001" className="border-slate-700 bg-slate-950/35 focus-visible:ring-blue-400" />
            <Button className="w-full bg-blue-600 text-white hover:bg-blue-500" disabled={busy || systemReference.trim().length < 3} onClick={() => run('program_create', { systemReference, applicability: 'required', providerRole: 'provider' })}>Create programme</Button>
            <div className="space-y-2">
              {snapshot?.programs.map((program) => (
                <button
                  key={program.id}
                  type="button"
                  onClick={() => setSelectedProgram(program.id)}
                  aria-pressed={selectedProgram === program.id}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedProgram === program.id ? 'border-blue-400/35 bg-blue-500/10' : 'border-slate-800 bg-slate-950/25 hover:bg-slate-900/70'}`}
                >
                  <div className="font-semibold text-white">{program.system_reference} · v{program.program_version}</div>
                  <div className="mt-1 text-xs text-slate-400">{program.status} · {program.approved_dataset_count}/{program.dataset_count} datasets approved</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-xl border-slate-800/80 bg-[#0d1522] text-slate-100 shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-blue-300" />Dataset inventory</CardTitle>
              <CardDescription className="text-slate-400">{currentProgram ? currentProgram.system_reference : 'Select a programme'}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div><Label>Name</Label><Input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} className="border-slate-700 bg-slate-950/35 focus-visible:ring-blue-400" /></div>
              <div><Label>Version</Label><Input value={datasetVersion} onChange={(event) => setDatasetVersion(event.target.value)} className="border-slate-700 bg-slate-950/35 focus-visible:ring-blue-400" /></div>
              <div className="md:col-span-2"><Label>Purpose</Label><Textarea value={datasetPurpose} onChange={(event) => setDatasetPurpose(event.target.value)} className="border-slate-700 bg-slate-950/35 focus-visible:ring-blue-400" /></div>
              <div><Label>Source version</Label><Input value={sourceVersion} onChange={(event) => setSourceVersion(event.target.value)} className="border-slate-700 bg-slate-950/35 focus-visible:ring-blue-400" /></div>
              <div className="flex items-end"><Button className="bg-blue-600 text-white hover:bg-blue-500" disabled={!currentProgram || busy} onClick={() => currentProgram && run('dataset_create', { programId: currentProgram.id, name: datasetName, purpose: datasetPurpose, lifecycleRole: 'training', sourceCategory: 'internal', datasetVersion, sourceVersion })}>Add dataset</Button></div>
              <div className="md:col-span-2 divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950/20">
                {currentDatasets.map((dataset) => (
                  <div key={dataset.id} className="p-3">
                    <div className="font-semibold text-white">{dataset.name} · {dataset.dataset_version}</div>
                    <div className="mt-1 text-xs text-slate-400">{dataset.lifecycle_role} · {dataset.status}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {currentProgram && (
            <Card className="rounded-xl border-slate-800/80 bg-[#0d1522] text-slate-100 shadow-none">
              <CardHeader>
                <CardTitle>Independent approval</CardTitle>
                <CardDescription className="text-slate-400">Approval remains blocked until every dataset is approved and all governance controls are complete.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="bg-blue-600 text-white hover:bg-blue-500" disabled={busy} onClick={() => run('program_approve', { programId: currentProgram.id, expectedUpdatedAt: currentProgram.updated_at, rationale: 'Independent review confirms that all required provider data governance controls are complete.' })}>Approve programme</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Button variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white" onClick={() => void load()} disabled={busy}>
        <RefreshCw className="mr-2 h-4 w-4" />Refresh
      </Button>
    </section>
  );
}
