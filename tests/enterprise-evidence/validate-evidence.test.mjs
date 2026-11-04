import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {validateEvidenceRecord,validateGateAcceptance,reconcile,evidenceExpectedSha} from '../../scripts/enterprise-evidence/validate-evidence.mjs';
const sha='a'.repeat(40),hash='b'.repeat(64),base={evidence_id:'EV-SEC-01-001',control_id:'SEC-01',gate_id:'A-01',evidence_type:'runtime-test',status:'NOT_VERIFIED',repository:'renanescola40-afk/eurocomply_saas',branch:'enterprise/evidence-factory-v1-20261101',commit_sha:sha,workflow_run_id:null,environment:'isolated-qa',generated_at:'2026-11-01T10:00:00Z',source_system:'GitHub Actions',test_command_or_provider_query:'npm run test:auth',result_summary:'Recorded, not accepted.',artifact_path:'artifacts/evidence/sec-01.json',artifact_sha256:hash,reproducibility_instructions:'Run against exact commit SHA.',limitations:[],reviewer_status:'NOT_REVIEWED',acceptance_status:'NOT_ACCEPTED'};
test('rejects evidence bound to another SHA',()=>assert.ok(validateEvidenceRecord(base,{expectedSha:'c'.repeat(40)}).includes('commit_sha_mismatch')));
test('PASS requires independent acceptance and an existing digest-matched artifact',()=>{const e=validateEvidenceRecord({...base,status:'PASS'},{expectedSha:sha});assert.ok(e.includes('pass_requires_independent_acceptance'));assert.ok(e.includes('artifact_missing'));});
test('NOT_APPLICABLE requires approved rationale',()=>assert.ok(validateEvidenceRecord({...base,status:'NOT_APPLICABLE'}).includes('not_applicable_requires_approved_rationale')));
test('rejects unknown status and invalid artifact digest',()=>{const e=validateEvidenceRecord({...base,status:'MAYBE',artifact_sha256:'x'});assert.ok(e.includes('status_invalid'));assert.ok(e.includes('artifact_sha256_invalid'));});
test('reconciliation preserves fixed denominators and blocks DAT-01 gate',()=>{const scope={mandatory:Array.from({length:38},(_,i)=>({id:'X-'+i,status:'NOT_VERIFIED'}))};scope.mandatory[0]={id:'SEC-01',status:'PASS'};scope.mandatory[1]={id:'SEC-02',status:'PASS'};scope.mandatory[2]={id:'DAT-01',status:'BLOCKED'};const groups=Array.from({length:24},(_,i)=>({id:'A-'+String(i+1).padStart(2,'0'),atomicCriteria:[i===0?'SEC-01':i===1?'SEC-02':i===2?'DAT-01':'X-'+i]}));const r=reconcile({scope,gates:{groups},index:{fixed_scope:{atomic_controls:38,formal_gates:24},gates:[{gate_id:'A-01',status:'REQUIRES_RECONCILIATION'}],evidence_records:[]}});assert.equal(r.summary.controls_total,38);assert.equal(r.summary.gates_total,24);assert.equal(r.summary.gates_blocked,1);assert.equal(r.gates.find(g=>g.gate_id==='A-01').status,'REQUIRES_RECONCILIATION');});

test('rejects stale runtime evidence',()=>{const e=validateEvidenceRecord({...base,status:'BLOCKED',generated_at:'2025-01-01T00:00:00Z'},{now:new Date('2026-11-01T00:00:00Z')});assert.ok(e.includes('artifact_missing'));assert.ok(e.includes('runtime_evidence_stale'));});

test('accepts a complete PASS record only when the artifact bytes match SHA-256',()=>{
 const artifact='evidence factory test artifact';
 const rel='artifacts/enterprise-evidence-factory/evidence-factory-test-artifact.txt';
 const abs=path.resolve(process.cwd(),rel);
 fs.mkdirSync(path.dirname(abs),{recursive:true});
 fs.writeFileSync(abs,artifact);
 const digest=crypto.createHash('sha256').update(artifact).digest('hex');
 const record={...base,status:'PASS',artifact_path:rel,artifact_sha256:digest,reviewer_status:'ACCEPTED',acceptance_status:'ACCEPTED',accepted_by:'Independent QA reviewer',accepted_at:'2026-11-01T11:00:00.000Z'};
 try { assert.deepEqual(validateEvidenceRecord(record,{expectedSha:sha,now:new Date('2026-11-01T12:00:00.000Z')}),[]); }
 finally { fs.rmSync(abs,{force:true}); }
});

