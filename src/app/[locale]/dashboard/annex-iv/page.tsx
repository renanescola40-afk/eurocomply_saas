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
    } catch { setNotice('Unable to load Annex IV workflow.'); } finally { setBusy(false); }
  }, [selectedPackage]);

  useEffect(() => { void load(); }, [load]);
  const currentPackage = snapshot?.packages.find((item) => item.id === selectedPackage);
  const currentSection = snapshot?.sections.find((item) => item.package_id === selectedPackage && item.section_code === selectedSection);
  useEffect(() => {
    if (!currentSection) return;
    setSummary(currentSection.summary); setSourceVersion(currentSection.source_version);
    setReviewerId(currentSection.reviewer_user_id ?? ''); setDigest(currentSection.content_digest ?? '');
  }, [currentSection]);

  async function run(workflow: string, body: Record<string, unknown>) {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/api/ai-governance/annex-iv?workflow=${workflow}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string; package?: Package };
      if (!response.ok) throw new Error(payload.error ?? 'workflow_failed');
      if (payload.package) setSelectedPackage(payload.package.id);
      setNotice('Workflow saved and audit evidence persisted.'); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Workflow failed.'); } finally { setBusy(false); }
  }

  const completion = useMemo(() => currentPackage ? Math.round((currentPackage.approved_sections_count / 12) * 100) : 0, [currentPackage]);
  return <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white"><div className="mx-auto max-w-7xl space-y-6">
    <div><Button asChild variant="ghost"><Link href={`/${locale}/dashboard/regulatory-control-tower`}><ArrowLeft className="mr-2 h-4 w-4" />Back to control tower</Link></Button><Badge className="mt-3 border-cyan-400/30 bg-cyan-400/10 text-cyan-200">Article 11 · Annex IV</Badge><h1 className="mt-3 text-4xl font-black">Annex IV Technical Documentation</h1><p className="mt-2 text-slate-400">Author, evidence and independently approve all twelve governed technical-documentation sections.</p></div>
    <Card className="border-amber-400/20 bg-amber-400/[0.06]"><CardContent className="flex gap-3 p-4 text-sm text-amber-100"><ShieldAlert className="h-5 w-5" /><p>Readiness support only. This workflow does not certify technical truth, conformity or market-placement authorization.</p></CardContent></Card>
    {notice && <Card className="border-white/10 bg-white/[0.04]"><CardContent className="p-4">{notice}</CardContent></Card>}
    <section className="grid gap-6 lg:grid-cols-[330px_1fr]">
      <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle>Packages</CardTitle><CardDescription>{snapshot?.packages.length ?? 0} versioned packages</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={systemReference} onChange={(e) => setSystemReference(e.target.value)} placeholder="AI system reference" /><Input value={systemVersion} onChange={(e) => setSystemVersion(e.target.value)} placeholder="System version" /><Button className="w-full" disabled={busy} onClick={() => void run('package_create', { systemReference, systemVersion, applicability: 'required' })}>Create package</Button>{snapshot?.packages.map((item) => <button key={item.id} className="w-full rounded-lg border border-white/10 p-3 text-left" onClick={() => setSelectedPackage(item.id)}><div className="font-semibold">{item.system_reference} · v{item.documentation_version}</div><div className="text-xs text-slate-400">{item.status} · {item.approved_sections_count}/12</div></button>)}</CardContent></Card>
      <div className="space-y-6">
        <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />Package readiness</CardTitle><CardDescription>{currentPackage ? `${completion}% · ${currentPackage.status}` : 'Select a package'}</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{sectionCodes.map((code) => { const item = snapshot?.sections.find((s) => s.package_id === selectedPackage && s.section_code === code); return <button key={code} onClick={() => setSelectedSection(code)} className="rounded-lg border border-white/10 p-3 text-left text-sm"><div className="font-medium">{code.replaceAll('_', ' ')}</div><div className="text-xs text-slate-400">{item?.status ?? 'not started'} · {item?.evidence_count ?? 0} evidence</div></button>; })}</CardContent></Card>
        {currentSection && <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle>{selectedSection.replaceAll('_', ' ')}</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Substantive summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} /></div><div className="grid gap-3 md:grid-cols-3"><Input value={sourceVersion} onChange={(e) => setSourceVersion(e.target.value)} placeholder="Source version" /><Input value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} placeholder="Reviewer UUID" /><Input value={digest} onChange={(e) => setDigest(e.target.value)} placeholder="SHA-256 digest" /></div><Button disabled={busy} onClick={() => void run('section_update', { packageId: selectedPackage, sectionCode: selectedSection, expectedUpdatedAt: currentSection.updated_at, summary, sourceVersion, reviewerUserId: reviewerId, contentDigest: digest })}>Save section</Button><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={evidenceReference} onChange={(e) => setEvidenceReference(e.target.value)} placeholder="organization-id/path/to/evidence" /><Button disabled={busy} onClick={() => void run('evidence_submit', { packageId: selectedPackage, sectionId: currentSection.id, evidenceType: 'document', evidenceReference, evidenceDigest: digest, sourceVersion })}>Submit evidence</Button></div></CardContent></Card>}
        {currentPackage && <Button disabled={busy} onClick={() => void run('package_approve', { packageId: currentPackage.id, expectedUpdatedAt: currentPackage.updated_at, rationale: 'Independent Annex IV package approval after complete evidence review.' })}>Approve package</Button>}
      </div>
    </section>
    <Button variant="outline" disabled={busy} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
  </div></main>;
}
