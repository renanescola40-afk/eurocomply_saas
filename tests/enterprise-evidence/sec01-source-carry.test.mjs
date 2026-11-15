import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {sec01SourceCarryIntegrity} from '../../scripts/enterprise-evidence/validate-evidence.mjs';

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
 assert.match(src,/checkpointArtifact\.digest!=='sha256:'\+SEC01_CARRY_DIGEST/);
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