test('does not promote a source PASS without accepted metadata and a referenced evidence file',()=>{
 const mandatory=Array.from({length:38},(_,i)=>({id:'X-'+i,status:'NOT_VERIFIED',evidenceRefs:[],acceptedBy:null,acceptedAt:null}));
 mandatory[0]={id:'SEC-01',status:'PASS',evidenceRefs:[],acceptedBy:null,acceptedAt:null};
 const groups=Array.from({length:24},(_,i)=>({id:'A-'+String(i+1).padStart(2,'0'),atomicCriteria:[i===0?'SEC-01':'X-'+i]}));
 const r=reconcile({scope:{mandatory},gates:{groups},index:{fixed_scope:{atomic_controls:38,formal_gates:24},evidence_records:[]}});
 assert.equal(r.summary.controls_pass,0);
 assert.equal(r.gates.find(g=>g.gate_id==='A-01').status,'NOT_ELIGIBLE');
});


test('rejects manually toggled A-12 acceptance when its atomic DAT-01 is BLOCKED',()=>{
 const mandatory=Array.from({length:38},(_,i)=>({id:'X-'+i,status:'NOT_VERIFIED',evidenceRefs:[]}));
 mandatory[0]={id:'DAT-01',status:'BLOCKED',evidenceRefs:[]};
 const groups=Array.from({length:24},(_,i)=>({id:'A-'+String(i+1).padStart(2,'0'),atomicCriteria:[i===0?'DAT-01':'X-'+i]}));
 const result=reconcile({scope:{mandatory},gates:{groups},index:{
  fixed_scope:{atomic_controls:38,formal_gates:24},
  evidence_records:[],
  gates:[{gate_id:'A-01',status:'PASS',accepted:true}]
 },expectedSha:sha});
 assert.equal(result.summary.gates_accepted,0);
 assert.equal(result.gates[0].accepted,false);
 assert.ok(result.errors.some(e=>e.includes('invalid_gate_acceptance:A-01')));
 assert.equal(result.valid,false);
});

test('rejects synthetic approved gate with missing review, proof digest or different SHA',()=>{
 const denied=validateGateAcceptance({accepted:true,accepted_by:'someone',accepted_at:'2099-01-01',acceptance_sha:'c'.repeat(40),acceptance_evidence_ref:'missing.json'},{
  eligible:true,expectedSha:sha,now:new Date('2026-11-03T00:00:00Z')
 });
 assert.ok(denied.includes('qualified_acceptance_required'));
 assert.ok(denied.includes('accepted_at_missing_invalid_or_future'));
 assert.ok(denied.includes('acceptance_sha_mismatch'));
 assert.ok(denied.includes('acceptance_artifact_missing'));
});

test('approved gate claim without all child PASS is rejected even with valid metadata and matching evidence bytes',()=>{
 const rel='artifacts/enterprise-evidence-factory/acceptance-gate-negative.json';
 const abs=path.resolve(process.cwd(),rel);
 fs.mkdirSync(path.dirname(abs),{recursive:true});
 const data='{"kind":"test-only"}';
 fs.writeFileSync(abs,data);
 const digest=crypto.createHash('sha256').update(data).digest('hex');
 const claim={accepted:true,accepted_by:'Reviewer 2',reviewer_id:'reviewer-2',
  reviewer_status:'ACCEPTED',acceptance_status:'ACCEPTED',
  accepted_at:'2026-11-02T12:00:00Z',acceptance_sha:sha,
  approval_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2598#pullrequestreview-123',
  acceptance_evidence_ref:rel,acceptance_evidence_sha256:digest};
 try{
  assert.deepEqual(validateGateAcceptance(claim,{eligible:true,expectedSha:sha,now:new Date('2026-11-03T00:00:00Z')}),[]);
  assert.ok(validateGateAcceptance(claim,{eligible:false,expectedSha:sha,now:new Date('2026-11-03T00:00:00Z')}).includes('child_controls_not_all_pass'));
 }finally{fs.rmSync(abs,{force:true});}
});

