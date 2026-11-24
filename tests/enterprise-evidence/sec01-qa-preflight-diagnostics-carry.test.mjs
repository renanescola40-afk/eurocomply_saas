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
 '.github/workflows/sec01-isolated-qa-mfa-provider.yml',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-qa-preflight-diagnostics-carry.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('SEC-01 QA MFA Actions workflow carry is scoped and preserves immutable accepted evidence',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-sec01-qa-preflight-carry-'));
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
  assert.equal(validator.sec01QaPreflightCarryIntegrity(index,options),true);
  assert.equal(validator.sec01QaPreflightCarryIntegrity(index,{...options,expectedSha:base}),false);
  assert.equal(validator.sec01QaPreflightCarryIntegrity({...index,extra:true},options),false);
  git('reset','--hard',base);
  for(const file of PATCH.slice(0,-1))put(file,'incomplete patch\n');
  const missing=commit('missing required test or workflow');
  assert.equal(validator.sec01QaPreflightCarryIntegrity(index,{...options,expectedSha:missing}),false);
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
    assert.equal(validator.sec01QaPreflightCarryIntegrity(index,{...options,expectedSha:altered}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('SEC-01 QA MFA Actions native exact-head security review must be substantive, valid and not withdrawn',()=>{
 const sha='a'.repeat(40),pull={number:2782,sha,mergedAt:null};
 const reviewLabel='SEC-01 QA MFA PREFLIGHT DIAGNOSTICS FOUR-GATE SOURCE CARRY SECURITY REVIEW: APPROVED';
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
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2782#pullrequestreview-101'};
 const accepts=(rows,p=pull)=>Boolean(validator.sec01QaPreflightCarryApprovedReview(rows,p));
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
  'SEC01_QA_PREFLIGHT_CARRY_PR=2782',
  "SEC01_QA_PREFLIGHT_REVIEWER='renanescola40-afk'",
  "SEC01_QA_PREFLIGHT_CARRY_BASE='643de6c84c70598ee55123c052932cb13fe3ad0a'",
  "SEC01_QA_PREFLIGHT_ORIGIN_BASE='26f171972543c4366a775fe55e970c14e0ef920e'",
  'SEC01_QA_PREFLIGHT_CARRY_RUN=45024564260',
  'SEC01_QA_PREFLIGHT_CARRY_ARTIFACT=14755102859',
  "SEC01_QA_PREFLIGHT_CARRY_DIGEST='00b7771a05d68ee5444538b614bb175895e62367f7116c64fc32af57d2d91ff0'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'sec01QaPreflightCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','sec01QaPreflightCarry:true',
  "const sec01QaPreflightCarry=Boolean(cumulative&&cumulativeReview?.sec01QaPreflightCarry===true",
  'return verifySec01QaPreflightCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests','Core CI, build and npm audit',
  'CI / quality','Validate P0 runtime evidence register',
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2782 source carry admits only the pre-existing four gates with a hypothetical approved review',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2782')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.sec01QaPreflightCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={sec01QaPreflightCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2782#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-12')?.accepted,false);
});





test('preflight diagnostics emit only fixed QA failure IDs, preserve all 12 guards and do not print secrets',()=>{
 const workflow=readFileSync('.github/workflows/sec01-isolated-qa-mfa-provider.yml','utf8');
 const expected=[
  'exact_source_sha_mismatch','qa_supabase_origin_mismatch','qa_publishable_key_missing',
  'qa_secret_key_missing','qa_keys_identical','qa_project_ref_mismatch',
  'qa_execution_intent_mismatch','qa_mail_sink_not_confirmed',
  'resend_credentials_present','smtp_host_present',
  'production_vercel_context_forbidden','live_stripe_key_forbidden'
 ];
 const ids=[...workflow.matchAll(/fail_preflight '([a-z_]+)'/g)].map(x=>x[1]);
 assert.deepEqual(ids,expected);
 assert.match(workflow,/set -euo pipefail/);
 assert.match(workflow,/printf '::error title=QA MFA preflight::%s\\n' "\$1"/);
 assert.match(workflow,/environment: QA-Supabase/);
 assert.match(workflow,/needs: qa-environment-governance/);
 assert.match(workflow,/check-github-environment-governance\.mjs/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+(?:push|pull_request|workflow_run|schedule):/m);
 assert.doesNotMatch(workflow,/environment:\s*Production/);
 assert.match(workflow,/case "\$\{STRIPE_SECRET_KEY:-\}" in sk_live_\*\)/);
 assert.match(workflow,/test "\$E2E_QA_MAIL_SINK_CONFIRMED" = "true"/);
 assert.match(workflow,/test "\$NEXT_PUBLIC_SUPABASE_URL" = "https:\/\/zrxrrfbllsxtleyxjpsz\.supabase\.co"/);
 assert.match(workflow,/test -z "\$\{RESEND_API_KEY:-\}"/);
 assert.match(workflow,/test -z "\$\{SMTP_HOST:-\}"/);
});
