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
 'docs/security/proposals/FUN_QA_SIGNED_SESSION_INVENTORY_RPC_REVIEW_20261122.md',
 'scripts/qa/qa-fun-inventory-signed-session-rpcs-install.sql',
 'scripts/qa/qa-fun-inventory-signed-session-rpcs-rollback.sql',
 'tests/security/qa-fun-inventory-signed-session-rpc-contract.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/fun-qa-private-aal2-assertion-carry.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('FUN-QA private AAL2 guard source carry refuses unreviewed files, missing paths and altered accepted proof',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-fun-qa-private-guard-carry-'));
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
  const reviewed=commit('FUN-QA private AAL2 guard candidate');
  const opts={root,checkpoint,expectedSha:reviewed};
  assert.equal(validator.funQaPrivateGuardCarryIntegrity(index,opts),true);
  assert.equal(validator.funQaPrivateGuardCarryIntegrity(index,{...opts,expectedSha:checkpoint}),false);
  assert.equal(validator.funQaPrivateGuardCarryIntegrity({...index,extra:true},opts),false);
  git('reset','--hard',checkpoint);
  for(const file of PATCH.slice(0,-1))put(file,'missing source test');
  const missing=commit('missing exact source path');
  assert.equal(validator.funQaPrivateGuardCarryIntegrity(index,{...opts,expectedSha:missing}),false);
  for(const [file,bytes] of [
   ['src/app/api/billing/webhook/route.ts','unauthorized billing change'],
   ['supabase/migrations/20261120000000_override.sql','unreviewed database change'],
   [INDEX,'{}'],
   [PROOFS[0],'altered accepted gate'],
   ['.github/workflows/full-security-suite.yml','disable required CI'],
  ]){
   git('reset','--hard',reviewed);put(file,bytes);
   const invalid=commit('unexpected evidence or source change');
   assert.equal(validator.funQaPrivateGuardCarryIntegrity(index,{...opts,expectedSha:invalid}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('only independently authenticated current-head GitHub PR review qualifies',()=>{
 const sha='a'.repeat(40),pull={number:2771,sha,mergedAt:null};
 const body=[
  'A-09/BIL-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15/QAT-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-18/OPS-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-19/OPS-02 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15 CUMULATIVE ACCEPTANCE SECURITY REVIEW: APPROVED',
  'FUN-QA PRIVATE AAL2 GUARD SOURCE-ONLY FOUR-GATE CARRY SECURITY REVIEW: APPROVED',
 ].join('\n');
 const yes={id:101,state:'APPROVED',user:{login:'renansilva2002-tech'},commit_id:sha,
  body,submitted_at:'2026-11-20T09:15:00Z',
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2771#pullrequestreview-101'};
 const pass=(rows,p=pull)=>Boolean(validator.funQaPrivateGuardCarryApprovedReview(rows,p));
 assert.equal(pass([yes]),true);
 assert.equal(pass([yes],{...pull,number:2748}),false);
 assert.equal(pass([{...yes,body:''}]),false);
 assert.equal(pass([{...yes,body:body.replace('FUN-QA PRIVATE AAL2 GUARD SOURCE-ONLY FOUR-GATE CARRY SECURITY REVIEW: APPROVED','')}]),false);
 assert.equal(pass([{...yes,commit_id:'b'.repeat(40)}]),false);
 assert.equal(pass([{...yes,user:{login:'renanescola40-afk'}}]),false);
 assert.equal(pass([{...yes,state:'COMMENTED'}]),false);
 assert.equal(pass([{...yes,html_url:'https://example.invalid'}]),false);
 assert.equal(pass([{...yes,submitted_at:'invalid'}]),false);
 assert.equal(pass([{...yes,body:body+'\nA-15/QAT-01 NOT APPROVED'}]),false);
 assert.equal(pass([yes,{...yes,id:102,state:'DISMISSED',submitted_at:'2026-11-20T09:20:00Z'}]),false);
 assert.equal(pass([yes,{...yes,id:103,state:'CHANGES_REQUESTED',submitted_at:'2026-11-20T09:20:00Z'}]),false);
});

test('FUN-QA private AAL2 guard source carry is pinned to authenticated main and exact-head mandatory source CI',()=>{
 const s=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 for(const str of [
  'FUN_QA_PRIVATE_GUARD_CARRY_PR=2771',
  "FUN_QA_PRIVATE_GUARD_CARRY_BASE='1ded3c6127a575a314849de86651685b4bf89204'",
  'FUN_QA_PRIVATE_GUARD_CARRY_RUN=45018947293',
  'FUN_QA_PRIVATE_GUARD_CARRY_ARTIFACT=14752887752',
  "FUN_QA_PRIVATE_GUARD_CARRY_DIGEST='817b6cfa9d7f98613a8e5f3678fcbbbed71d96783ff1475a1b90db3e72f37100'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'funQaPrivateGuardCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','funQaPrivateGuardCarry:true',
  "const funQaPrivateGuardCarry=Boolean(cumulative&&cumulativeReview?.funQaPrivateGuardCarry===true",
  'return verifyFunQaPrivateGuardCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests',
  'Core CI, build and npm audit','CI / quality','Validate P0 runtime evidence register'
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2771 source carry preserves exactly four accepted gates only in synthetic reconciliation',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2771')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.funQaPrivateGuardCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={funQaPrivateGuardCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2771#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-13')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
});
