import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {validateEvidenceRecord,reconcile} from '../../scripts/enterprise-evidence/validate-evidence.mjs';
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