test('atomic PASS cannot use future, pre-evidence or whitespace-only acceptance',()=>{
 const acceptance={...base,status:'PASS',reviewer_status:'ACCEPTED',acceptance_status:'ACCEPTED',accepted_by:'QA reviewer'};
 const now=new Date('2026-11-03T12:00:00Z');
 assert.ok(validateEvidenceRecord({...acceptance,accepted_at:'2099-01-01T00:00:00Z'},{expectedSha:sha,now}).includes('pass_acceptance_time_invalid'));
 assert.ok(validateEvidenceRecord({...acceptance,accepted_at:'2026-10-01T00:00:00Z'},{expectedSha:sha,now}).includes('pass_acceptance_time_invalid'));
 assert.ok(validateEvidenceRecord({...acceptance,accepted_by:'   ',accepted_at:'2026-11-01T11:00:00Z'},{expectedSha:sha,now}).includes('pass_requires_independent_acceptance'));
});


test('source PASS with forged acceptance metadata and nonexistent artifact is NOT_VERIFIED',()=>{
 const mandatory=Array.from({length:38},(_,i)=>({
  id:'X-'+i,status:'NOT_VERIFIED',evidenceRefs:[],acceptedBy:null,acceptedAt:null,
 }));
 mandatory[0]={id:'SEC-01',status:'PASS',acceptedBy:'Unverified reviewer',
  acceptedAt:'2026-11-02T10:00:00Z',evidenceRefs:['docs/enterprise/evidence/NONEXISTENT_ACCEPTANCE_PROOF.json']};
 const groups=Array.from({length:24},(_,i)=>({
  id:'A-'+String(i+1).padStart(2,'0'),atomicCriteria:[i===0?'SEC-01':'X-'+i],
 }));
 const r=reconcile({scope:{mandatory},gates:{groups},index:{
  fixed_scope:{atomic_controls:38,formal_gates:24},evidence_records:[],gates:[],
 },expectedSha:sha,now:new Date('2026-11-04T00:00:00Z')});
 assert.equal(r.controls[0].status,'NOT_VERIFIED');
 assert.equal(r.summary.controls_pass,0);
 assert.equal(r.gates[0].status,'NOT_ELIGIBLE');
 assert.equal(r.summary.gates_accepted,0);
 assert.equal(r.valid,false);
 assert.ok(r.errors.includes('source_pass_unverified:SEC-01'));
});

