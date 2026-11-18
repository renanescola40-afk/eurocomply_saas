import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import * as validator from '../../scripts/enterprise-evidence/validate-evidence.mjs';

const INDEX='docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
const PROOFS=[
 'docs/enterprise/gate-closure-v33/A18_A09_COMBINED_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v34/A15_QAT01_FORMAL_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v35/A19_OPS02_ACCEPTANCE_PROOF.json',
];
const PATCH=[
 'docs/sales/ASSISTED_COMMERCIAL_LAUNCH_2026-11-20.md',
 'docs/sales/README.md',
 'src/app/[locale]/book-demo/page.tsx',
 'src/app/[locale]/pricing/page.tsx',
 'src/components/marketing/book-demo-form.tsx',
 'src/lib/analytics/commercial-cta.ts',
 'src/lib/i18n/pricing-commercial-truth.ts',
 'tests/e2e/fria-lifecycle-runtime-acceptance.spec.ts',
 'tests/marketing/commercial-acquisition-contract.test.ts',
 'tests/marketing/commercial-cta-tracking.test.ts',
 'tests/marketing/manual-demo-scheduling-contract.test.ts',
 'tests/product/public-commercial-ui-v2-consistency.test.ts',
 'tests/product/public-pricing-catalog-contract.test.ts',
 'tests/product/public-pricing-commercial-truth.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/assisted-pricing-carry.test.mjs',
 'tests/enterprise-evidence/validate-evidence.test.mjs',
];

test('assisted commercial carry allows only its reviewed source and immutable historical proofs',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-assist-carry-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const write=(p,data)=>{const target=join(root,p);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,data)};
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 try{
  git('init','-q');git('config','user.email','fixture@example.invalid');git('config','user.name','CI fixture');
  const refs=new Set(PROOFS);
  for(const g of index.gates||[])if(g.accepted===true)refs.add(g.acceptance_evidence_ref);
  for(const r of index.evidence_records||[])if(r.status==='PASS')refs.add(r.artifact_path);
  write(INDEX,JSON.stringify(index));
  for(const p of refs)write(p,readFileSync(p));
  git('add','.');git('commit','-qm','accepted historical baseline');
  const checkpoint=git('rev-parse','HEAD');
  for(const p of PATCH)write(p,'modified '+p+'\n');
  git('add','.');git('commit','-qm','approved source footprint');
  const expectedSha=git('rev-parse','HEAD');
  const options={root,checkpoint,expectedSha};
  assert.equal(validator.assistedCarryIntegrity(index,options),true);
  assert.equal(validator.assistedCarryIntegrity(index,{...options,expectedSha:checkpoint}),false);
  assert.equal(validator.assistedCarryIntegrity(index,{...options,expectedSha:'a'.repeat(40)}),false);
  assert.equal(validator.assistedCarryIntegrity({...index,source:{...index.source,commit_sha:'a'.repeat(40)}},options),false);
  write('src/lib/security/unexpected.ts','bad');
  git('add','.');git('commit','-qm','unexpected security file');
  assert.equal(validator.assistedCarryIntegrity(index,{...options,expectedSha:git('rev-parse','HEAD')}),false);
  git('reset','--hard',expectedSha);
  write(PROOFS[0],'{}');
  git('add','.');git('commit','-qm','tampered proof');
  assert.equal(validator.assistedCarryIntegrity(index,{...options,expectedSha:git('rev-parse','HEAD')}),false);
  git('reset','--hard',expectedSha);
  write(INDEX,JSON.stringify({...index,source:{...index.source,commit_sha:'a'.repeat(40)}}));
  git('add','.');git('commit','-qm','tampered ledger');
  assert.equal(validator.assistedCarryIntegrity(index,{...options,expectedSha:git('rev-parse','HEAD')}),false);
 }finally{rmSync(root,{recursive:true,force:true})}
});
test('review contract refuses empty, wrong SHA, wrong reviewer and unauthenticated decisions',()=>{
 const source=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 assert.match(source,/ASSISTED_CARRY_PR=2748/);
 assert.match(source,/ASSISTED_CARRY_BASE='b5934f46393efad92c3542f9fb48b511160ae6d4'/);
 assert.match(source,/r\.user\?\.login===QUALIFIED_REVIEWER&&r\.commit_id===pull\.sha/);
 assert.match(source,/includesReviewLine\(r\.body,ASSISTED_CARRY_REVIEW\)/);
 assert.match(source,/CUMULATIVE_LINES\.every\(line=>includesReviewLine\(r\.body,line\)\)/);
 assert.match(source,/!decisionWithdrawn\(reviews,r,pull,rejection\)/);
 assert.match(source,/verifyQat01AfterProviderSettles\(\{sha:pull\.sha,token,request\}\)/);
 assert.match(source,/artifact\?\.digest!=='sha256:'\+SEC01_ALERT_CARRY_DIGEST/);
 assert.match(source,/verifyAssistedCarry\(index,\{expectedSha,prNumber,token,request,root\}\)/);
});


test('real PR #2748 source carry reconciliation retains exactly four previously accepted gates (simulation only)',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2748')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha??'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(INDEX,'utf8'));
 assert.equal(validator.assistedCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 // Synthetic local reconciliation only; does not generate a provider approval.
 const hypothetical={
  assistedCarry:true,
  approvalUrl:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2748#pullrequestreview-999999',
  acceptedAt:new Date().toISOString(),
 };
 const result=validator.reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 for(const id of ['A-09','A-15','A-18','A-19']){
  assert.equal(result.gates.find(g=>g.gate_id===id)?.accepted,true,id);
 }
 assert.equal(result.gates.find(g=>g.gate_id==='A-01')?.accepted,false);
});
