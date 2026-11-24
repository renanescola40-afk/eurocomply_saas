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
 'scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs',
 'scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs',
 'tests/security/sec01-browser-bad-password-contract.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-browser-positive-login-carry.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('SEC-01 QA MFA Actions workflow carry is scoped and preserves immutable accepted evidence',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-sec01-browser-positive-login-carry-'));
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
  assert.equal(validator.sec01BrowserLoginCarryIntegrity(index,options),true);
  assert.equal(validator.sec01BrowserLoginCarryIntegrity(index,{...options,expectedSha:base}),false);
  assert.equal(validator.sec01BrowserLoginCarryIntegrity({...index,extra:true},options),false);
  git('reset','--hard',base);
  for(const file of PATCH.slice(0,-1))put(file,'incomplete patch\n');
  const missing=commit('missing required test or workflow');
  assert.equal(validator.sec01BrowserLoginCarryIntegrity(index,{...options,expectedSha:missing}),false);
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
    assert.equal(validator.sec01BrowserLoginCarryIntegrity(index,{...options,expectedSha:altered}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('SEC-01 QA MFA Actions native exact-head security review must be substantive, valid and not withdrawn',()=>{
 const sha='a'.repeat(40),pull={number:2784,sha,mergedAt:null};
 const reviewLabel='SEC-01 QA SIGNED BROWSER LOGIN FOUR-GATE SOURCE CARRY SECURITY REVIEW: APPROVED';
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
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2784#pullrequestreview-101'};
 const accepts=(rows,p=pull)=>Boolean(validator.sec01BrowserLoginCarryApprovedReview(rows,p));
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
  'SEC01_BROWSER_LOGIN_CARRY_PR=2784',
  "SEC01_BROWSER_LOGIN_REVIEWER='renanescola40-afk'",
  "SEC01_BROWSER_LOGIN_CARRY_BASE='bb75c6e415e2bcab8965705dbf65bf3cde51e785'",
  "SEC01_BROWSER_LOGIN_ORIGIN_BASE='26f171972543c4366a775fe55e970c14e0ef920e'",
  'SEC01_BROWSER_LOGIN_CARRY_RUN=45024564260',
  'SEC01_BROWSER_LOGIN_CARRY_ARTIFACT=14755102859',
  "SEC01_BROWSER_LOGIN_CARRY_DIGEST='00b7771a05d68ee5444538b614bb175895e62367f7116c64fc32af57d2d91ff0'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'sec01BrowserLoginCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','sec01BrowserLoginCarry:true',
  "const sec01BrowserLoginCarry=Boolean(cumulative&&cumulativeReview?.sec01BrowserLoginCarry===true",
  'return verifySec01BrowserLoginCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests','Core CI, build and npm audit',
  'CI / quality','Validate P0 runtime evidence register',
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2784 source carry admits only the pre-existing four gates with a hypothetical approved review',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2784')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.sec01BrowserLoginCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={sec01BrowserLoginCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2784#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-12')?.accepted,false);
});







test('signed positive browser login preserves real QA provider proof and all downstream authorization denials',()=>{
 const runner=readFileSync('scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs','utf8');
 const verifier=readFileSync('scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs','utf8');
 const testContract=readFileSync('tests/security/sec01-browser-bad-password-contract.test.ts','utf8');
 const start=runner.indexOf("  stage = 'real_browser_password_login';");
 const end=runner.indexOf("  stage = 'authenticated_private_profile_available';",start);
 assert.ok(start>0&&end>start);
 const positive=runner.slice(start,end);
 const expectedStages=[
  'authenticated_private_profile_available','authenticated_api_identity_distinguished',
  'signed_in_session_recovery_form_denied','capture_session_cookies_in_memory_only',
  'real_browser_logout','after_logout_api_denied','after_logout_private_profile_denied',
  'revoked_cookie_replay_api_denied','revoked_cookie_replay_private_profile_denied',
  'recovery_without_session_denied_in_browser'
 ];
 for(const stage of expectedStages)assert.ok(runner.includes("stage = '"+stage+"';"),stage);
 assert.ok(positive.includes("page.goto('/en/login?next=%2Fen%2Fmfa%3Fsetup%3D1'"));
 assert.ok(positive.includes("page.waitForResponse("));
 assert.ok(positive.includes("validResponse.status() === 200"));
 assert.ok(positive.includes("window.location.pathname === '/en/mfa'"));
 assert.ok(positive.includes("new URLSearchParams(window.location.search).get('setup') === '1'"));
 assert.ok(positive.includes("check(stage, loginSessionCookies.length > 0)"));
 assert.ok(positive.includes("button instanceof HTMLButtonElement && !button.disabled"));
 assert.doesNotMatch(positive,/validResponse\.json\(\)|page\.route\(/);
 assert.ok(positive.indexOf("validResponse.status() === 200") <
   positive.indexOf("check(stage, loginSessionCookies.length > 0)"));
 assert.ok(runner.includes("isApiAuthResult(authApi, 403, 'organization_required')"));
 assert.ok(runner.includes("outcome = 'PARTIAL_APP_PASS'"));
 assert.ok(runner.includes("qa_cleanup_verified: cleaned"));
 assert.ok(runner.includes("gate: 'NOT_ACCEPTED'"));
 assert.ok(runner.includes("control: 'NOT_VERIFIED'"));
 for(const suffix of [
  'form_not_ready','identity_route_unavailable','request_failed',
  'provider_response_missing','request_not_sent','provider_denied',
  'navigation_failed','session_cookie_missing'
 ]){
  const value="valid_password_"+suffix;
  assert.ok(positive.includes("'"+value+"'"),value);
  assert.ok(verifier.includes("'"+value+"'"),value);
  assert.ok(testContract.includes(suffix),suffix);
 }
});