test('historical source PASS retains only two legitimate provider-backed controls',()=>{
 const frozen=JSON.parse(fs.readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gateMap=JSON.parse(fs.readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const index=JSON.parse(fs.readFileSync('docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json','utf8'));
 const r=reconcile({scope:frozen,gates:gateMap,index,expectedSha:index.source.commit_sha,
   now:new Date('2026-11-04T12:00:00Z')});
 assert.equal(r.summary.controls_pass,2);
 assert.equal(r.controls.find(c=>c.control_id==='BIL-01').status,'PASS');
 assert.equal(r.controls.find(c=>c.control_id==='OPS-01').status,'PASS');
 assert.equal(r.gates.find(g=>g.gate_id==='A-09').status,'ELIGIBLE_FOR_INDEPENDENT_REVIEW');
 assert.equal(r.gates.find(g=>g.gate_id==='A-18').status,'ELIGIBLE_FOR_INDEPENDENT_REVIEW');
 assert.equal(r.summary.gates_accepted,0);
});


test('accepted synthetic evidence cannot override frozen BLOCKED DAT-01 without source reconciliation',()=>{
 const rel='artifacts/enterprise-evidence-factory/dat01-frozen-blocked-injection-test.txt';
 const abs=path.resolve(process.cwd(),rel);
 const bytes='synthetic blocked control test only - no provider readback';
 fs.mkdirSync(path.dirname(abs),{recursive:true});
 fs.writeFileSync(abs,bytes);
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const record={...base,evidence_id:'EV-DAT01-FORGED-PASS',
  control_id:'DAT-01',gate_id:'A-12',status:'PASS',artifact_path:rel,
  artifact_sha256:digest,reviewer_status:'ACCEPTED',acceptance_status:'ACCEPTED',
  accepted_by:'Synthetic independent reviewer - not actual review',
  accepted_at:'2026-11-01T11:00:00Z'};
 const scope=JSON.parse(fs.readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(fs.readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 try{
  const result=reconcile({scope,gates,index:{fixed_scope:{atomic_controls:38,formal_gates:24},
   evidence_records:[record]},expectedSha:sha,now:new Date('2026-11-04T10:00:00Z')});
  assert.equal(result.controls.find(x=>x.control_id==='DAT-01').status,'BLOCKED');
  assert.equal(result.gates.find(x=>x.gate_id==='A-12').status,'BLOCKED');
  assert.equal(result.summary.gates_accepted,0);
  assert.equal(result.valid,false);
  assert.ok(result.errors.includes('blocked_control_pass_claim_requires_source_reconciliation:DAT-01'));
  assert.equal(result.summary.controls_total,38);
  assert.equal(result.summary.gates_total,24);
 }finally{fs.rmSync(abs,{force:true});}
});


test('archived, never-approved readbacks keep baseline SHA but PASS and review claims require the current SHA',()=>{
 const frozen='a'.repeat(40),candidate='c'.repeat(40);
 const historic={...base,commit_sha:frozen,status:'NOT_VERIFIED',
  reviewer_status:'NOT_REVIEWED',acceptance_status:'NOT_ACCEPTED'};
 for(const status of ['NOT_VERIFIED','BLOCKED','FAIL']){
  assert.equal(evidenceExpectedSha({...historic,status},{frozenSha:frozen,candidateSha:candidate}),frozen);
 }
 for(const changed of [{status:'PASS'},{reviewer_status:'ACCEPTED'},
  {acceptance_status:'ACCEPTED'},{commit_sha:'d'.repeat(40)}]){
  assert.equal(evidenceExpectedSha({...historic,...changed},{frozenSha:frozen,candidateSha:candidate}),candidate);
 }
});

test('historic provider readback validates at immutable origin but cannot masquerade as current approved PASS',()=>{
 const frozen='a'.repeat(40),candidate='c'.repeat(40);
 const rel='artifacts/enterprise-evidence-factory/archive-versus-current-test.txt';
 const abs=path.resolve(process.cwd(),rel);
 const data='historical provider readback fixture, not independently approved';
 fs.mkdirSync(path.dirname(abs),{recursive:true});fs.writeFileSync(abs,data);
 const artifact_sha256=crypto.createHash('sha256').update(data).digest('hex');
 const evidence={...base,evidence_id:'EV-SEC01-HISTORIC',commit_sha:frozen,status:'NOT_VERIFIED',
  artifact_path:rel,artifact_sha256};
 const scope=JSON.parse(fs.readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(fs.readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const index={source:{commit_sha:frozen},fixed_scope:{atomic_controls:38,formal_gates:24},
  evidence_records:[evidence]};
 try{
  const archived=reconcile({scope,gates,index,expectedSha:candidate,now:new Date('2026-11-04T12:00:00Z')});
  assert.equal(archived.summary.evidence_records_valid,1);
  assert.ok(!archived.errors.some(e=>e.includes('commit_sha_mismatch')));
  assert.equal(archived.summary.controls_pass,2);
  assert.equal(archived.summary.gates_accepted,0);
  const forged={...evidence,status:'PASS',reviewer_status:'ACCEPTED',
   acceptance_status:'ACCEPTED',accepted_by:'Synthetic reviewer only',
   accepted_at:'2026-11-01T11:00:00Z'};
  const rejected=reconcile({scope,gates,index:{...index,evidence_records:[forged]},
   expectedSha:candidate,now:new Date('2026-11-04T12:00:00Z')});
  assert.equal(rejected.summary.evidence_records_valid,0);
  assert.equal(rejected.controls.find(c=>c.control_id==='SEC-01').status,'NOT_VERIFIED');
  assert.ok(rejected.errors.some(e=>e.includes('commit_sha_mismatch')));
 }finally{fs.rmSync(abs,{force:true});}
});


test('all four archived Evidence Factory records are SHA-256-bound to existing immutable artifact bytes',()=>{
 const index=JSON.parse(fs.readFileSync('docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json','utf8'));
 assert.equal(index.evidence_records.length,4,'frozen initial index must keep four records');
 for(const record of index.evidence_records){
  const absolute=path.resolve(process.cwd(),record.artifact_path);
  assert.ok(absolute.startsWith(process.cwd()+path.sep),'artifact must stay in repository');
  assert.ok(fs.existsSync(absolute),record.evidence_id+' artifact missing');
  const digest=crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  assert.equal(digest,record.artifact_sha256,record.evidence_id+' artifact hash is stale or tampered');
  assert.equal(record.commit_sha,index.source.commit_sha,record.evidence_id+' frozen SHA changed');
  assert.notEqual(record.status,'PASS','historical provider readback cannot silently grant PASS');
 }
});
