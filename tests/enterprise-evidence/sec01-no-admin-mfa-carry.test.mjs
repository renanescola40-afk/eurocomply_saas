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
 'src/app/[locale]/mfa/page.tsx',
 'src/components/security/tenant-mfa-enrollment.tsx',
 'tests/security/sec01-login-return-destinations.test.ts',
 'tests/enterprise-evidence/sec01-no-admin-mfa-carry.test.mjs',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('SEC-01 MFA source carry is restricted to exact paths and immutable accepted evidence',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-sec01-no-admin-mfa-carry-'));
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
  assert.equal(validator.sec01NoAdminMfaCarryIntegrity(index,options),true);
  assert.equal(validator.sec01NoAdminMfaCarryIntegrity(index,{...options,expectedSha:base}),false);
  assert.equal(validator.sec01NoAdminMfaCarryIntegrity({...index,extra:true},options),false);
  git('reset','--hard',base);
  for(const file of PATCH.slice(0,-1))put(file,'incomplete patch\n');
  const missing=commit('missing required test or workflow');
  assert.equal(validator.sec01NoAdminMfaCarryIntegrity(index,{...options,expectedSha:missing}),false);
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
    assert.equal(validator.sec01NoAdminMfaCarryIntegrity(index,{...options,expectedSha:altered}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('SEC-01 native exact-head security review must be substantive, valid and not withdrawn',()=>{
 const sha='a'.repeat(40),pull={number:2773,sha,mergedAt:null};
 const reviewLabel='SEC-01 NO-ADMIN ACCOUNT TOTP ENROLLMENT FOUR-GATE SOURCE CARRY SECURITY REVIEW: APPROVED';
 const body=[
  'A-09/BIL-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15/QAT-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-18/OPS-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-19/OPS-02 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15 CUMULATIVE ACCEPTANCE SECURITY REVIEW: APPROVED',
  reviewLabel,
 ].join('\n');
 const good={id:101,state:'APPROVED',user:{login:'renansilva2002-tech'},commit_id:sha,
  body,submitted_at:'2026-11-22T12:00:00Z',
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2773#pullrequestreview-101'};
 const accepts=(rows,p=pull)=>Boolean(validator.sec01NoAdminMfaCarryApprovedReview(rows,p));
 assert.equal(accepts([good]),true);
 assert.equal(accepts([good],{...pull,number:2771}),false);
 assert.equal(accepts([{...good,body:''}]),false);
 assert.equal(accepts([{...good,body:body.replace(reviewLabel,'')}]),false);
 assert.equal(accepts([{...good,commit_id:'b'.repeat(40)}]),false);
 assert.equal(accepts([{...good,user:{login:'renanescola40-afk'}}]),false);
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
  'SEC01_NOADMIN_MFA_CARRY_PR=2773',
  "SEC01_NOADMIN_MFA_CARRY_BASE='b0cab2458f7fedd747e4411663893abe738f189b'",
  "SEC01_NOADMIN_MFA_ORIGIN_BASE='26f171972543c4366a775fe55e970c14e0ef920e'",
  'SEC01_NOADMIN_MFA_CARRY_RUN=45024564260',
  'SEC01_NOADMIN_MFA_CARRY_ARTIFACT=14755102859',
  "SEC01_NOADMIN_MFA_CARRY_DIGEST='00b7771a05d68ee5444538b614bb175895e62367f7116c64fc32af57d2d91ff0'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'sec01NoAdminMfaCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','sec01NoAdminMfaCarry:true',
  "const sec01NoAdminMfaCarry=Boolean(cumulative&&cumulativeReview?.sec01NoAdminMfaCarry===true",
  'return verifySec01NoAdminMfaCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests','Core CI, build and npm audit',
  'CI / quality','Validate P0 runtime evidence register',
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2773 source carry admits only the pre-existing four gates with a hypothetical approved review',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2773')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.sec01NoAdminMfaCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={sec01NoAdminMfaCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2773#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-12')?.accepted,false);
});

test('SEC-01 account TOTP-only fallback requires authenticated identity and does not grant tenant access',()=>{
 const page=readFileSync('src/app/[locale]/mfa/page.tsx','utf8');
 const client=readFileSync('src/components/security/tenant-mfa-enrollment.tsx','utf8');
 const auth=page.indexOf('const user = await getCurrentUser()');
 const key=page.indexOf('const hasPrivilegedTenantPolicyReader = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())');
 const lookup=page.indexOf('const organization = await getCurrentOrganizationForUser(user.id)');
 assert.ok(auth>=0&&key>auth&&lookup>key,'authenticated user precedes any privileged tenant lookup');
 assert.match(page,/if \(hasPrivilegedTenantPolicyReader\)/);
 assert.match(page,/accountSetupOnly=\{setupRequested \|\| !hasPrivilegedTenantPolicyReader\}/);
 assert.match(page,/getTenantMfaSessionState\(organization\.id\)/);
 assert.match(client,/getAuthenticatorAssuranceLevel\(\)/);
 assert.match(client,/currentLevel !== 'aal2'/);
 assert.ok(!client.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!client.includes('createAdminClient'));
});
