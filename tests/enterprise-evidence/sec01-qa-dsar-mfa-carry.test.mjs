import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync,mkdtempSync,writeFileSync,readFileSync,rmSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { tmpdir } from 'node:os';
import * as validator from '../../scripts/enterprise-evidence/validate-evidence.mjs';

const INDEX='docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
const PROOFS=[
 'docs/enterprise/gate-closure-v33/A18_A09_COMBINED_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v34/A15_QAT01_FORMAL_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v35/A19_OPS02_ACCEPTANCE_PROOF.json',
];
const PATCH=[
 'tests/security/sec01-qa-dsar-mfa-readonly.sql',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-qa-dsar-mfa-carry.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('SEC-01 DSAR MFA SQL-only recovery source carry refuses unreviewed files, missing paths and altered accepted proof',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-ai-save-carry-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const put=(p,bytes)=>{const d=join(root,p);mkdirSync(dirname(d),{recursive:true});writeFileSync(d,bytes);};
 const commit=msg=>{git('add','.');git('commit','-qm',msg);return git('rev-parse','HEAD');};
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 try{
  git('init','-q');git('config','user.email','fixture@example.invalid');git('config','user.name','CI');
  const files=new Set(PROOFS);
  for(const gate of index.gates||[])if(gate.accepted===true)files.add(gate.acceptance_evidence_ref);
  for(const row of index.evidence_records||[])if(row.status==='PASS')files.add(row.artifact_path);
  put(INDEX,JSON.stringify(index));
  for(const file of files)put(file,readFileSync(file));
  const checkpoint=commit('frozen accepted main');
  for(const file of PATCH)put(file,'reviewed source: '+file+'\n');
  const reviewed=commit('privacy-safe marketing source candidate');
  const opts={root,checkpoint,expectedSha:reviewed};
  assert.equal(validator.sec01QaCarryIntegrity(index,opts),true);
  assert.equal(validator.sec01QaCarryIntegrity(index,{...opts,expectedSha:checkpoint}),false);
  assert.equal(validator.sec01QaCarryIntegrity({...index,extra:true},opts),false);
  git('reset','--hard',checkpoint);
  for(const file of PATCH.slice(0,-1))put(file,'missing source test');
  const missing=commit('missing exact source path');
  assert.equal(validator.sec01QaCarryIntegrity(index,{...opts,expectedSha:missing}),false);
  for(const [file,bytes] of [
   ['src/app/api/billing/webhook/route.ts','unauthorized billing change'],
   ['supabase/migrations/20261120000000_override.sql','unreviewed database change'],
   [INDEX,'{}'],
   [PROOFS[0],'altered accepted gate'],
   ['.github/workflows/full-security-suite.yml','disable required CI'],
  ]){
   git('reset','--hard',reviewed);put(file,bytes);
   const invalid=commit('unexpected evidence or source change');
   assert.equal(validator.sec01QaCarryIntegrity(index,{...opts,expectedSha:invalid}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('only independently authenticated current-head GitHub PR review qualifies',()=>{
 const sha='a'.repeat(40),pull={number:2762,sha,mergedAt:null};
 const body=[
  'A-09/BIL-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15/QAT-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-18/OPS-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-19/OPS-02 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15 CUMULATIVE ACCEPTANCE SECURITY REVIEW: APPROVED',
  'SEC-01 QA DSAR MFA SQL-ONLY FOUR-GATE CARRY SECURITY REVIEW: APPROVED',
 ].join('\n');
 const yes={id:101,state:'APPROVED',user:{login:'renansilva2002-tech'},commit_id:sha,
  body,submitted_at:'2026-11-20T09:15:00Z',
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2762#pullrequestreview-101'};
 const pass=(rows,p=pull)=>Boolean(validator.sec01QaCarryApprovedReview(rows,p));
 assert.equal(pass([yes]),true);
 assert.equal(pass([yes],{...pull,number:2748}),false);
 assert.equal(pass([{...yes,body:''}]),false);
 assert.equal(pass([{...yes,body:body.replace('SEC-01 QA DSAR MFA SQL-ONLY FOUR-GATE CARRY SECURITY REVIEW: APPROVED','')}]),false);
 assert.equal(pass([{...yes,commit_id:'b'.repeat(40)}]),false);
 assert.equal(pass([{...yes,user:{login:'renanescola40-afk'}}]),false);
 assert.equal(pass([{...yes,state:'COMMENTED'}]),false);
 assert.equal(pass([{...yes,html_url:'https://example.invalid'}]),false);
 assert.equal(pass([{...yes,submitted_at:'invalid'}]),false);
 assert.equal(pass([{...yes,body:body+'\nA-15/QAT-01 NOT APPROVED'}]),false);
 assert.equal(pass([yes,{...yes,id:102,state:'DISMISSED',submitted_at:'2026-11-20T09:20:00Z'}]),false);
 assert.equal(pass([yes,{...yes,id:103,state:'CHANGES_REQUESTED',submitted_at:'2026-11-20T09:20:00Z'}]),false);
});

test('SEC-01 DSAR MFA SQL-only source carry is pinned to authenticated main and exact-head mandatory source CI',()=>{
 const s=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 for(const str of [
  'SEC01_QA_CARRY_PR=2762',
  "SEC01_QA_CARRY_BASE='6d41f70ec9a62ca68e6755173419f7493dabe2ab'",
  'SEC01_QA_CARRY_RUN=44917996481',
  'SEC01_QA_CARRY_ARTIFACT=14712980248',
  "SEC01_QA_CARRY_DIGEST='9ad947e323ce9edd9ded4564a0b99abb69b94337de0dce7009a30803a6f73c2a'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'sec01QaCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','sec01QaCarry:true',
  "const sec01QaCarry=Boolean(cumulative&&cumulativeReview?.sec01QaCarry===true",
  'return verifySec01QaCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests',
  'Core CI, build and npm audit','CI / quality','Validate P0 runtime evidence register'
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2762 source carry preserves exactly four accepted gates only in synthetic reconciliation',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2762')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.sec01QaCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={sec01QaCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2762#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-12')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
});
