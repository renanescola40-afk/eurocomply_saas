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
 'scripts/security/run-step-up-mfa-runtime-validation.mjs',
 'scripts/enterprise-gates/a01-sec01-qa-mfa-provider-proof.mjs',
 '.github/workflows/sec01-isolated-qa-mfa-provider.yml',
 'tests/security/sec01-qa-mfa-provider-proof-workflow.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-qa-mfa-actions-carry.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('SEC-01 QA MFA Actions workflow carry is scoped and preserves immutable accepted evidence',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-sec01-qa-mfa-actions-carry-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const put=(p,bytes)=>{const file=join(root,p);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,bytes);};
 const commit=message=>{git('add','.');git('commit','-qm',message);return git('rev-parse','HEAD');};
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 try{
  git('init','-q');git('config','user.email','fixture@example.invalid');git('config','user.name','CI');
  const files=new Set(PROOFS);
  for(const gate of index.gates||[])if(gate.accepted===true)files.add(gate.acceptance_evidence_ref);
  for(const record of index.evidence_records||[])if(record.status==='PASS')files.add(record.artifact_path);
  put(INDEX,JSON.stringify(index));
  for(const file of files)put(file,readFileSync(file));
  const base=commit('main with frozen accepted gates');
  for(const file of PATCH)put(file,'QA-only MFA proof: '+file+'\n');
  const head=commit('QA MFA provider runner candidate');
  const options={root,checkpoint:base,expectedSha:head};
  assert.equal(validator.sec01QaMfaActionsCarryIntegrity(index,options),true);
  assert.equal(validator.sec01QaMfaActionsCarryIntegrity(index,{...options,expectedSha:base}),false);
  assert.equal(validator.sec01QaMfaActionsCarryIntegrity({...index,extra:true},options),false);
  git('reset','--hard',base);
  for(const file of PATCH.slice(0,-1))put(file,'incomplete patch\n');
  const missing=commit('missing required test or workflow');
  assert.equal(validator.sec01QaMfaActionsCarryIntegrity(index,{...options,expectedSha:missing}),false);
  for(const [file,bytes] of [
    ['src/app/api/billing/webhook/route.ts','unreviewed billing'],
    ['netlify.toml','disabled QA guard'],
    ['supabase/migrations/20261122000000_unsafe.sql','unreviewed SQL'],
    [INDEX,'{}'],
    [PROOFS[0],'altered accepted evidence'],
    ['.github/workflows/full-security-suite.yml','bypass CI'],
  ]){
    git('reset','--hard',head);put(file,bytes);
    const altered=commit('forbidden modification');
    assert.equal(validator.sec01QaMfaActionsCarryIntegrity(index,{...options,expectedSha:altered}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('SEC-01 QA MFA Actions native exact-head security review must be substantive, valid and not withdrawn',()=>{
 const sha='a'.repeat(40),pull={number:2781,sha,mergedAt:null};
 const reviewLabel='SEC-01 QA-ONLY SIGNED MFA GITHUB ACTIONS FOUR-GATE SOURCE CARRY SECURITY REVIEW: APPROVED';
 const body=[
  'A-09/BIL-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15/QAT-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-18/OPS-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-19/OPS-02 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15 CUMULATIVE ACCEPTANCE SECURITY REVIEW: APPROVED',
  reviewLabel,
 ].join('\n');
 const good={id:101,state:'APPROVED',user:{login:'renanescola40-afk'},commit_id:sha,
  body,submitted_at:'2026-11-22T12:00:00Z',
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2781#pullrequestreview-101'};
 const accepts=(rows,p=pull)=>Boolean(validator.sec01QaMfaActionsCarryApprovedReview(rows,p));
 assert.equal(accepts([good]),true);
 assert.equal(accepts([good],{...pull,number:2771}),false);
 assert.equal(accepts([{...good,body:''}]),false);
 assert.equal(accepts([{...good,body:body.replace(reviewLabel,'')}]),false);
 assert.equal(accepts([{...good,commit_id:'b'.repeat(40)}]),false);
 assert.equal(accepts([{...good,user:{login:'renansilva2002-tech'}}]),false);
 assert.equal(accepts([{...good,state:'COMMENTED'}]),false);
 assert.equal(accepts([{...good,html_url:'https://example.invalid'}]),false);
 assert.equal(accepts([{...good,submitted_at:'not-a-date'}]),false);
 assert.equal(accepts([{...good,body:body+'\nA-15/QAT-01 NOT APPROVED'}]),false);
 assert.equal(accepts([good,{...good,id:102,state:'DISMISSED',submitted_at:'2026-11-22T12:01:00Z'}]),false);
 assert.equal(accepts([good,{...good,id:103,state:'CHANGES_REQUESTED',submitted_at:'2026-11-22T12:01:00Z'}]),false);
});

test('source carry is bound to actual historical main provider evidence and current-head checks',()=>{
 const s=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 for(const str of [
  'SEC01_QA_MFA_ACTIONS_CARRY_PR=2781',
  "SEC01_QA_MFA_ACTIONS_REVIEWER='renanescola40-afk'",
  "SEC01_QA_MFA_ACTIONS_CARRY_BASE='a8f6e1c935e63d8ea85e8f4e68f14792cac5d884'",
  "SEC01_QA_MFA_ACTIONS_ORIGIN_BASE='26f171972543c4366a775fe55e970c14e0ef920e'",
  'SEC01_QA_MFA_ACTIONS_CARRY_RUN=45024564260',
  'SEC01_QA_MFA_ACTIONS_CARRY_ARTIFACT=14755102859',
  "SEC01_QA_MFA_ACTIONS_CARRY_DIGEST='00b7771a05d68ee5444538b614bb175895e62367f7116c64fc32af57d2d91ff0'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'sec01QaMfaActionsCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','sec01QaMfaActionsCarry:true',
  "const sec01QaMfaActionsCarry=Boolean(cumulative&&cumulativeReview?.sec01QaMfaActionsCarry===true",
  'return verifySec01QaMfaActionsCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests','Core CI, build and npm audit',
  'CI / quality','Validate P0 runtime evidence register',
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2781 source carry admits only the pre-existing four gates with a hypothetical approved review',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2781')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.sec01QaMfaActionsCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={sec01QaMfaActionsCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2781#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-12')?.accepted,false);
});




test('new workflow is manual QA-only and its positive AAL1->AAL2 proof cannot grant Enterprise acceptance',()=>{
 const workflow=readFileSync('.github/workflows/sec01-isolated-qa-mfa-provider.yml','utf8');
 const runner=readFileSync('scripts/enterprise-gates/a01-sec01-qa-mfa-provider-proof.mjs','utf8');
 const upstream=readFileSync('scripts/security/run-step-up-mfa-runtime-validation.mjs','utf8');
 const tests=readFileSync('tests/security/sec01-qa-mfa-provider-proof-workflow.test.ts','utf8');
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+(?:push|pull_request|workflow_run|schedule):/m);
 assert.doesNotMatch(workflow,/environment:\s*Production/);
 assert.match(workflow,/environment: QA-Supabase/);
 assert.match(workflow,/needs: qa-environment-governance/);
 assert.match(workflow,/check-github-environment-governance\.mjs/);
 assert.match(workflow,/secrets\.E2E_QA_SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(workflow,/secrets\.E2E_QA_SUPABASE_URL/);
 assert.match(workflow,/STEP_UP_QA_PROJECT_REF: zrxrrfbllsxtleyxjpsz/);
 assert.match(workflow,/STEP_UP_QA_EXECUTE: QA_ONLY_MFA_RUNTIME_PROOF/);
 assert.match(workflow,/git ls-remote/);
 assert.match(workflow,/refs\/heads\/main/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/if-no-files-found: warn/);
 assert.match(runner,/runSupabaseMfaLiveValidation\(\)/);
 assert.match(runner,/initialAal1Observed/);
 assert.match(runner,/fixtureCleanupVerified/);
 assert.match(runner,/gate: 'NOT_ACCEPTED'/);
 assert.match(runner,/control: 'NOT_VERIFIED'/);
 assert.match(runner,/evidenceClass: 'PROVIDER_ONLY_NOT_APP_RLS_STORAGE_HTTP'/);
 assert.doesNotMatch(runner,/auth\.admin\.createUser/);
 assert.match(upstream,/export async function runSupabaseMfaLiveValidation/);
 assert.match(upstream,/initial_aal1_not_observed/);
 assert.match(upstream,/initialAal1Observed: true/);
 assert.match(upstream,/qa_only_mfa_auth_write_boundary_not_satisfied/);
 assert.match(tests,/verifiedCount: 11/);
 assert.match(tests,/rejects Production, wrong project/);
 assert.ok(!readFileSync('.github/workflows/enterprise-evidence-tests.yml','utf8').includes('npm run security:step-up:runtime'));
});
