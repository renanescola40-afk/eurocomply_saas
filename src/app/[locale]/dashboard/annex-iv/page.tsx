'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileCheck2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const sectionCodes = ['general_description','system_elements_and_development','monitoring_functioning_and_control','risk_management','data_governance','performance_metrics','human_oversight','cybersecurity','lifecycle_changes','standards_and_specifications','eu_declaration_and_conformity','post_market_monitoring'] as const;
type SectionCode = (typeof sectionCodes)[number];
type Package = { id: string; system_reference: string; system_version: string; documentation_version: number; applicability: string; status: string; approved_sections_count: number; updated_at: string };
type Section = { id: string; package_id: string; section_code: SectionCode; status: string; summary: string; source_version: string; reviewer_user_id: string | null; content_digest: string | null; evidence_count: number; updated_at: string };
type Snapshot = { packages: Package[]; sections: Section[]; evidence: unknown[]; changes: unknown[]; decisions: unknown[] };

export default function AnnexIvPage() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedSection, setSelectedSection] = useState<SectionCode>('general_description');
  const [systemReference, setSystemReference] = useState('');
  const [systemVersion, setSystemVersion] = useState('');
  const [summary, setSummary] = useState('');
  const [sourceVersion, setSourceVersion] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [digest, setDigest] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/ai-governance/annex-iv', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'load_failed');
      setSnapshot(payload);
      if (!selectedPackage && payload.packages[0]) setSelectedPackage(payload.packages[0].id);
    } catch {
      setNotice('Unable to load Annex IV workflow.');
    } finally {
      setBusy(false);
    }
  }, [selectedPackage]);

  useEffect(() => { void load(); }, [load]);
  const currentPackage = snapshot?.packages.find((item) => item.id === selectedPackage);
  const currentSection = snapshot?.sections.find((item) => item.package_id === selectedPackage && item.section_code === selectedSection);

  useEffect(() => {
    if (!currentSection) return;
    setSummary(currentSection.summary);
    setSourceVersion(currentSection.source_version);
    setReviewerId(currentSection.reviewer_user_id ?? '');
    setDigest(currentSection.content_digest ?? '');
  }, [currentSection]);

  async function run(workflow: string, body: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/ai-governance/annex-iv?workflow=${workflow}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string; package?: Package };
      if (!response.ok) throw new Error(payload.error ?? 'workflow_failed');
      if (payload.package) setSelectedPackage(payload.package.id);
      setNotice('Workflow saved and audit evidence persisted.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Workflow failed.');
    } finally {
      setBusy(false);
    }
  }

  const completion = useMemo(() => currentPackage ? Math.round((currentPackage.approved_sections_count / 12) * 100) : 0, [currentPackage]);
  const inputClassName = 'border-slate-700 bg-slate-950/35 focus-visible:ring-blue-400';
  const cardClassName = 'rounded-xl border-slate-800/80 bg-[#0d1522] text-slate-100 shadow-none';

  return (
    <section className="space-y-6 text-slate-100" aria-labelledby="annex-iv-title">
      <header className="border-b border-slate-800/80 pb-5">
        <Button asChild variant="ghost" className="-ml-3 text-slate-300 hover:bg-slate-900 hover:text-white">
          <Link href={`/${locale}/dashboard/regulatory-control-tower`}><ArrowLeft className="mr-2 h-4 w-4" />Back to control tower</Link>
        </Button>
        <Badge className="mt-3 border-blue-400/25 bg-blue-500/10 text-blue-200">Article 11 · Annex IV</Badge>
        <h1 id="annex-iv-title" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Annex IV Technical Documentation</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Author, evidence and independently approve all twelve governed technical-documentation sections.</p>
      </header>

      <div className="flex gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>Readiness support only. This workflow does not certify technical truth, conformity or market-placement authorization.</p>
      </div>

      {notice && <div className="rounded-xl border border-slate-800 bg-[#0d1522] p-4 text-sm text-slate-200" role="status">{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle>Packages</CardTitle>
            <CardDescription className="text-slate-400">{snapshot?.packages.length ?? 0} versioned packages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={systemReference} onChange={(event) => setSystemReference(event.target.value)} placeholder="AI system reference" className={inputClassName} />
            <Input value={systemVersion} onChange={(event) => setSystemVersion(event.target.value)} placeholder="System version" className={inputClassName} />
            <Button className="w-full bg-blue-600 text-white hover:bg-blue-500" disabled={busy} onClick={() => void run('package_create', { systemReference, systemVersion, applicability: 'required' })}>Create package</Button>
            <div className="space-y-2">
              {snapshot?.packages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selectedPackage === item.id}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedPackage === item.id ? 'border-blue-400/35 bg-blue-500/10' : 'border-slate-800 bg-slate-950/25 hover:bg-slate-900/70'}`}
                  onClick={() => setSelectedPackage(item.id)}
                >
                  <div className="font-semibold text-white">{item.system_reference} · v{item.documentation_version}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.status} · {item.approved_sections_count}/12</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className={cardClassName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-blue-300" />Package readiness</CardTitle>
              <CardDescription className="text-slate-400">{currentPackage ? `${completion}% · ${currentPackage.status}` : 'Select a package'}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {sectionCodes.map((code) => {
                const item = snapshot?.sections.find((section) => section.package_id === selectedPackage && section.section_code === code);
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={selectedSection === code}
                    onClick={() => setSelectedSection(code)}
                    className={`rounded-lg border p-3 text-left text-sm transition ${selectedSection === code ? 'border-blue-400/35 bg-blue-500/10' : 'border-slate-800 bg-slate-950/25 hover:bg-slate-900/70'}`}
                  >
                    <div className="font-medium text-white">{code.replaceAll('_', ' ')}</div>
                    <div className="mt-1 text-xs text-slate-400">{item?.status ?? 'not started'} · {item?.evidence_count ?? 0} evidence</div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {currentSection && (
            <Card className={cardClassName}>
              <CardHeader><CardTitle>{selectedSection.replaceAll('_', ' ')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Substantive summary</Label><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} className={inputClassName} /></div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input value={sourceVersion} onChange={(event) => setSourceVersion(event.target.value)} placeholder="Source version" className={inputClassName} />
                  <Input value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} placeholder="Reviewer UUID" className={inputClassName} />
                  <Input value={digest} onChange={(event) => setDigest(event.target.value)} placeholder="SHA-256 digest" className={inputClassName} />
                </div>
                <Button className="bg-blue-600 text-white hover:bg-blue-500" disabled={busy} onClick={() => void run('section_update', { packageId: selectedPackage, sectionCode: selectedSection, expectedUpdatedAt: currentSection.updated_at, summary, sourceVersion, reviewerUserId: reviewerId, contentDigest: digest })}>Save section</Button>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} placeholder="organization-id/path/to/evidence" className={inputClassName} />
                  <Button className="bg-blue-600 text-white hover:bg-blue-500" disabled={busy} onClick={() => void run('evidence_submit', { packageId: selectedPackage, sectionId: currentSection.id, evidenceType: 'document', evidenceReference, evidenceDigest: digest, sourceVersion })}>Submit evidence</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentPackage && <Button className="bg-blue-600 text-white hover:bg-blue-500" disabled={busy} onClick={() => void run('package_approve', { packageId: currentPackage.id, expectedUpdatedAt: currentPackage.updated_at, rationale: 'Independent Annex IV package approval after complete evidence review.' })}>Approve package</Button>}
        </div>
      </div>

      <Button variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white" disabled={busy} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </section>
  );
}
