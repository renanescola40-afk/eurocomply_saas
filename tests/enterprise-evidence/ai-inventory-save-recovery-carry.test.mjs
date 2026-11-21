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
 'src/app/[locale]/ai-systems/ai-systems-client.tsx',
 'tests/product/ai-inventory-save-resilience.test.ts',
 'vitest.config.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/ai-inventory-save-recovery-carry.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('AI inventory save recovery source carry refuses unreviewed files, missing paths and altered accepted proof',()=>{
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
  assert.equal(validator.aiSaveCarryIntegrity(index,opts),true);
  assert.equal(validator.aiSaveCarryIntegrity(index,{...opts,expectedSha:checkpoint}),false);
  assert.equal(validator.aiSaveCarryIntegrity({...index,extra:true},opts),false);
  git('reset','--hard',checkpoint);
  for(const file of PATCH.slice(0,-1))put(file,'missing source test');
  const missing=commit('missing exact source path');
  assert.equal(validator.aiSaveCarryIntegrity(index,{...opts,expectedSha:missing}),false);
  for(const [file,bytes] of [
   ['src/app/api/billing/webhook/route.ts','unauthorized billing change'],
   ['supabase/migrations/20261120000000_override.sql','unreviewed database change'],
   [INDEX,'{}'],
   [PROOFS[0],'altered accepted gate'],
   ['.github/workflows/full-security-suite.yml','disable required CI'],
  ]){
   git('reset','--hard',reviewed);put(file,bytes);
   const invalid=commit('unexpected evidence or source change');
   assert.equal(validator.aiSaveCarryIntegrity(index,{...opts,expectedSha:invalid}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('only independently authenticated current-head GitHub PR review qualifies',()=>{
 const sha='a'.repeat(40),pull={number:2761,sha,mergedAt:null};
 const body=[
  'A-09/BIL-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15/QAT-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-18/OPS-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-19/OPS-02 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15 CUMULATIVE ACCEPTANCE SECURITY REVIEW: APPROVED',
  'AI INVENTORY SAVE RECOVERY FOUR-GATE CARRY SECURITY REVIEW: APPROVED',
 ].join('\n');
 const yes={id:101,state:'APPROVED',user:{login:'renansilva2002-tech'},commit_id:sha,
  body,submitted_at:'2026-11-20T09:15:00Z',
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2761#pullrequestreview-101'};
 const pass=(rows,p=pull)=>Boolean(validator.aiSaveCarryApprovedReview(rows,p));
 assert.equal(pass([yes]),true);
 assert.equal(pass([yes],{...pull,number:2748}),false);
 assert.equal(pass([{...yes,body:''}]),false);
 assert.equal(pass([{...yes,body:body.replace('AI INVENTORY SAVE RECOVERY FOUR-GATE CARRY SECURITY REVIEW: APPROVED','')}]),false);
 assert.equal(pass([{...yes,commit_id:'b'.repeat(40)}]),false);
 assert.equal(pass([{...yes,user:{login:'renanescola40-afk'}}]),false);
 assert.equal(pass([{...yes,state:'COMMENTED'}]),false);
 assert.equal(pass([{...yes,html_url:'https://example.invalid'}]),false);
 assert.equal(pass([{...yes,submitted_at:'invalid'}]),false);
 assert.equal(pass([{...yes,body:body+'\nA-15/QAT-01 NOT APPROVED'}]),false);
 assert.equal(pass([yes,{...yes,id:102,state:'DISMISSED',submitted_at:'2026-11-20T09:20:00Z'}]),false);
 assert.equal(pass([yes,{...yes,id:103,state:'CHANGES_REQUESTED',submitted_at:'2026-11-20T09:20:00Z'}]),false);
});

test('AI inventory save source carry is pinned to authenticated main and exact-head mandatory source CI',()=>{
 const s=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 for(const str of [
  'AI_SAVE_CARRY_PR=2761',
  "AI_SAVE_CARRY_BASE='5c2c7c36a2c2076e34157c8f26f48a476fe3c84a'",
  'AI_SAVE_CARRY_RUN=44908568957',
  'AI_SAVE_CARRY_ARTIFACT=14708332980',
  "AI_SAVE_CARRY_DIGEST='74d609a3c32b27b05b41b20b310eb361823385c92eb860e6be2e63c60f06c4f1'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'aiSaveCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','aiSaveCarry:true',
  "const aiSaveCarry=Boolean(cumulative&&cumulativeReview?.aiSaveCarry===true",
  'return verifyAiSaveCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests',
  'Core CI, build and npm audit','CI / quality','Validate P0 runtime evidence register'
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2761 source carry preserves exactly four accepted gates only in synthetic reconciliation',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2761')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.aiSaveCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={aiSaveCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2761#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-12')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
});
