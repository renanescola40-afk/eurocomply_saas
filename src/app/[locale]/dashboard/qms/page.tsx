'use client';

import { useEffect, useMemo, useState } from 'react';

type QmsSystem={id:string;title:string;version:number;status:string;updated_at:string;severe_nonconformities_count:number;overdue_corrective_actions_count:number};
type Snapshot={systems:QmsSystem[];controls:Array<{id:string;qms_system_id:string;status:string}>;nonconformities:Array<{id:string;qms_system_id:string;severity:string;status:string}>;audits:Array<{id:string;qms_system_id:string;status:string}>;reviews:Array<{id:string;qms_system_id:string;status:string}>};

export default function QmsPage(){
  const [data,setData]=useState<Snapshot|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [title,setTitle]=useState('Enterprise AI Quality Management System'); const [scope,setScope]=useState('Governance of AI systems across design, deployment, monitoring and post-market activities.');
  const [policy,setPolicy]=useState('Maintain accountable, evidence-backed and continuously improved AI governance processes.'); const [strategy,setStrategy]=useState('Operate Article 17 readiness controls with independent review and traceable decisions.');
  async function load(){ const response=await fetch('/api/ai-governance/qms',{cache:'no-store'}); const body=await response.json(); if(!response.ok)throw new Error(body.error??'qms_load_failed'); setData(body); }
  useEffect(()=>{load().catch(e=>setError(e.message));},[]);
  async function createSystem(){ setBusy(true);setError(''); try{const response=await fetch('/api/ai-governance/qms?workflow=system_create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,scope,qualityPolicy:policy,regulatoryStrategy:strategy})});const body=await response.json();if(!response.ok)throw new Error(body.error??'qms_create_failed');await load();}catch(e){setError(e instanceof Error?e.message:'qms_create_failed');}finally{setBusy(false);} }
  const active=data?.systems[0]??null;
  const metrics=useMemo(()=>active?{
    controls:data?.controls.filter(x=>x.qms_system_id===active.id).length??0,
    openCapa:data?.nonconformities.filter(x=>x.qms_system_id===active.id&&!['closed','accepted_risk'].includes(x.status)).length??0,
    acceptedAudits:data?.audits.filter(x=>x.qms_system_id===active.id&&x.status==='accepted').length??0,
    approvedReviews:data?.reviews.filter(x=>x.qms_system_id===active.id&&x.status==='approved').length??0,
  }:null,[data,active]);
  return <main className="mx-auto max-w-7xl space-y-6 p-6">
    <header><p className="text-sm text-muted-foreground">Article 17</p><h1 className="text-3xl font-semibold">Quality Management System</h1><p className="mt-2 text-muted-foreground">Govern policies, controls, CAPA, internal audits, management reviews and approval evidence.</p></header>
    {error&&<div role="alert" className="rounded-lg border border-destructive p-3 text-sm">{error}</div>}
    <section className="grid gap-4 md:grid-cols-4">{[['Controls',metrics?.controls??0],['Open CAPA',metrics?.openCapa??0],['Accepted audits',metrics?.acceptedAudits??0],['Approved reviews',metrics?.approvedReviews??0]].map(([label,value])=><div key={String(label)} className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>)}</section>
    {!active?<section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-medium">Create QMS</h2><input aria-label="QMS title" className="w-full rounded border p-2" value={title} onChange={e=>setTitle(e.target.value)}/><textarea aria-label="QMS scope" className="w-full rounded border p-2" value={scope} onChange={e=>setScope(e.target.value)}/><textarea aria-label="Quality policy" className="w-full rounded border p-2" value={policy} onChange={e=>setPolicy(e.target.value)}/><textarea aria-label="Regulatory strategy" className="w-full rounded border p-2" value={strategy} onChange={e=>setStrategy(e.target.value)}/><button disabled={busy} onClick={createSystem} className="rounded bg-primary px-4 py-2 text-primary-foreground">{busy?'Creating…':'Create governed QMS'}</button></section>:
    <section className="rounded-xl border p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-medium">{active.title}</h2><p className="text-sm text-muted-foreground">Version {active.version} · {active.status}</p></div><span className="rounded-full border px-3 py-1 text-sm">Severe findings: {active.severe_nonconformities_count} · Overdue CAPA: {active.overdue_corrective_actions_count}</span></div><p className="mt-4 text-sm text-muted-foreground">Approval remains blocked until every control is effective, at least one audit is accepted, management review is approved and no severe or overdue corrective action remains.</p></section>}
  </main>;
}
