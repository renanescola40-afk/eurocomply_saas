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
 'src/server/billing/stripe-entitlement-runtime-reconcile.test.ts',
 'src/server/billing/stripe-entitlement-runtime.test.ts',
 'src/server/billing/stripe-entitlement-runtime.ts',
 'src/server/billing/stripe-webhook-recovery.ts',
 'tests/enterprise/stripe-entitlement-stored-event-recovery.test.ts',
 'tests/enterprise/stripe-invoice-paid-recovery-contract.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/bil03-paid-entitlement-carry.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
];

test('BIL-03 paid entitlement source carry restricts every changed path and immutable accepted evidence',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-bil03-paid-entitlement-carry-'));
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
  for(const file of PATCH)put(file,'BIL-03 paid entitlement source: '+file+'\n');
  const head=commit('BIL-03 billing security candidate');
  const options={root,checkpoint:base,expectedSha:head};
  assert.equal(validator.bil03PaidGuardCarryIntegrity(index,options),true);
  assert.equal(validator.bil03PaidGuardCarryIntegrity(index,{...options,expectedSha:base}),false);
  assert.equal(validator.bil03PaidGuardCarryIntegrity({...index,extra:true},options),false);
  git('reset','--hard',base);
  for(const file of PATCH.slice(0,-1))put(file,'incomplete patch\n');
  const missing=commit('missing required test or workflow');
  assert.equal(validator.bil03PaidGuardCarryIntegrity(index,{...options,expectedSha:missing}),false);
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
    assert.equal(validator.bil03PaidGuardCarryIntegrity(index,{...options,expectedSha:altered}),false,file);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('BIL-03 paid entitlement native exact-head security review must be substantive, valid and not withdrawn',()=>{
 const sha='a'.repeat(40),pull={number:2780,sha,mergedAt:null};
 const reviewLabel='BIL-03 LIVE PAID ENTERPRISE ENTITLEMENT SOURCE CARRY SECURITY REVIEW: APPROVED';
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
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2780#pullrequestreview-101'};
 const accepts=(rows,p=pull)=>Boolean(validator.bil03PaidGuardCarryApprovedReview(rows,p));
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
  'BIL03_PAID_GUARD_CARRY_PR=2780',
  "BIL03_PAID_GUARD_REVIEWER='renanescola40-afk'",
  "BIL03_PAID_GUARD_CARRY_BASE='1f070a38ddc40c08388cab699ab909997fa92c57'",
  "BIL03_PAID_GUARD_ORIGIN_BASE='26f171972543c4366a775fe55e970c14e0ef920e'",
  'BIL03_PAID_GUARD_CARRY_RUN=45024564260',
  'BIL03_PAID_GUARD_CARRY_ARTIFACT=14755102859',
  "BIL03_PAID_GUARD_CARRY_DIGEST='00b7771a05d68ee5444538b614bb175895e62367f7116c64fc32af57d2d91ff0'",
  'verifyQat01AfterProviderSettles({sha:pull.sha,token,request})',
  'bil03PaidGuardCarryApprovedReview(reviews,pull)',
  'checks.total_count!==checks.check_runs.length',
  'artifact?.expired','bil03PaidGuardCarry:true',
  "const bil03PaidGuardCarry=Boolean(cumulative&&cumulativeReview?.bil03PaidGuardCarry===true",
  'return verifyBil03PaidGuardCarry(index,{expectedSha,prNumber,token,request,root})',
 ])assert.ok(s.includes(str),str);
 for(const check of [
  'Run security gates, typecheck and tests','Core CI, build and npm audit',
  'CI / quality','Validate P0 runtime evidence register',
 ])assert.ok(s.includes("'"+check+"'"),check);
});

test('PR 2780 source carry admits only the pre-existing four gates with a hypothetical approved review',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2780')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha||'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.bil03PaidGuardCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 const hypothetical={bil03PaidGuardCarry:true,approvalUrl:
  'https://github.com/renanescola40-afk/eurocomply_saas/pull/2780#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
 assert.equal(result.gates.find(g=>g.gate_id==='A-12')?.accepted,false);
});





test('BIL-03 automatic LIVE paid seats are fail-closed for unpaid/trialing/TEST source events',()=>{
 const runtime=readFileSync('src/server/billing/stripe-entitlement-runtime.ts','utf8');
 const recovery=readFileSync('src/server/billing/stripe-webhook-recovery.ts','utf8');
 const unit=readFileSync('src/server/billing/stripe-entitlement-runtime.test.ts','utf8');
 const reconciliation=readFileSync('src/server/billing/stripe-entitlement-runtime-reconcile.test.ts','utf8');
 const invoice=readFileSync('tests/enterprise/stripe-invoice-paid-recovery-contract.test.ts','utf8');
 const stored=readFileSync('tests/enterprise/stripe-entitlement-stored-event-recovery.test.ts','utf8');
 assert.match(runtime,/!event\.livemode/);
 assert.match(runtime,/object\.status !== 'active'/);
 assert.match(runtime,/Number\.isSafeInteger\(object\.amount_paid\)/);
 assert.match(runtime,/object\.amount_paid > 0/);
 assert.match(runtime,/paid && !positiveInvoicePayment/);
 assert.match(runtime,/billing_not_eligible/);
 assert.match(recovery,/entitlement\.outcome === 'billing_not_eligible'/);
 assert.match(unit,/denies Enterprise seat grants from zero-amount invoice\.paid trial events/);
 assert.match(unit,/denies trialing subscriptions/);
 assert.match(unit,/denies TEST events/);
 assert.match(reconciliation,/denies TEST-mode reconciliation before calling the atomic entitlement RPC/);
 assert.match(invoice,/stripe_livemode: true/);
 assert.match(invoice,/amount_paid: amountPaid/);
 assert.match(invoice,/denies all TEST and zero-paid invoice\.paid events/);
 assert.match(stored,/expect\(canonical\)\.toEqual\(\{ outcome: 'billing_not_eligible' \}\)/);
 assert.match(stored,/stripe_livemode\)\.toBe\(false\)/);
});
