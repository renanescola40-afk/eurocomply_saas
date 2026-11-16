import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {sec01SourceCarryIntegrity,sec01QaBrowserCarryIntegrity,reconcile,verifyQat01AfterProviderSettles} from '../../scripts/enterprise-evidence/validate-evidence.mjs';

const indexPath='docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
const proofs=[
 'docs/enterprise/gate-closure-v33/A18_A09_COMBINED_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v34/A15_QAT01_FORMAL_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v35/A19_OPS02_ACCEPTANCE_PROOF.json',
];
const sourcePaths=[
 'src/app/[locale]/reset-password/page.tsx',
 'src/integrations/supabase/client.ts',
 'src/lib/auth/recovery-session-proof.ts',
 'playwright.config.ts',
 'tests/e2e/payment-first-runtime-global-setup.ts',
 'tests/security/account-recovery-route-contract.test.ts',
 'tests/security/payment-first-qa-origin-guard.test.mjs',
 'tests/security/playwright-synthetic-write-qa-gate.test.mjs',
 'tests/security/sec01-password-recovery-session-proof.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-source-carry.test.mjs',
];

test('SEC-01 carry accepts only the exact, immutable four-gate baseline plus its intended source patch',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-sec01-carry-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const put=(p,bytes)=>{const where=join(root,p);mkdirSync(dirname(where),{recursive:true});writeFileSync(where,bytes);};
 const commit=msg=>{git('add','.');git('commit','-qm',msg);return git('rev-parse','HEAD');};
 try{
  git('init','-q');
  git('config','user.email','synthetic@example.invalid');
  git('config','user.name','Synthetic CI');
  const index={
   cumulative_acceptance:{schema:'risck-comply.a15-cumulative-acceptance.v1'},
   gates:['A-09','A-15','A-18','A-19'].map(gate_id=>({gate_id,accepted:true})),
   evidence_records:[],
  };
  put(indexPath,JSON.stringify(index));
  for(const p of proofs)put(p,'signed immutable fixture: '+p);
  const checkpoint=commit('immutable four-gate checkpoint');
  for(const p of sourcePaths)put(p,'synthetic reviewed source: '+p);
  const candidate=commit('security source change');
  const opts={checkpoint,root};
  assert.equal(sec01SourceCarryIntegrity(index,{...opts,expectedSha:candidate}),true);
  assert.equal(sec01SourceCarryIntegrity(index,{...opts,expectedSha:checkpoint}),false);
  assert.equal(sec01SourceCarryIntegrity({...index,gates:[]},{...opts,expectedSha:candidate}),false);

  put('src/server/billing/stripe-webhook.ts','unreviewed billing mutation');
  const billing=commit('try to bypass billing freeze');
  assert.equal(sec01SourceCarryIntegrity(index,{...opts,expectedSha:billing}),false);

  git('reset','--hard',candidate);
  put('.github/workflows/full-security-suite.yml','disable required checks');
  const workflow=commit('try to weaken branch protection');
  assert.equal(sec01SourceCarryIntegrity(index,{...opts,expectedSha:workflow}),false);

  git('reset','--hard',candidate);
  put(proofs[2],'forged OPS-02 evidence');
  const proof=commit('try to substitute provider proof');
  assert.equal(sec01SourceCarryIntegrity(index,{...opts,expectedSha:proof}),false);

  git('reset','--hard',candidate);
  put(indexPath,JSON.stringify({...index,extraClaim:'unreviewed'}));
  const ledger=commit('try to rewrite accepted gate ledger');
  assert.equal(sec01SourceCarryIntegrity(index,{...opts,expectedSha:ledger}),false);

  git('reset','--hard',candidate);
  put('docs/enterprise/phase1-v22/DAT01_48_CASE_TECHNICAL_DECISION_PACKET_20261114.json','unauthorized DAT-01 closure');
  const dat=commit('try to change blocked DAT-01');
  assert.equal(sec01SourceCarryIntegrity(index,{...opts,expectedSha:dat}),false);

  assert.equal(readFileSync(join(root,indexPath),'utf8'),JSON.stringify(index));
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('A-01 QA browser carry accepts only four reviewed files from immutable four-gate main',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-sec01-qa-browser-carry-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const put=(p,content)=>{const where=join(root,p);mkdirSync(dirname(where),{recursive:true});writeFileSync(where,content);};
 const commit=message=>{git('add','.');git('commit','-qm',message);return git('rev-parse','HEAD');};
 const allowed=[
  'scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs',
  'scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs',
  'scripts/enterprise-evidence/validate-evidence.mjs',
  'tests/enterprise-evidence/sec01-source-carry.test.mjs',
 ];
 try{
  git('init','-q');
  git('config','user.email','synthetic@example.invalid');
  git('config','user.name','Synthetic QA');
  const index={
   cumulative_acceptance:{schema:'risck-comply.a15-cumulative-acceptance.v1'},
   gates:['A-09','A-15','A-18','A-19'].map(gate_id=>({
    gate_id,accepted:true,
    acceptance_evidence_ref:gate_id==='A-15'?proofs[1]:
     gate_id==='A-19'?proofs[2]:proofs[0],
   })),
   evidence_records:[{status:'PASS',artifact_path:proofs[1]}],
  };
  put(indexPath,JSON.stringify(index));
  for(const path of proofs)put(path,'immutable acceptance proof '+path);
  const checkpoint=commit('frozen main with four formally accepted gates');
  const options={checkpoint,root};
  assert.equal(sec01QaBrowserCarryIntegrity(index,{...options,expectedSha:checkpoint}),false);
  for(const path of allowed)put(path,'reviewed QA browser harness '+path);
  const candidate=commit('exactly four approved-path source changes');
  assert.equal(sec01QaBrowserCarryIntegrity(index,{...options,expectedSha:candidate}),true);
  assert.equal(sec01QaBrowserCarryIntegrity({...index,gates:[]},{...options,expectedSha:candidate}),false);
  git('reset','--hard',checkpoint);
  for(const path of allowed.slice(0,-1))put(path,'missing contract test '+path);
  const missingTest=commit('omit required regression test');
  assert.equal(sec01QaBrowserCarryIntegrity(index,{...options,expectedSha:missingTest}),false);
  git('reset','--hard',candidate);
  put('src/app/api/stripe/webhook/route.ts','unreviewed commercial source');
  const forbidden=commit('unexpected billing source');
  assert.equal(sec01QaBrowserCarryIntegrity(index,{...options,expectedSha:forbidden}),false);
  git('reset','--hard',candidate);
  put('.github/workflows/enterprise-evidence-tests.yml','disable required CI');
  const workflow=commit('unexpected CI workflow');
  assert.equal(sec01QaBrowserCarryIntegrity(index,{...options,expectedSha:workflow}),false);
  git('reset','--hard',candidate);
  put(proofs[0],'modified accepted billing proof');
  const proofMutation=commit('try to replace signed gate proof');
  assert.equal(sec01QaBrowserCarryIntegrity(index,{...options,expectedSha:proofMutation}),false);
  git('reset','--hard',candidate);
  put(indexPath,JSON.stringify({...index,manualAcceptance:true}));
  const forgedLedger=commit('try to modify frozen acceptance index');
  assert.equal(sec01QaBrowserCarryIntegrity(index,{...options,expectedSha:forgedLedger}),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('QA browser carry requires exact PR, authentic accepted checkpoint, QAT-01 and substantive independent review',()=>{
 const source=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 assert.match(source,/SEC01_QA_BROWSER_CARRY_PR=2739/);
 assert.match(source,/SEC01_QA_BROWSER_CARRY_BASE='c29b0821969ecac5e7a4da9e00451e79cb91c728'/);
 assert.match(source,/SEC01_QA_BROWSER_CARRY_RUN=43755316565/);
 assert.match(source,/SEC01_QA_BROWSER_CARRY_ARTIFACT=14177794329/);
 assert.match(source,/SEC01_QA_BROWSER_CARRY_DIGEST='eee2c457a42f006bf895ad7090dc36f287ed511fc2750a4f8d5e8ce153a57b23'/);
 assert.match(source,/verifyQat01AfterProviderSettles\(\{sha:pull\.sha,token,request\}\)/);
 assert.match(source,/CUMULATIVE_LINES\.every\(line=>includesReviewLine\(review\.body,line\)\)/);
 assert.match(source,/includesReviewLine\(review\.body,SEC01_QA_BROWSER_CARRY_REVIEW\)/);
 assert.match(source,/review\.commit_id===pull\.sha/);
 assert.match(source,/sec01QaBrowserCarryIntegrity\(index,\{expectedSha,root\}\)/);
});

test('A-01 QA browser exact-head dry-run preserves 4/24 without fabricating a native review',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2739')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha??'',/^[a-f0-9]{40}$/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
 const index=JSON.parse(readFileSync(indexPath,'utf8'));
 assert.equal(sec01QaBrowserCarryIntegrity(index,{expectedSha:sha}),true);
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 // Hypothetical result ONLY: the real verifier still requires a new native
 // reviewer APPROVED body against this final SHA, authenticated CI and checkpoint.
 const hypothetical={qaBrowserCarry:true,
  approvalUrl:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2739#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const result=reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.valid,true);
 assert.equal(result.summary.gates_accepted,4);
 assert.equal(result.summary.controls_pass,4);
 assert.equal(result.controls.find(c=>c.control_id==='SEC-01')?.status,'NOT_VERIFIED');
});

test('source carry demands exact-head qualified gate review, GitHub CI, FRIA and original checkpoint',()=>{
 const src=readFileSync('scripts/enterprise-evidence/validate-evidence.mjs','utf8');
 assert.match(src,/SEC01_CARRY_PR=2738/);
 assert.match(src,/SEC01_CARRY_BASE='0f106b0fc56a36af1349919b95c96d72a9d7186a'/);
 assert.match(src,/headCi\.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'/);
 assert.match(src,/SEC01_CARRY_RUNTIME_CHECK/);
 assert.match(src,/CUMULATIVE_LINES\.every\(line=>includesReviewLine\(review\.body,line\)\)/);
 assert.match(src,/includesReviewLine\(review\.body,SEC01_CARRY_REVIEW\)/);
 assert.match(src,/review\.commit_id===pull\.sha/);
 assert.match(src,/decisionWithdrawn\(reviews,review,pull,rejection\)/);
 assert.match(src,/checkpointArtifact\?\.digest!=='sha256:'\+SEC01_CARRY_DIGEST/);
 assert.match(src,/sec01SourceCarryIntegrity\(index,\{expectedSha,root\}\)/);
});

test('real PR #2738 source diff is restricted to reviewed files and unchanged accepted proofs',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2738')return;
 const assessed=process.env.EVIDENCE_EXACT_SHA;
 assert.match(assessed??'',/^[a-f0-9]{40}$/);
 const actual=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 assert.equal(actual,assessed,'must check exact PR HEAD, never a merge or stale baseline');
 const index=JSON.parse(readFileSync(indexPath,'utf8'));
 assert.equal(sec01SourceCarryIntegrity(index,{expectedSha:actual}),true);
});

test('reconciliation can retain 4/24 after a separately authenticated current-head decision (simulation only)',()=>{
 if(process.env.EVIDENCE_PR_NUMBER!=='2738')return;
 const sha=process.env.EVIDENCE_EXACT_SHA;
 assert.match(sha??'',/^[a-f0-9]{40}$/);
 const index=JSON.parse(readFileSync(indexPath,'utf8'));
 const scope=JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
 const gates=JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
 // No provider approval is generated here. This is only a deterministic dry-run
 // for the eventual separately authenticated native GitHub formal review.
 const hypothetical={sec01SourceCarry:true,
  approvalUrl:'https://github.com/renanescola40-afk/eurocomply_saas/pull/2738#pullrequestreview-999999',
  acceptedAt:new Date().toISOString()};
 const r=reconcile({scope,gates,index,expectedSha:sha,cumulativeReview:hypothetical});
 assert.deepEqual(r.errors,[]);
 assert.equal(r.valid,true);
 assert.equal(r.summary.controls_pass,4);
 assert.equal(r.summary.gates_accepted,4);
 for(const id of ['A-09','A-15','A-18','A-19']){
  assert.equal(r.gates.find(g=>g.gate_id===id)?.accepted,true,id);
 }
});

const validHead='19c1ad6d5d5c845f4484febddd868c292bc1dafa';
const token='synthetic-token-with-no-provider-access';
const unverified=errors=>({decision:'NOT_VERIFIED',errors});
const verified={decision:'SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE',errors:[],checks:[
 {name:'Synthetic exact SHA check',id:123,job_url:'https://github.com/example/repo/actions/runs/1/job/123'},
],circleci:{context:'ci/circleci: pr-source-autopilot',state:'success'}};

test('bounded source CI retry re-reads authenticated exact-SHA checks after GitHub re-run race',async()=>{
 let calls=0,waits=0;
 const result=await verifyQat01AfterProviderSettles({
  sha:validHead,token,attempts:5,intervalMs:1,
  verify:async({sha,token:actualToken})=>{
   assert.equal(sha,validHead);
   assert.equal(actualToken,token);
   return ++calls<3
    ?unverified(['missing_authenticated_check:Core CI, build and npm audit',
      'latest_required_check_not_success:CodeQL']):verified;
  },
  sleep:async ms=>{assert.equal(ms,1);waits++;},
 });
 assert.equal(calls,3);
 assert.equal(waits,2);
 assert.equal(result.decision,verified.decision);
});

test('bounded provider retries can never mint a PASS for checks that remain absent',async()=>{
 let calls=0,waits=0;
 const result=await verifyQat01AfterProviderSettles({
  sha:validHead,token,attempts:3,intervalMs:1,
  verify:async()=>{calls++;return unverified(['missing_authenticated_check:Semgrep SAST']);},
  sleep:async()=>{waits++;},
 });
 assert.equal(calls,3);
 assert.equal(waits,2);
 assert.equal(result.decision,'NOT_VERIFIED');
});

test('provider errors and invalid proofs fail immediately, without repeated calls',async()=>{
 for(const errors of [
  ['provider_readback_incomplete'],
  ['invalid_check_page'],
  ['missing_authenticated_check:CodeQL','provider_readback_unavailable'],
  ['latest_required_check_not_success:CodeQL','invalid_status_shape'],
  [],
 ]) {
  let calls=0;
  const result=await verifyQat01AfterProviderSettles({
   sha:validHead,token,attempts:10,intervalMs:0,
   verify:async()=>{calls++;return unverified(errors);},
   sleep:async()=>{throw Error('should not retry untrusted provider response');},
  });
  assert.equal(result.decision,'NOT_VERIFIED');
  assert.equal(calls,1);
 }
});

test('source CI retry never accepts invalid SHA, missing token or excessive retry budget',async()=>{
 for(const params of [
  {sha:'not-a-sha',token},
  {sha:validHead,token:''},
  {sha:validHead,token,attempts:32},
  {sha:validHead,token,intervalMs:5001},
 ]) {
  const out=await verifyQat01AfterProviderSettles({
   ...params,verify:async()=>{throw Error('invalid preflight triggered read');}
  });
  assert.equal(out.decision,'NOT_VERIFIED');
  assert.deepEqual(out.errors,['invalid_settled_source_ci_request']);
 }
});
