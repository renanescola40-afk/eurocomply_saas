import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {tenantMfaCarryIntegrity,tenantMfaCarryApprovedReview,reconcile}
 from '../../scripts/enterprise-evidence/validate-evidence.mjs';

const INDEX='docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
const PROOFS=[
 'docs/enterprise/gate-closure-v33/A18_A09_COMBINED_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v34/A15_QAT01_FORMAL_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v35/A19_OPS02_ACCEPTANCE_PROOF.json',
];
const PATCH=[
 '.github/workflows/product-fria-ephemeral-qa.yml',
 'scripts/database/prove-enterprise-evidence-tenant-isolation.mjs',
 'scripts/product/create-fria-ephemeral-fixtures.mjs',
 'src/server/security/tenant-mfa.test.ts',
 'src/server/security/tenant-mfa.ts',
 'supabase/migrations/20261119103000_tenant_mfa_missing_policy_fail_closed.sql',
 'supabase/migrations/20261119115000_initialize_new_tenant_mfa_policy.sql',
 'tests/security/atomic-organization-creation.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/tenant-mfa-source-carry.test.mjs',
 'tests/enterprise-evidence/validate-evidence.test.mjs',
];

test('source admission refuses missing path, tampered proofs, unknown source or changed ledger',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-mfa-carry-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const put=(p,bytes)=>{const dest=join(root,p);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes);};
 const commit=msg=>{git('add','.');git('commit','-qm',msg);return git('rev-parse','HEAD');};
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 try{
  git('init','-q');git('config','user.email','fixture@example.invalid');git('config','user.name','CI');
  const files=new Set(PROOFS);
  for(const g of index.gates||[])if(g.accepted===true)files.add(g.acceptance_evidence_ref);
  for(const r of index.evidence_records||[])if(r.status==='PASS')files.add(r.artifact_path);
  put(INDEX,JSON.stringify(index));
  for(const file of files)put(file,readFileSync(file));
  const checkpoint=commit('immutable four-gate main');
  for(const file of PATCH)put(file,'source '+file+'\\n');
  const head=commit('MFA reviewed source');
  const opts={root,checkpoint,expectedSha:head};
  assert.equal(tenantMfaCarryIntegrity(index,opts),true);
  assert.equal(tenantMfaCarryIntegrity(index,{...opts,expectedSha:checkpoint}),false);
  assert.equal(tenantMfaCarryIntegrity({...index,extra:true},opts),false);
  git('reset','--hard',checkpoint);
  for(const file of PATCH.slice(0,-1))put(file,'source no final contract');
  const missing=commit('missing exact contract');
  assert.equal(tenantMfaCarryIntegrity(index,{...opts,expectedSha:missing}),false);
  for(const [file,payload] of [
    ['src/app/api/billing/webhook/route.ts','unreviewed billing'],
    ['.github/workflows/enterprise-evidence-tests.yml','disabled verifier'],
    [INDEX,'{}'],
    [PROOFS[0],'forged A09 A18 evidence'],
    ['supabase/migrations/20261119120000_bypass_rls.sql','unreviewed SQL'],
  ]){
    git('reset','--hard',head);
    put(file,payload);
    const other=commit('attempt unauthorized change');
    assert.equal(tenantMfaCarryIntegrity(index,{...opts,expectedSha:other}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('native approved source carry requires explicit independently reviewed current HEAD',()=>{
 const sha='a'.repeat(40),pull={number:2750,sha,mergedAt:null};
 const body=[
  'A-09/BIL-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15/QAT-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-18/OPS-01 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-19/OPS-02 FORMAL GATE ACCEPTANCE: APPROVED',
  'A-15 CUMULATIVE ACCEPTANCE SECURITY REVIEW: APPROVED',
  'TENANT MFA FAIL-CLOSED FOUR-GATE CARRY SECURITY REVIEW: APPROVED',
 ].join('\\n');
 const yes={id:135,state:'APPROVED',user:{login:'renansilva2002-tech'},
  commit_id:sha,body,submitted_at:'2026-11-19T14:30:40Z',
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2750#pullrequestreview-135'};
 const pass=(rows,p=pull)=>Boolean(tenantMfaCarryApprovedReview(rows,p));
 assert.equal(pass([yes]),true);
 assert.equal(pass([yes],{...pull,number:2740}),false);
 assert.equal(pass([{...yes,body:''}]),false);
 assert.equal(pass([{...yes,body:body.replace('TENANT MFA FAIL-CLOSED FOUR-GATE CARRY SECURITY REVIEW: APPROVED','')}]),false);
 assert.equal(pass([{...yes,commit_id:'b'.repeat(40)}]),false);
 assert.equal(pass([{...yes,user:{login:'renanescola40-afk'}}]),false);
 assert.equal(pass([{...yes,html_url:'https://example.invalid/approval'}]),false);
 assert.equal(pass([{...yes,submitted_at:'unknown'}]),false);
 assert.equal(pass([{...yes,body:body+'\\nA-15/QAT-01 NOT APPROVED'}]),false);
 assert.equal(pass([yes,{...yes,id:136,state:'DISMISSED',submitted_at:'2026-11-19T15:00:00Z'}]),false);
 assert.equal(pass([yes,{...yes,id:137,state:'CHANGES_REQUESTED',submitted_at:'2026-11-19T15:00:00Z'}]),false);
});

test('source carry binds to the real approved base and five named exact-SHA CI jobs',()=>{
 const src=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 for(const expected of [
  'MFA_CARRY_PR=2750',"MFA_CARRY_BASE='b5934f46393efad92c3542f9fb48b511160ae6d4'",
  'MFA_CARRY_RUN=44046962034','MFA_CARRY_ARTIFACT=14311557590',
  "MFA_CARRY_DIGEST='3bc8b7b75ffd38661c6cedacd990331796eb13f4e2c0fc6d66a8cdb205fbdf8b'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'tenantMfaCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired',
  'tenantMfaCarry:true',
 ])assert.ok(src.includes(expected),expected);
 for(const job of [
  'Run security gates, typecheck and tests','Exact-SHA disposable Supabase schema',
  'Exact-SHA disposable tenant isolation',
  'Disposable final customer journey + FRIA lifecycle','Core CI, build and npm audit',
 ])assert.ok(src.includes("'"+job+"'"),job);
});

test('exact PR #2750 hypothetical acceptance preserves 4/24, never A-01 (simulation)',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2750')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(tenantMfaCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 // This tests reconciliation ONLY and is never a provider review/approval.
 const synthetic={tenantMfaCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2750#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const report=reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:synthetic});
 assert.deepEqual(report.errors,[]);
 assert.equal(report.summary.gates_accepted,4);
 assert.equal(report.summary.controls_pass,4);
 assert.equal(report.gates.find(x=>x.gate_id==='A-01')?.accepted,false);
});
