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
 '.github/workflows/step-up-qa-runtime-proof.yml',
 'scripts/security/run-qa-mfa-provider-proof.mjs',
 'scripts/security/run-step-up-mfa-runtime-validation.mjs',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-qa-provider-runner-carry.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('QA-only MFA provider runner source carry is restricted to exact paths and immutable accepted evidence',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-sec01-qa-provider-runner-carry-'));
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
  for(const file of PATCH)put(file,'reviewable static recovery source: '+file+'\n');
  const head=commit('static recovery candidate');
  const options={root,checkpoint:base,expectedSha:head};
  assert.equal(validator.sec01QaRunnerCarryIntegrity(index,options),true);
  assert.equal(validator.sec01QaRunnerCarryIntegrity(index,{...options,expectedSha:base}),false);
  assert.equal(validator.sec01QaRunnerCarryIntegrity({...index,extra:true},options),false);
  git('reset','--hard',base);
  for(const file of PATCH.slice(0,-1))put(file,'incomplete patch\n');
  const missing=commit('missing required test or workflow');
  assert.equal(validator.sec01QaRunnerCarryIntegrity(index,{...options,expectedSha:missing}),false);
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
    assert.equal(validator.sec01QaRunnerCarryIntegrity(index,{...options,expectedSha:altered}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('QA-only MFA provider runner native exact-head security review must be substantive, valid and not withdrawn',()=>{
 const sha='a'.repeat(40),pull={number:2778,sha,mergedAt:null};
 const reviewLabel='SEC-01 PROTECTED QA-ONLY MFA PROVIDER RUNNER FOUR-GATE SOURCE CARRY SECURITY REVIEW: APPROVED';
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
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2778#pullrequestreview-101'};
 const accepts=(rows,p=pull)=>Boolean(validator.sec01QaRunnerCarryApprovedReview(rows,p));
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
  'SEC01_QA_RUNNER_CARRY_PR=2778',
  "SEC01_QA_RUNNER_REVIEWER='renanescola40-afk'",
  "SEC01_QA_RUNNER_CARRY_BASE='257199e1f7d9c3666e0192dc9e7eec7eb1bb698f'",
  "SEC01_QA_RUNNER_ORIGIN_BASE='26f171972543c4366a775fe55e970c14e0ef920e'",
  'SEC01_QA_RUNNER_CARRY_RUN=45024564260',
  'SEC01_QA_RUNNER_CARRY_ARTIFACT=14755102859',
  "SEC01_QA_RUNNER_CARRY_DIGEST='00b7771a05d68ee5444538b614bb175895e62367f7116c64fc32af57d2d91ff0'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'sec01QaRunnerCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','sec01QaRunnerCarry:true',
  "const sec01QaRunnerCarry=Boolean(cumulative&&cumulativeReview?.sec01QaRunnerCarry===true",
  'return verifySec01QaRunnerCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests','Core CI, build and npm audit',
  'CI / quality','Validate P0 runtime evidence register',
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2778 source carry admits only the pre-existing four gates with a hypothetical approved review',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2778')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.sec01QaRunnerCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={sec01QaRunnerCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2778#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-12')?.accepted,false);
});



test('QA MFA provider job is manual, protected, exact-main and QA-scoped before access to secrets',()=>{
 const workflow=readFileSync('.github/workflows/step-up-qa-runtime-proof.yml','utf8');
 const runner=readFileSync('scripts/security/run-qa-mfa-provider-proof.mjs','utf8');
 const runtime=readFileSync('scripts/security/run-step-up-mfa-runtime-validation.mjs','utf8');
 const governance=readFileSync('scripts/security/check-github-environment-governance.mjs','utf8');
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/inputs\.release_sha/);
 assert.match(workflow,/environment: QA-Supabase/);
 assert.ok(!workflow.includes('environment: Production'));
 assert.match(workflow,/needs: qa-environment-governance/);
 assert.match(workflow,/Verify protected QA environment before secrets/);
 assert.match(workflow,/check-github-environment-governance\.mjs/);
 assert.match(workflow,/QA_SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.QA_SUPABASE_SERVICE_ROLE_KEY \}\}/);
 assert.match(workflow,/NEXT_PUBLIC_SUPABASE_URL: https:\/\/zrxrrfbllsxtleyxjpsz\.supabase\.co/);
 assert.match(workflow,/STEP_UP_QA_EXECUTE: QA_ONLY_MFA_RUNTIME_PROOF/);
 assert.match(workflow,/test "\$\(git rev-parse HEAD\)" = "\$TARGET_SHA"/);
 assert.match(workflow,/admin\.auth\.admin\.listUsers/);
 assert.match(runner,/GITHUB_REF_NAME !== 'main'/);
 assert.match(runner,/checkedOutSha !== expectedSha/);
 assert.match(runner,/applicationBrowserProof: false/);
 assert.match(runner,/enterpriseProductionAcceptance: false/);
 assert.match(runner,/result\.status !== 'Complete'/);
 assert.match(runtime,/export async function runSupabaseMfaLiveValidation/);
 assert.match(runtime,/qa_only_mfa_auth_write_boundary_not_satisfied/);
 assert.match(governance,/environment\.can_admins_bypass !== false/);
 assert.match(governance,/environment\.deployment_branch_policy/);
});
