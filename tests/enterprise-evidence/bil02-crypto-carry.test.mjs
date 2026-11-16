import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join } from 'node:path';
import { bil02CryptoCarryIntegrity,reconcile } from '../../scripts/enterprise-evidence/validate-evidence.mjs';

const indexPath='docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
const frozen=[
 'docs/enterprise/gate-closure-v33/A18_A09_COMBINED_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v34/A15_QAT01_FORMAL_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v35/A19_OPS02_ACCEPTANCE_PROOF.json',
];
const allowed=[
 'src/app/api/stripe/webhook/route.test.ts',
 'tests/billing/qa-stripe-test-ledger-crypto.test.mjs',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/bil02-crypto-carry.test.mjs',
];
const gateIds=['A-09','A-15','A-18','A-19'];
function fixture() {
 const root=mkdtempSync(join(tmpdir(),'risck-bil02-hmac-carry-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const put=(file,data)=>{
  const dest=join(root,file);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data);
 };
 const commit=msg=>{git('add','.');git('commit','-qm',msg);return git('rev-parse','HEAD');};
 git('init','-q');git('config','user.name','synthetic CI');git('config','user.email','synthetic@example.invalid');
 const index={
  cumulative_acceptance:{schema:'risck-comply.a15-cumulative-acceptance.v1'},
  gates:gateIds.map(id=>({
   gate_id:id,accepted:id!=='A-19',
   acceptance_evidence_ref:id==='A-15'?frozen[1]:id==='A-19'?frozen[2]:frozen[0],
  })),
  evidence_records:[{status:'PASS',artifact_path:frozen[1]}],
 };
 put(indexPath,JSON.stringify(index));
 for(const file of frozen)put(file,'immutable evidence fixture '+file);
 const checkpoint=commit('already accepted four-gate main evidence fixture');
 return {root,git,put,commit,index,checkpoint,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}

test('BIL-02 crypto carry admits only four exact test/validator paths, with immutable gate evidence',()=>{
 const f=fixture();
 try{
  const opts={root:f.root,checkpoint:f.checkpoint};
  assert.equal(bil02CryptoCarryIntegrity(f.index,{...opts,expectedSha:f.checkpoint}),false);
  for(const file of allowed)f.put(file,'scoped BIL-02 test change '+file);
  const valid=f.commit('source-only HMAC regression');
  assert.equal(bil02CryptoCarryIntegrity(f.index,{...opts,expectedSha:valid}),true);
  assert.equal(bil02CryptoCarryIntegrity({...f.index,gates:[]},{...opts,expectedSha:valid}),false);
  const noApproval={...f.index,gates:f.index.gates.map(g=>g.gate_id==='A-15'?{...g,accepted:false}:g)};
  assert.equal(bil02CryptoCarryIntegrity(noApproval,{...opts,expectedSha:valid}),false);

  f.git('reset','--hard',f.checkpoint);
  for(const file of allowed.slice(0,-1))f.put(file,'missing control regression '+file);
  assert.equal(bil02CryptoCarryIntegrity(f.index,{...opts,expectedSha:f.commit('omit required test')}),false);

  for(const [extra,content] of [
   ['src/server/billing/stripe-webhooks.ts','unauthorized production billing mutation'],
   ['.github/workflows/full-security-suite.yml','unapproved required check removal'],
   ['scripts/qa/qa-bil02-restricted-event-writer-rollback.sql','unreviewed privileged role'],
   [frozen[2],'forged A-19 evidence'],
   [indexPath,'{"forged_gate":"A-10"}'],
  ]){
   f.git('reset','--hard',valid);
   f.put(extra,content);
   const altered=f.commit('reject out-of-scope source or proof');
   assert.equal(bil02CryptoCarryIntegrity(f.index,{...opts,expectedSha:altered}),false,extra);
  }
 } finally {f.cleanup();}
});

test('BIL-02 carry requires real provider-backed checkpoint, exact-PR identity, source CI and six-line native review',()=>{
 const s=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 for(const [key,value] of [
  ['BIL02_CRYPTO_CARRY_PR','2745'],
  ['BIL02_CRYPTO_CARRY_BASE','af109b20839c62ca0bf9cd24ac99dc33a41b98f5'],
  ['BIL02_CRYPTO_CARRY_RUN','43975605464'],
  ['BIL02_CRYPTO_CARRY_ARTIFACT','14280608301'],
  ['BIL02_CRYPTO_CARRY_DIGEST','656734f674f91bf120e37a7e8b18cd3aca5ee48542336249e3666b3e518d4e23'],
 ])assert.ok(s.includes(key+'='+(/^[0-9]+$/.test(value)?value:"'"+value+"'")),key);
 for(const guard of [
  'bil02CryptoCarryIntegrity(index,{expectedSha,root})',
  "artifact?.digest!=='sha256:'+BIL02_CRYPTO_CARRY_DIGEST",
  "ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'",
  'review.commit_id===pull.sha',
  'CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))',
  'includesReviewLine(review.body,BIL02_CRYPTO_CARRY_REVIEW)',
  'decisionWithdrawn(reviews,review,pull,rejection)',
 ])assert.ok(s.includes(guard),'missing independent admission guard: '+guard);
});

test('exact current PR #2745 carries 4/24 only as a synthetic dry-run; BIL-02 remains NOT_VERIFIED',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2745')return;
 const current=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 assert.equal(current,process.env.EVIDENCE_EXACT_SHA);
 const index=JSON.parse(readFileSync(indexPath,'utf8'));
 assert.equal(bil02CryptoCarryIntegrity(index,{expectedSha:current}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 // This does NOT create or substitute for a real qualified native GitHub review.
 const pretend={
  bil02CryptoCarry:true,
  approvalUrl:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2745#pullrequestreview-999999',
  acceptedAt:new Date().toISOString(),
 };
 const outcome=reconcile({scope,gates,index,expectedSha:current,cumulativeReview:pretend});
 assert.equal(outcome.valid,true,JSON.stringify(outcome.errors));
 assert.deepEqual(outcome.errors,[]);
 assert.equal(outcome.summary.gates_accepted,4);
 assert.equal(outcome.summary.controls_pass,4);
 assert.equal(outcome.controls.find(row=>row.control_id==='BIL-02')?.status,'NOT_VERIFIED');
 assert.equal(outcome.gates.find(row=>row.gate_id==='A-10')?.accepted,false);
});
