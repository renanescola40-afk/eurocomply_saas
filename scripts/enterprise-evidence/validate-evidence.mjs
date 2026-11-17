#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyQat01NativeChecks } from './verify-qat01-native-checks.mjs';
import { evaluateG1Scope } from '../release/verify-g1-enterprise-scope.mjs';
const ROOT=process.cwd(), ALLOWED=new Set(['PASS','FAIL','BLOCKED','NOT_VERIFIED','NOT_APPLICABLE']), SHA40=/^[a-f0-9]{40}$/, SHA256=/^[a-f0-9]{64}$/;
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));

const REPOSITORY='renanescola40-afk/eurocomply_saas';
const QUALIFIED_REVIEWER='renansilva2002-tech';
const INDEX_PATH='docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
const A19_PROOF='docs/enterprise/gate-closure-v35/A19_OPS02_ACCEPTANCE_PROOF.json';
const A19_REJECTION=/(?:FORMAL GATE ACCEPTANCE|A-19\s*\/\s*OPS-02).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
const A19_ADMISSION_FILES=[
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/a19-acceptance.test.mjs',
 '.github/workflows/enterprise-evidence-tests.yml',
 '.github/workflows/full-security-suite.yml',
];
const COMBINED_PROOF='docs/enterprise/gate-closure-v33/A18_A09_COMBINED_ACCEPTANCE_PROOF.json';
const COMBINED_SCHEMA='risck-comply.g1.a09-a18-combined-acceptance-proof.v1';
const A09_READBACK='A-09/BIL-01 INDEPENDENT VERCEL PRODUCTION READBACK: 6/6 MATCH';
const A09_EVIDENCE_APPROVAL='A-09/BIL-01 INDEPENDENT EVIDENCE ACCEPTANCE: APPROVED';
const A09_REJECTION=/(?:FORMAL GATE ACCEPTANCE|A-09\s*\/\s*BIL-01).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
const CUMULATIVE_CHECKPOINT='2b91e5ef41b221dd849696a9887cf195c2253eac';
const CUMULATIVE_RUN=43607687300, CUMULATIVE_ARTIFACT=14118881399;
const CUMULATIVE_DIGEST='af156e08b35ac0ea8d75ca0c1e0ee318c9ceaa52afd82095ed0cce373e2d1587';
const A15_PROOF='docs/enterprise/gate-closure-v34/A15_QAT01_FORMAL_ACCEPTANCE_PROOF.json';
const CUMULATIVE_GATES=['A-09','A-15','A-18','A-19'];
const CUMULATIVE_LINES=['A-09/BIL-01','A-15/QAT-01','A-18/OPS-01','A-19/OPS-02']
 .map(label=>label+' FORMAL GATE ACCEPTANCE: APPROVED');
const CUMULATIVE_SECURITY='A-15 CUMULATIVE ACCEPTANCE SECURITY REVIEW: APPROVED';
const DOCS_CHECKPOINT='c4ca03e6a7cae835ccec37b3fed1f811de23d8b5';
const DOCS_RUN=43652738644,DOCS_ARTIFACT=14136199440;
const DOCS_DIGEST='ab9323c2489fbb82e976bce460562b60ec072675144595934ca46bd7065e25b3';
const DOCS_PACKET='docs/enterprise/phase1-v22/DAT01_48_CASE_TECHNICAL_DECISION_PACKET_20261114.json';
const DOCS_TEST='tests/enterprise-evidence/dat01-documentation-carry.test.mjs';
const DOCS_APPROVAL='DAT-01 PENDING DECISION PACKET SAFE PUBLICATION: APPROVED';

/**
 * Security-reviewed source-change admission for PR #2738 only. The legacy
 * cumulative path permits evidence-only finalizations, so it cannot accept a
 * genuine SEC-01 source correction. This does NOT relax the general rule:
 * only this named source/test patch, with a frozen 4/24 base, exact-head
 * QAT-01 + FRIA provider tests and an explicit qualified four-gate review.
 */
const SEC01_CARRY_PR=2738;
const SEC01_CARRY_BASE='0f106b0fc56a36af1349919b95c96d72a9d7186a';
const SEC01_CARRY_RUN=43703365051;
const SEC01_CARRY_ARTIFACT=14157014575;
const SEC01_CARRY_DIGEST='64338b9b38f3c2f39670bdd329ccb3fef9dd37735524458272fe57a5e25368b5';
const SEC01_CARRY_REVIEW='SEC-01 SOURCE CHANGE FOUR-GATE CARRY SECURITY REVIEW: APPROVED';
const SEC01_CARRY_ALLOWED=new Set([
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
 'tests/enterprise-evidence/validate-evidence.test.mjs',
]);
const SEC01_CARRY_RUNTIME_CHECK='Disposable final customer journey + FRIA lifecycle';

// Exact-PR QA browser regression follow-up to the four-gate-accepted #2738 merge.
// This is NOT a generic source-carry permission or a new SEC-01 formal PASS.
const SEC01_QA_BROWSER_CARRY_PR=2739;
const SEC01_QA_BROWSER_CARRY_BASE='c29b0821969ecac5e7a4da9e00451e79cb91c728';
const SEC01_QA_BROWSER_CARRY_RUN=43755316565;
const SEC01_QA_BROWSER_CARRY_ARTIFACT=14177794329;
const SEC01_QA_BROWSER_CARRY_DIGEST='eee2c457a42f006bf895ad7090dc36f287ed511fc2750a4f8d5e8ce153a57b23';
const SEC01_QA_BROWSER_CARRY_REVIEW='SEC-01 QA BROWSER HARNESS FOUR-GATE CARRY SECURITY REVIEW: APPROVED';
const SEC01_QA_BROWSER_CARRY_FILES=new Set([
 'scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs',
 'scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-source-carry.test.mjs',
]);




// Exact PR #2741: source carry only after independent review of the login
// regression and the authentic four-gate accepted main checkpoint.
const SEC01_LOGIN_CARRY_PR=2741;
const SEC01_LOGIN_CARRY_BASE='71fdf640b537eb70aa7cd142bfb59c348a2ddeef';
const SEC01_LOGIN_CARRY_RUN=43836076720;
const SEC01_LOGIN_CARRY_ARTIFACT=14210678190;
const SEC01_LOGIN_CARRY_DIGEST='2ee8f4581bf387ebf20df2993aae71cc1f7163d9c97fe02d8db68de33cfbe739';
const SEC01_LOGIN_CARRY_REVIEW='SEC-01 LOGIN SOURCE FOUR-GATE CARRY SECURITY REVIEW: APPROVED';
const SEC01_LOGIN_CARRY_FILES=new Set([
 'src/app/[locale]/login/page.tsx',
 'tests/security/sec01-browser-bad-password-contract.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-source-carry.test.mjs',
]);

/**
 * SEC-01 React-hydrated login QA fix, bound ONLY to PR #2742 and an
 * already verified 4/24 post-merge checkpoint. No gate is newly accepted.
 */
const SEC01_HYDRATION_CARRY_PR=2742;
const SEC01_HYDRATION_CARRY_BASE='5d35b63d3d9cf8f88c64734e66904633c3645afa';
const SEC01_HYDRATION_CARRY_RUN=43850618363;
const SEC01_HYDRATION_CARRY_ARTIFACT=14217287676;
const SEC01_HYDRATION_CARRY_DIGEST='bf0a932c3ab67089d7b056ab7f913d84401582271ce02dc4706e072fa1655bdc';
const SEC01_HYDRATION_CARRY_REVIEW='SEC-01 LOGIN HYDRATION QA FOUR-GATE CARRY SECURITY REVIEW: APPROVED';
const SEC01_HYDRATION_CARRY_FILES=new Set([
 'src/app/[locale]/login/page.tsx',
 'scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs',
 'scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs',
 'tests/security/sec01-browser-bad-password-contract.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-source-carry.test.mjs',
]);

/**
 * PR #2743: QA-only Playwright pointer-click/navigation separation.
 * Preserves the prior authenticated four-gate main checkpoint. No new PASS.
 */
const SEC01_CLICK_CARRY_PR=2743;
const SEC01_CLICK_CARRY_BASE='cafad3aae153da74982c7e3ac1b1ced1c456fedc';
const SEC01_CLICK_CARRY_RUN=43856302945;
const SEC01_CLICK_CARRY_ARTIFACT=14219939277;
const SEC01_CLICK_CARRY_DIGEST='226f51e75f92cda00f4efa8fcedb0757724ba101499f3740881d25264f6bf346';
const SEC01_CLICK_CARRY_REVIEW='SEC-01 PLAYWRIGHT POINTER QA FOUR-GATE CARRY SECURITY REVIEW: APPROVED';
const SEC01_CLICK_CARRY_FILES=new Set([
 'scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs',
 'scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs',
 'tests/security/sec01-browser-bad-password-contract.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-source-carry.test.mjs',
]);


/**
 * PR #2744: only the login/OAuth profile-return bug fix may extend the
 * existing four formally accepted gates. The checkpoint is an authenticated
 * GitHub Actions success with 4/24 gates and 4/38 controls, not a new PASS.
 * Code changes never inherit approval; require exact-head source CI and a
 * qualified, substantive independent four-gate security review.
 */
const SEC01_PROFILE_CARRY_PR=2744;
const SEC01_PROFILE_CARRY_BASE='88d8d2739e773a0924dcfd16afb148db42dc8991';
const SEC01_PROFILE_CARRY_RUN=43887299140;
const SEC01_PROFILE_CARRY_ARTIFACT=14235048073;
const SEC01_PROFILE_CARRY_DIGEST='c1a8a2d991ebfc7334c5ee0c55efcb5d6dd4e63c10496699da0c8b6b18840f8a';
const SEC01_PROFILE_CARRY_REVIEW='SEC-01 PROFILE RETURN FOUR-GATE CARRY SECURITY REVIEW: APPROVED';
const SEC01_PROFILE_CARRY_FILES=new Set([
 'src/app/[locale]/login/page.tsx',
 'src/app/auth/callback/route.ts',
 'src/lib/auth/login-return-destinations.ts',
 'tests/auth-onboarding-flow.test.ts',
 'tests/security/sec01-login-return-destinations.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-source-carry.test.mjs',
]);


/**
 * A-01 SEC-01 PR #2746: strictly scoped real-browser consent dialog QA fix.
 * This binds the unchanged four accepted main-gate proofs to the exact PR
 * source and an independent native review; it DOES NOT accept SEC-01.
 */
const SEC01_CONSENT_CARRY_PR=2746;
const SEC01_CONSENT_CARRY_BASE='af109b20839c62ca0bf9cd24ac99dc33a41b98f5';
const SEC01_CONSENT_CARRY_RUN=43975605464;
const SEC01_CONSENT_CARRY_ARTIFACT=14280608301;
const SEC01_CONSENT_CARRY_DIGEST='656734f674f91bf120e37a7e8b18cd3aca5ee48542336249e3666b3e518d4e23';
const SEC01_CONSENT_CARRY_REVIEW='SEC-01 CONSENT OVERLAY FOUR-GATE CARRY SECURITY REVIEW: APPROVED';
const SEC01_CONSENT_CARRY_FILES=new Set([
 'scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs',
 'scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs',
 'tests/security/sec01-browser-bad-password-contract.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-source-carry.test.mjs',
]);

/**
 * A-01 SEC-01 PR #2747: strictly scoped scoped QA negative-password UI alert verification.
 * This binds the unchanged four accepted main-gate proofs to the exact PR
 * source and an independent native review; it DOES NOT accept SEC-01.
 */
const SEC01_ALERT_CARRY_PR=2747;
const SEC01_ALERT_CARRY_BASE='0e49de5244efd631983d9d78654b20f22dcc6122';
const SEC01_ALERT_CARRY_RUN=43985069702;
const SEC01_ALERT_CARRY_ARTIFACT=14284442862;
const SEC01_ALERT_CARRY_DIGEST='096553d9c6c9798e50d0d38e45cf375159889d32e0577a2214c506b82d6b7c11';
const SEC01_ALERT_CARRY_REVIEW='SEC-01 QA INVALID PASSWORD ALERT FOUR-GATE CARRY SECURITY REVIEW: APPROVED';
const SEC01_ALERT_CARRY_FILES=new Set([
 'scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs',
 'scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs',
 'tests/security/sec01-browser-bad-password-contract.test.ts',
 'scripts/enterprise-evidence/validate-evidence.mjs',
 'tests/enterprise-evidence/sec01-source-carry.test.mjs',
]);

function gateProof(document,gate){
 if(gate.acceptance_evidence_ref!==COMBINED_PROOF) return document;
 if(document?.schema!==COMBINED_SCHEMA||Object.keys(document.gates??{}).length!==2||
    document.gates?.['A-09']?.gate_id!=='A-09'||document.gates?.['A-18']?.gate_id!=='A-18'||
    document.gates['A-09'].acceptance_source_sha!==gate.acceptance_sha||
    document.gates['A-18'].acceptance_source_sha!==gate.acceptance_sha) return null;
 return document.gates[gate.gate_id]??null;
}

function githubRead(request,token){
 return async resource=>{
  const response=await request('https://api.github.com/repos/'+REPOSITORY+resource,{
   redirect:'error',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
    'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(10000)
  });
  if(!response?.ok)throw Error('provider_readback_unavailable');
  return response.json();
 };
}

async function reviewedPull(readProvider,expectedSha,prNumber,reviewer){
 const prSpecified=prNumber!==null&&prNumber!==undefined&&String(prNumber).trim()!=='';
 const n=Number(prNumber);
 if(prSpecified&&(!Number.isSafeInteger(n)||n<1))return null;
 let pull,number;
 if(prSpecified){
  pull=await readProvider('/pulls/'+n);
  if(pull?.state!=='open'||pull.head?.sha!==expectedSha)return null;
  number=n;
 }else{
  // Require a single authenticated attribution of this exact main merge.
  const associated=await readProvider('/commits/'+expectedSha+'/pulls?per_page=100');
  if(!Array.isArray(associated)||associated.length!==1)return null;
  pull=associated[0];
  if(pull?.state!=='closed'||!pull.merged_at||pull.merge_commit_sha!==expectedSha||
     !Number.isSafeInteger(pull.number)||pull.number<1||!SHA40.test(pull.head?.sha||''))return null;
  number=pull.number;
 }
 if(pull?.draft===true||pull.head?.repo?.full_name!==REPOSITORY||
    pull.base?.repo?.full_name!==REPOSITORY||pull.base?.ref!=='main'||
    typeof pull.user?.login!=='string'||pull.user.login===reviewer)return null;
 return {number,sha:pull.head.sha,mergedAt:pull.merged_at};
}

function includesReviewLine(body,line){
 return typeof body==='string'&&body.split(/\r?\n/).some(part=>part.trim()===line);
}

function decisionWithdrawn(reviews,decision,pull,rejection){
 const decidedAt=Date.parse(decision.submitted_at);
 return reviews.some(review=>{
  if(!review||review===decision||review.user?.login!==decision.user.login||
     review.commit_id!==decision.commit_id||review.state==='PENDING')return false;
  if(!['CHANGES_REQUESTED','DISMISSED'].includes(review.state)&&
     !rejection.test(review.body||''))return false;
  const withdrawnAt=Date.parse(review.submitted_at);
  if(pull.mergedAt&&withdrawnAt>Date.parse(pull.mergedAt))return false;
  if(!Number.isFinite(withdrawnAt)||!Number.isFinite(decidedAt))return true;
  if(withdrawnAt!==decidedAt)return withdrawnAt>decidedAt;
  if(!Number.isSafeInteger(review.id)||!Number.isSafeInteger(decision.id))return true;
  return review.id>decision.id;
 });
}

// A dismissed review is the withdrawal of that review, not of an earlier,
// separate COMMENTED source observation. GitHub automatically dismisses an
// old APPROVED review on a new commit without dismissing its prior COMMENTED
// observation. Explicit later rejection and CHANGES_REQUESTED still revoke it.
export function sourceObservationWithdrawn(reviews,observation,pull,rejection){
 return decisionWithdrawn(reviews.filter(review=>review?.state!=='DISMISSED'),
  observation,pull,rejection);
}

function hasFormalReview(reviews,pull,reviewer,gateLabel,rejection,earliest){
 return Array.isArray(reviews)&&reviews.some(review=>
  review?.state==='APPROVED'&&review.user?.login===reviewer&&review.commit_id===pull.sha&&
  includesReviewLine(review.body,gateLabel+' FORMAL GATE ACCEPTANCE: APPROVED')&&
  !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
  (earliest===undefined||Date.parse(review.submitted_at)>=earliest)&&
  (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
}

/**
 * Provider-readback is intentionally separate from the hash-bound source proof.
 * A prior reviewed source alone is not authority to accept a later, editable PR.
 * The source proof uses #2610, while the NEW independent native approval is
 * discovered from GitHub on this PR's exact tested HEAD without editing JSON.
 * This avoids embedding an as-yet-uncreated current-HEAD review ID in that HEAD.
 * PR CI authenticates a review of the exact PR HEAD. Post-merge CI uses the
 * GitHub commit-to-PR association for its exact merge commit and authenticates
 * an approval on the merged source HEAD. A direct push or unrelated commit
 * must fail closed, and git source ancestry still requires evidence-only
 * changes since the frozen reviewed source.
 */
export async function verifyGitHubA18CurrentHead(gate,{expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT}={}){
 if(gate?.gate_id!=='A-18'||!SHA40.test(expectedSha||'')||
    typeof token!=='string'||!token.trim()||typeof request!=='function')return false;
 const url=/^https:\/\/github\.com\/renanescola40-afk\/eurocomply_saas\/pull\/(\d+)#pullrequestreview-(\d+)$/.exec(gate.approval_url||'');
 if(!url||gate.reviewer_id!==QUALIFIED_REVIEWER)return false;
 const oldPr=Number(url[1]),oldId=Number(url[2]);
 // Immutable historical A-18 review. Committed metadata cannot select an outbound GitHub API URL.
 if(oldPr!==2610||oldId!==5784789887)return false;
 const rootDir=path.resolve(root),proofPath=path.resolve(rootDir,gate.acceptance_evidence_ref||'');
 if(!proofPath.startsWith(rootDir+path.sep))return false;
 const readProvider=githubRead(request,token);
 try{
  const proof=gateProof(JSON.parse(fs.readFileSync(proofPath,'utf8')),gate);
  if(proof?.gate_id!=='A-18'||proof.qualified_review?.reviewer_login!==gate.reviewer_id||
     proof.qualified_review?.review_url!==gate.approval_url||
     proof.qualified_review?.reviewer_followup_comment_id!==6659265179)return false;
  const pull=await reviewedPull(readProvider,expectedSha,prNumber,gate.reviewer_id);
  if(!pull)return false;
  const [prior,followup,current]=await Promise.all([
   readProvider('/pulls/2610/reviews/5784789887'),
   readProvider('/issues/comments/6659265179'),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100')
  ]);
  if(prior?.id!==oldId||prior.state!=='APPROVED'||
     prior.user?.login!==gate.reviewer_id||
     prior.commit_id!==proof.qualified_review.reviewed_head_sha||
     followup?.user?.login!==gate.reviewer_id||
     !/A-18\s*\/\s*OPS-01/i.test(followup.body||''))return false;
  return hasFormalReview(current,pull,gate.reviewer_id,'A-18/OPS-01',
   /(?:FORMAL GATE ACCEPTANCE|A-18\s*\/\s*OPS-01).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i);
 }catch{return false;}
}

// The observation belongs to the same PR on its frozen source. The subsequent
// gate approval belongs to the final exact PR head and must predate the merge.
export async function verifyGitHubA09CurrentHead(gate,{expectedSha,prNumber,token,request=globalThis.fetch}={}){
 if(gate?.gate_id!=='A-09'||gate.reviewer_id!==QUALIFIED_REVIEWER||
    gate.acceptance_evidence_ref!==COMBINED_PROOF||!SHA40.test(gate.acceptance_sha||'')||
    !SHA40.test(expectedSha||'')||typeof token!=='string'||!token.trim()||
    typeof request!=='function')return false;
 const url=/^https:\/\/github\.com\/renanescola40-afk\/eurocomply_saas\/pull\/(\d+)#pullrequestreview-(\d+)$/.exec(gate.approval_url||'');
 if(!url||!Number.isSafeInteger(Number(url[2]))||Number(url[2])<1)return false;
 const readProvider=githubRead(request,token);
 try{
  const pull=await reviewedPull(readProvider,expectedSha,prNumber,gate.reviewer_id);
  if(!pull||pull.number!==Number(url[1])||pull.sha===gate.acceptance_sha)return false;
  const reviews=await readProvider('/pulls/'+pull.number+'/reviews?per_page=100');
  if(!Array.isArray(reviews))return false;
  const observation=reviews.find(review=>review?.id===Number(url[2])&&review.state==='COMMENTED'&&
   review.user?.login===gate.reviewer_id&&review.commit_id===gate.acceptance_sha&&
   includesReviewLine(review.body,A09_READBACK)&&
   includesReviewLine(review.body,A09_EVIDENCE_APPROVAL)&&!A09_REJECTION.test(review.body));
  const observedAt=Date.parse(observation?.submitted_at);
  if(!Number.isFinite(observedAt)||decisionWithdrawn(reviews,observation,pull,A09_REJECTION))return false;
  return hasFormalReview(reviews,pull,gate.reviewer_id,'A-09/BIL-01',A09_REJECTION,observedAt);
 }catch{return false;}
}

export async function verifyGitHubA15CurrentHead(gate,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 if(gate?.gate_id!=='A-15'||gate.reviewer_id!==QUALIFIED_REVIEWER||
    typeof token!=='string'||!token.trim()||
    !sourceCommitIsReviewedAncestor(gate,{expectedSha,root}))return false;
 const readProvider=githubRead(request,token);
 try{
  const pull=await reviewedPull(readProvider,expectedSha,prNumber,gate.reviewer_id);
  if(!pull)return false;
  const reviews=await readProvider('/pulls/'+pull.number+'/reviews?per_page=100');
  if(!hasFormalReview(reviews,pull,gate.reviewer_id,'A-15/QAT-01',
   /(?:FORMAL GATE ACCEPTANCE|A-15\s*\/\s*QAT-01).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i))return false;
  const result=await verifyQat01NativeChecks({sha:gate.acceptance_sha,token,request});
  return result.decision==='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE';
 }catch{return false;}
}

export function validateEvidenceRecord(r,{expectedSha,now=new Date()}={}){
 const e=[]; if(!r||typeof r!=='object'||Array.isArray(r))return ['record_must_be_object'];
 for(const k of ['evidence_id','control_id','gate_id','evidence_type','repository','branch','environment','source_system','test_command_or_provider_query','result_summary','artifact_path','reproducibility_instructions'])if(typeof r[k]!=='string'||!r[k].trim())e.push(k+'_required');
 if(!ALLOWED.has(r.status))e.push('status_invalid'); if(!SHA40.test(r.commit_sha||''))e.push('commit_sha_invalid'); if(expectedSha&&r.commit_sha!==expectedSha)e.push('commit_sha_mismatch'); if(r.repository!=='renanescola40-afk/eurocomply_saas')e.push('repository_mismatch'); if(!SHA256.test(r.artifact_sha256||''))e.push('artifact_sha256_invalid');
 const d=new Date(r.generated_at); if(!r.generated_at||Number.isNaN(d.getTime()))e.push('generated_at_invalid');else if(d>now)e.push('generated_at_in_future');
 if(r.workflow_run_id!==null&&r.workflow_run_id!==undefined&&!String(r.workflow_run_id).trim())e.push('workflow_run_id_invalid'); if(!Array.isArray(r.limitations))e.push('limitations_must_be_array');
 if(!['NOT_REVIEWED','IN_REVIEW','ACCEPTED','REJECTED'].includes(r.reviewer_status))e.push('reviewer_status_invalid');if(!['NOT_ACCEPTED','ACCEPTED','REJECTED'].includes(r.acceptance_status))e.push('acceptance_status_invalid');
 const artifactPath=path.resolve(ROOT,r.artifact_path||'');
 if(!artifactPath.startsWith(ROOT+path.sep))e.push('artifact_path_outside_repository');
 else {
  // Read a single immutable buffer instead of checking path metadata before reading it.
  try{
   const artifactBytes=fs.readFileSync(artifactPath);
   if(crypto.createHash('sha256').update(artifactBytes).digest('hex')!==r.artifact_sha256)e.push('artifact_sha256_mismatch');
  }catch{e.push('artifact_missing');}
 }
 if(/runtime|provider|live/i.test(r.evidence_type||'')&&!Number.isNaN(d.getTime())&&(d>now||now.getTime()-d.getTime()>90*24*60*60*1000))e.push('runtime_evidence_stale');
 if(r.status==='PASS'){
  const approvedAt=Date.parse(r.accepted_at||'');
  if(r.reviewer_status!=='ACCEPTED'||r.acceptance_status!=='ACCEPTED'||typeof r.accepted_by!=='string'||!r.accepted_by.trim()||!Number.isFinite(approvedAt)){
   e.push('pass_requires_independent_acceptance');
  }
  if(Number.isFinite(approvedAt)&&(approvedAt>now.getTime()||(!Number.isNaN(d.getTime())&&approvedAt<d.getTime()))){
   e.push('pass_acceptance_time_invalid');
  }
 }
 if(r.status==='NOT_APPLICABLE'&&(!r.applicability_rationale||r.applicability_rationale.length<20||r.reviewer_status!=='ACCEPTED'||r.acceptance_status!=='ACCEPTED'))e.push('not_applicable_requires_approved_rationale');
 return e;
}

export async function verifyGitHubA19CurrentHead(proof,{
 expectedSha,prNumber,token,request=globalThis.fetch,jointReleaseSource=null,root=ROOT,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(proof?.acceptance_source_sha||'')||
    !SHA256.test(proof?.artifact_sha256||'')||typeof token!=='string'||!token.trim())return null;
 const ids=['technical_comment_id','release_comment_id','workflow_run_id','artifact_id'];
 if(!ids.every(key=>Number.isSafeInteger(proof[key])&&proof[key]>0))return null;
 const source=proof.acceptance_source_sha;
 const readProvider=githubRead(request,token);
 const issueUrl='https://api.github.com/repos/'+REPOSITORY+'/issues/2616';
 try{
  const pull=await reviewedPull(readProvider,expectedSha,prNumber,QUALIFIED_REVIEWER);
  if(!pull)return null;
  if(jointReleaseSource){
   // Post-merge bytes must be exactly the bytes the qualified reviewer saw.
   if(!SHA40.test(jointReleaseSource)||pull.sha===jointReleaseSource||
      runGit(root,['merge-base','--is-ancestor',jointReleaseSource,pull.sha]).status!==0)return null;
   if(pull.mergedAt){
    const trees=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
    if(trees.status!==0)return null;
    const [reviewedTree,mergedTree]=trees.stdout.toString('utf8').trim().split('\n');
    if(!SHA40.test(reviewedTree)||reviewedTree!==mergedTree)return null;
   }
  }
  const [technical,release,run,reviews]=await Promise.all([
   readProvider('/issues/comments/'+proof.technical_comment_id),
   readProvider('/issues/comments/'+proof.release_comment_id),
   readProvider('/actions/runs/'+proof.workflow_run_id+'/artifacts?per_page=100'),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
  ]);
  if(technical?.id!==proof.technical_comment_id||technical.issue_url!==issueUrl||
     technical.user?.login!==QUALIFIED_REVIEWER||
     !includesReviewLine(technical.body,'**OPS-02 technical decision: VERIFIED**')||
     /subject to independent confirmation/i.test(technical.body)||
     ![source,String(proof.artifact_id),proof.artifact_sha256].every(value=>technical.body.includes(value))||
     release?.id!==proof.release_comment_id||release.issue_url!==issueUrl||
     release.user?.login!=='renanescola40-afk'||!includesReviewLine(release.body,'**Decision:** NO_GO')||
     !includesReviewLine(release.body,'**Reviewed source SHA:** `'+source+'`')||
     !run?.artifacts?.some(a=>a.id===proof.artifact_id&&a.workflow_run?.head_sha===source&&
       a.digest==='sha256:'+proof.artifact_sha256)||!Array.isArray(reviews))return null;
  const technicalAt=Date.parse(technical.updated_at);
  if(!Number.isFinite(technicalAt))return null;
  const approval=reviews.find(review=>review?.state==='APPROVED'&&review.user?.login===QUALIFIED_REVIEWER&&
   review.commit_id===pull.sha&&includesReviewLine(review.body,'A-19/OPS-02 FORMAL GATE ACCEPTANCE: APPROVED')&&
   !A19_REJECTION.test(review.body)&&!decisionWithdrawn(reviews,review,pull,A19_REJECTION)&&
   Date.parse(review.submitted_at)>=technicalAt&&(!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt))&&
   Number.isSafeInteger(review.id)&&review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+'#pullrequestreview-'+review.id);
  if(!approval)return pull.mergedAt?null:{state:'PENDING'};
  return {state:'APPROVED',approvalUrl:approval.html_url,acceptedAt:approval.submitted_at};
 }catch{return null;}
}


// Separate the immutable reviewed-source SHA from the CI checkout HEAD.
// Requiring the SHA of the commit containing its own acceptance JSON creates
// a cryptographic self-reference and can never produce a normal Git commit.
// Fail closed unless Git proves the reviewed source is an ancestor and every
// intervening change is strictly to this gate's acceptance JSON or the ledger.
// The workflow MUST still check out and test its exact current HEAD; no
// EVIDENCE_EXACT_SHA override, global bypass, or third-party state is trusted.
export function sourceCommitIsReviewedAncestor(gate,{expectedSha,root=ROOT}={}){
 const source=gate?.acceptance_sha;
 if(!SHA40.test(source||'')||!SHA40.test(expectedSha||''))return false;
 if(source===expectedSha)return true;
 const proof=gate.acceptance_evidence_ref;
 if(typeof proof!=='string'||!/^docs\/enterprise\/gate-closure-v[0-9]+\/[A-Za-z0-9_.-]+\.json$/.test(proof))return false;
 const ancestor=runGit(root,['merge-base','--is-ancestor',source,expectedSha]);
 if(ancestor.error||ancestor.status!==0)return false;
 const changed=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',source,expectedSha,'--']);
 if(changed.error||changed.status!==0||!Buffer.isBuffer(changed.stdout))return false;
 const names=changed.stdout.toString('utf8').split('\0').filter(Boolean);
 const allowed=new Set([INDEX_PATH,proof]);
 if(gate.gate_id==='A-19'&&proof===A19_PROOF)for(const name of A19_ADMISSION_FILES)allowed.add(name);
 return names.length>0&&names.every(name=>allowed.has(name));
}

function runGit(root,args){
 return spawnSync('git',args,{cwd:root,timeout:10000,maxBuffer:1024*1024,windowsHide:true});
}

function combinedClaimsMatch(indexGates,combined){
 return combined.length===2&&
  ['A-09','A-18'].every(id=>indexGates.filter(gate=>gate.gate_id===id).length===1&&
   combined.some(gate=>gate.gate_id===id&&gate.accepted===true))&&
  combined[0].acceptance_sha===combined[1].acceptance_sha&&
  combined[0].acceptance_evidence_sha256===combined[1].acceptance_evidence_sha256;
}

function frozenA19Claims(root,source){
 if(!SHA40.test(source||''))return null;
 const result=runGit(root,['show',source+':'+INDEX_PATH]);
 if(result.status!==0)return null;
 try{
  const {gates}=JSON.parse(result.stdout.toString('utf8'));
  return gates.filter(gate=>gate.gate_id==='A-19');
 }catch{return null;}
}

function committedDigest(root,sha,file){
 const result=runGit(root,['show',sha+':'+file]);
 return result.status===0?crypto.createHash('sha256').update(result.stdout).digest('hex'):null;
}

export function cumulativeAncestry({checkpoint=CUMULATIVE_CHECKPOINT,source,expectedSha,root=ROOT}={}){
 if(!SHA40.test(checkpoint||'')||!SHA40.test(source||'')||!SHA40.test(expectedSha||'')||
    source===expectedSha)return false;
 const parent=runGit(root,['rev-parse',source+'^']);
 if(parent.status!==0||parent.stdout.toString('utf8').trim()!==checkpoint||
    runGit(root,['merge-base','--is-ancestor',source,expectedSha]).status!==0)return false;
 const changes=(a,b)=>{
  const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',a,b,'--']);
  return diff.status===0?diff.stdout.toString('utf8').split('\0').filter(Boolean):null;
 };
 const engineering=changes(checkpoint,source),evidence=changes(source,expectedSha);
 const allowedEngineering=new Set([
  'scripts/enterprise-evidence/validate-evidence.mjs',
  'scripts/enterprise-evidence/verify-qat01-native-checks.mjs',
  'tests/enterprise-evidence/a19-acceptance.test.mjs',
 ]);
 const allowedEvidence=new Set([INDEX_PATH,A15_PROOF]);
 return Boolean(engineering?.length&&engineering.every(file=>allowedEngineering.has(file))&&
  evidence?.includes(INDEX_PATH)&&evidence.includes(A15_PROOF)&&
  evidence.every(file=>allowedEvidence.has(file)));
}

function committedJson(root,sha,file){
 const result=runGit(root,['show',sha+':'+file]);
 if(result.status!==0)return null;
 try{return JSON.parse(result.stdout.toString('utf8'));}catch{return null;}
}

function cumulativeIntegrity(index,{expectedSha,root=ROOT}={}){
 const claim=index.cumulative_acceptance;
 if(claim?.schema!=='risck-comply.a15-cumulative-acceptance.v1'||
    claim.checkpoint_sha!==CUMULATIVE_CHECKPOINT||
    !cumulativeAncestry({source:claim.source_sha,expectedSha,root}))return false;
 const previous=committedJson(root,CUMULATIVE_CHECKPOINT,INDEX_PATH);
 if(!previous||index.gates.length!==previous.gates.length||
    JSON.stringify({...previous,gates:previous.gates.filter(g=>g.gate_id!=='A-15'),
      evidence_records:previous.evidence_records.filter(r=>r.control_id!=='QAT-01')})!==
    JSON.stringify({...index,cumulative_acceptance:undefined,
      gates:index.gates.filter(g=>g.gate_id!=='A-15'),
      evidence_records:index.evidence_records.filter(r=>r.control_id!=='QAT-01')})||
    !['A-09','A-18','A-19'].every(id=>{
      const old=previous.gates.find(g=>g.gate_id===id),now=index.gates.find(g=>g.gate_id===id);
      return old&&(id==='A-19'||old.accepted===true)&&JSON.stringify(old)===JSON.stringify(now)&&
       committedDigest(root,expectedSha,old.acceptance_evidence_ref)===old.acceptance_evidence_sha256&&
       committedDigest(root,CUMULATIVE_CHECKPOINT,old.acceptance_evidence_ref)===old.acceptance_evidence_sha256;
    }))return false;
 if(index.gates.filter(g=>g.gate_id==='A-15').length!==1||
    index.evidence_records.filter(r=>r.control_id==='QAT-01'&&r.status==='PASS').length!==1)return false;
 const a15=index.gates.find(g=>g.gate_id==='A-15');
 const record=index.evidence_records.find(r=>r.control_id==='QAT-01'&&r.status==='PASS');
 const proof=committedJson(root,expectedSha,A15_PROOF);
 const digest=committedDigest(root,expectedSha,A15_PROOF);
 return Boolean(a15?.accepted===true&&a15.acceptance_sha===claim.source_sha&&
  a15.acceptance_evidence_ref===A15_PROOF&&a15.acceptance_evidence_sha256===digest&&
  record?.commit_sha===claim.source_sha&&record.artifact_path===A15_PROOF&&
  record.artifact_sha256===digest&&proof?.acceptance_source_sha===claim.source_sha&&
  proof.tested_source_sha===claim.source_sha&&proof.source_ci?.verified_source_sha===claim.source_sha&&
  proof.qualified_review?.source_ci_verification?.reviewed_head_sha===claim.source_sha);
}

async function officialCheckpoint(readProvider,request,token){
 const [run,artifacts]=await Promise.all([
  readProvider('/actions/runs/'+CUMULATIVE_RUN),
  readProvider('/actions/runs/'+CUMULATIVE_RUN+'/artifacts?per_page=100'),
 ]);
 const artifact=artifacts?.artifacts?.find(a=>a.id===CUMULATIVE_ARTIFACT);
 if(run?.head_sha!==CUMULATIVE_CHECKPOINT||run?.conclusion!=='success'||
    artifact?.workflow_run?.head_sha!==CUMULATIVE_CHECKPOINT||artifact.expired||
    artifact.digest!=='sha256:'+CUMULATIVE_DIGEST)return false;
 const response=await request('https://api.github.com/repos/'+REPOSITORY+
  '/actions/artifacts/'+CUMULATIVE_ARTIFACT+'/zip',{
    redirect:'follow',headers:{Accept:'application/vnd.github+json',
      Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'},
    signal:AbortSignal.timeout(12000),
  });
 if(!response?.ok)return false;
 const length=Number(response.headers?.get('content-length')||0);
 if(length>5_000_000)return false;
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>5_000_000||crypto.createHash('sha256').update(bytes).digest('hex')!==CUMULATIVE_DIGEST)return false;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'risck-checkpoint-'));
 try{
  const zip=path.join(dir,'evidence.zip');fs.writeFileSync(zip,bytes);
  const result=spawnSync('unzip',['-p',zip,'enterprise-evidence-factory/progress-report.json'],
   {timeout:10000,maxBuffer:1024*1024});
  if(result.status!==0)return false;
  const report=JSON.parse(result.stdout.toString('utf8'));
  return report.valid===true&&report.errors?.length===0&&
   report.source_sha===CUMULATIVE_CHECKPOINT&&report.ci_sha===CUMULATIVE_CHECKPOINT&&
   report.summary?.gates_accepted===3&&report.summary?.controls_pass===3&&
   ['A-09','A-18','A-19'].every(id=>report.gates?.some(g=>g.gate_id===id&&g.accepted===true));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}

// Narrowly allow publication of one still-BLOCKED technical packet after the
// externally verified 4/24 checkpoint. No other file may change.
export function docsPacketIntegrity(index,{expectedSha,root=ROOT,checkpoint=DOCS_CHECKPOINT}={}){
 if(!SHA40.test(checkpoint||'')||!SHA40.test(expectedSha||'')||checkpoint===expectedSha||
    index?.cumulative_acceptance?.schema!=='risck-comply.a15-cumulative-acceptance.v1')return false;
 if(runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const names=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 const allow=new Set([DOCS_PACKET,'scripts/enterprise-evidence/validate-evidence.mjs',DOCS_TEST]);
 if(!names.includes(DOCS_PACKET)||!names.includes('scripts/enterprise-evidence/validate-evidence.mjs')||
    names.some(n=>!allow.has(n)))return false;
 const old=runGit(root,['show',checkpoint+':'+INDEX_PATH]);
 let now;
 try{now=fs.readFileSync(path.join(root,INDEX_PATH));}catch{return false;}
 if(old.status!==0||!old.stdout.equals(now))return false;
 if(!CUMULATIVE_GATES.every(id=>index.gates?.some(g=>g.gate_id===id)))return false;
 const refs=new Set([A15_PROOF,A19_PROOF,COMBINED_PROOF]);
 for(const g of index.gates||[])if(g.accepted===true){
   if(typeof g.acceptance_evidence_ref!=='string')return false;
   refs.add(g.acceptance_evidence_ref);
 }
 for(const r of index.evidence_records||[])if(r.status==='PASS'){
   if(typeof r.artifact_path!=='string')return false;
   refs.add(r.artifact_path);
 }
 if([...refs].some(p=>!committedDigest(root,checkpoint,p)||
   committedDigest(root,checkpoint,p)!==committedDigest(root,expectedSha,p)))return false;
 let packet;
 try{packet=JSON.parse(fs.readFileSync(path.join(root,DOCS_PACKET),'utf8'));}catch{return false;}
 return packet?.checkpointSha===checkpoint&&packet?.formalA12==='BLOCKED'&&
   packet?.replayAuthorization==='NOT_GRANTED'&&packet?.counts?.reviewCases===48&&
   packet.counts.genuinelyResolvedByQualifiedDecision===0&&
   packet.counts.requiringQualifiedDecision===48&&
   Array.isArray(packet.cases)&&packet.cases.length===48&&
   new Set(packet.cases.map(x=>x.caseId)).size===48&&
   packet.cases.every(x=>x.qualifiedDisposition==='PENDING'&&x.reviewer===null&&x.replayAuthorized===false);
}

async function verifyDocsPacketCarry(index,{expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT}={}){
 if(!token||!docsPacketIntegrity(index,{expectedSha,root}))return false;
 const readProvider=githubRead(request,token);
 try{
   const pull=await reviewedPull(readProvider,expectedSha,prNumber,QUALIFIED_REVIEWER);
   if(!pull)return false;
   if(pull.mergedAt){
     const tree=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
     if(tree.status!==0||tree.stdout.toString('utf8').trim().split('\n')[0]!==tree.stdout.toString('utf8').trim().split('\n')[1])return false;
   }
   const [run,artifacts,reviews]=await Promise.all([
     readProvider('/actions/runs/'+DOCS_RUN),
     readProvider('/actions/runs/'+DOCS_RUN+'/artifacts?per_page=100'),
     readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
   ]);
   const artifact=artifacts?.artifacts?.find(a=>a.id===DOCS_ARTIFACT);
   if(run?.head_sha!==DOCS_CHECKPOINT||run?.conclusion!=='success'||
      artifact?.workflow_run?.head_sha!==DOCS_CHECKPOINT||artifact?.expired||
      artifact?.digest!=='sha256:'+DOCS_DIGEST||!Array.isArray(reviews))return false;
   const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|PENDING DECISION PACKET SAFE PUBLICATION).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
   const accepted=reviews.find(r=>r?.state==='APPROVED'&&r.user?.login===QUALIFIED_REVIEWER&&
      r.commit_id===pull.sha&&CUMULATIVE_LINES.every(line=>includesReviewLine(r.body,line))&&
      includesReviewLine(r.body,CUMULATIVE_SECURITY)&&includesReviewLine(r.body,DOCS_APPROVAL)&&
      !rejection.test(r.body)&&!decisionWithdrawn(reviews,r,pull,rejection)&&
      r.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+'#pullrequestreview-'+r.id&&
      (!pull.mergedAt||Date.parse(r.submitted_at)<=Date.parse(pull.mergedAt)));
   return accepted?{approvalUrl:accepted.html_url,acceptedAt:accepted.submitted_at,documentationOnly:true}:false;
 }catch{return false;}
}


/** No ledger, accepted proofs, workflows, billing, SQL, or production code may
 * change in this exceptional source-review transition. The narrowed path is
 * permanently bound to this PR and its accepted main checkpoint. */
export function sec01SourceCarryIntegrity(index,{
 expectedSha,root=ROOT,checkpoint=SEC01_CARRY_BASE,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(checkpoint||'')||
    expectedSha===checkpoint||!index?.cumulative_acceptance||
    runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',
   checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const changes=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 if(!changes.includes('src/lib/auth/recovery-session-proof.ts')||
    !changes.includes('src/app/[locale]/reset-password/page.tsx')||
    !changes.includes('tests/security/sec01-password-recovery-session-proof.test.ts')||
    !changes.includes('tests/enterprise-evidence/sec01-source-carry.test.mjs')||
    changes.some(name=>!SEC01_CARRY_ALLOWED.has(name)))return false;
 const baseIndex=committedJson(root,checkpoint,INDEX_PATH);
 if(!baseIndex||JSON.stringify(baseIndex)!==JSON.stringify(index))return false;
 if(!CUMULATIVE_GATES.every(id=>baseIndex.gates?.some(g=>g.gate_id===id)))return false;
 const baselineProofs=[COMBINED_PROOF,A15_PROOF,A19_PROOF];
 for(const proof of baselineProofs){
  const prior=committedDigest(root,checkpoint,proof);
  if(!SHA256.test(prior||'')||prior!==committedDigest(root,expectedSha,proof))return false;
 }
 return true;
}

/**
 * Github may temporarily hide/recreate check runs when a single job in the
 * parent workflow is rerun. Give exact-SHA authenticated provider state
 * a bounded opportunity to settle; never infer PASS from absence, and fail
 * immediately on invalid provider data or an unrelated rejection.
 * The injected functions are exclusively for deterministic regression tests.
 */
export async function verifyQat01AfterProviderSettles({
 sha,token,request,verify=verifyQat01NativeChecks,
 sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
 attempts=31,intervalMs=5000,
}={}){
 if(!SHA40.test(sha||'')||!token||!Number.isInteger(attempts)||attempts<1||
    attempts>31||!Number.isInteger(intervalMs)||intervalMs<0||intervalMs>5000)
  return {decision:'NOT_VERIFIED',errors:['invalid_settled_source_ci_request']};
 let report;
 for(let attempt=0;attempt<attempts;attempt++){
  report=await verify({sha,token,request});
  if(report?.decision==='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE')return report;
  const errors=report?.errors;
  const transient=Array.isArray(errors)&&errors.length>0&&errors.every(e=>
   typeof e==='string'&&(
    e.startsWith('missing_authenticated_check:')||
    e.startsWith('latest_required_check_not_success:')||
    e==='authentic_circleci_success_missing'
   ));
  if(!transient)return report;
  if(attempt<attempts-1)await sleep(intervalMs);
 }
 return report;
}

export async function verifySec01SourceCarry(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 // Never disclose provider responses, credentials, artifacts or review text in logs.
 // Each marker identifies only the failing class of a trustworthy check.
 const fail=(stage)=>{
  if(process.env.GITHUB_ACTIONS==='true' &&
     process.env.EVIDENCE_PR_NUMBER==='2738'){
   console.error('SEC01_SOURCE_CARRY_BLOCKED:'+stage);
  }
  return false;
 };
 const hasPrNumber=prNumber!==null&&prNumber!==undefined&&String(prNumber).trim()!=='';
 if((hasPrNumber&&Number(prNumber)!==SEC01_CARRY_PR)||!token||
    !sec01SourceCarryIntegrity(index,{expectedSha,root}))return fail('source_integrity_or_auth_input');
 const readProvider=githubRead(request,token);
 try{
  // On a PR use its exact head; on a merged main push require GitHub's
  // authenticated unique commit-to-merged-PR association and identical trees.
  const pull=await reviewedPull(readProvider,expectedSha,
   hasPrNumber?prNumber:null,QUALIFIED_REVIEWER);
  if(!pull||pull.number!==SEC01_CARRY_PR)return fail('authenticated_pr_identity');
  if(pull.mergedAt){
   const trees=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   if(trees.status!==0)return fail('merged_git_trees_readback');
   const [sourceTree,mergedTree]=trees.stdout.toString('utf8').trim().split('\n');
   if(!SHA40.test(sourceTree)||sourceTree!==mergedTree)return fail('merged_tree_mismatch');
  }
  const [baseRun,baseArtifacts,headChecks,headCi,reviews]=await Promise.all([
   readProvider('/actions/runs/'+SEC01_CARRY_RUN),
   readProvider('/actions/runs/'+SEC01_CARRY_RUN+'/artifacts?per_page=100'),
   readProvider('/commits/'+pull.sha+'/check-runs?per_page=100'),
   verifyQat01AfterProviderSettles({sha:pull.sha,token,request}),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
  ]);
  const checkpointArtifact=baseArtifacts?.artifacts?.find(a=>a.id===SEC01_CARRY_ARTIFACT);
  if(baseRun?.head_sha!==SEC01_CARRY_BASE||baseRun?.conclusion!=='success'||
     baseRun?.event!=='push')return fail('immutable_main_workflow');
  if(!checkpointArtifact||checkpointArtifact?.workflow_run?.head_sha!==SEC01_CARRY_BASE||
     checkpointArtifact?.expired||
     checkpointArtifact?.digest!=='sha256:'+SEC01_CARRY_DIGEST)return fail('immutable_main_artifact');
  if(headCi.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'){
    // These are well-defined error codes from the checked-in QAT-01 verifier;
    // no full provider errors or credential values are emitted.
    const allowed=new Set(['exact_source_sha_required','authenticated_github_read_required',
      'invalid_check_page','inconsistent_total_count','incomplete_pagination',
      'incomplete_result','invalid_status_shape','provider_readback_unavailable',
      'provider_readback_incomplete','authentic_circleci_success_missing']);
    const codes=(headCi.errors??[]).map(e=>{
      if(typeof e!=='string')return 'unknown';
      if(e.startsWith('missing_authenticated_check:'))return 'missing_named_ci_check';
      if(e.startsWith('latest_required_check_not_success:'))return 'named_ci_check_not_success';
      return allowed.has(e)?e:'unknown';
    });
    return fail('current_source_ci:'+codes.join(','));
  }
  if(!Array.isArray(headChecks?.check_runs))return fail('head_check_readback_shape');
  if(!Array.isArray(reviews))return fail('qualified_review_readback_shape');

  const tested=headChecks.check_runs.filter(c=>c?.name===SEC01_CARRY_RUNTIME_CHECK&&
     c?.head_sha===pull.sha&&c?.app?.slug==='github-actions');
  tested.sort((a,b)=>Date.parse(b.completed_at||'')-Date.parse(a.completed_at||'')||
     (b.id||0)-(a.id||0));
  if(tested[0]?.status!=='completed'||tested[0]?.conclusion!=='success'||
     !/^https:\/\/github\.com\/renanescola40-afk\/eurocomply_saas\/actions\/runs\/\d+\/job\/\d+$/.test(tested[0].html_url||''))return fail('current_head_fria_e2e');
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|SOURCE CHANGE FOUR-GATE CARRY SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const approved=reviews.find(review=>review?.state==='APPROVED'&&
     review.user?.login===QUALIFIED_REVIEWER&&review.commit_id===pull.sha&&
     CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))&&
     includesReviewLine(review.body,CUMULATIVE_SECURITY)&&
     includesReviewLine(review.body,SEC01_CARRY_REVIEW)&&
     !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
     review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+
       '#pullrequestreview-'+review.id&&
     (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
  return approved?{
   approvalUrl:approved.html_url,acceptedAt:approved.submitted_at,
   sec01SourceCarry:true,
  }:fail('qualified_exact_head_four_gate_review');
 }catch{return fail('authenticated_provider_readback_exception');}
}

/**
 * A narrowly-scoped, post-#2738 QA harness evidence admission.
 * Freeze the real four-gate accepted MAIN checkpoint and every existing proof.
 * Allow exactly this PR's browser runner, redacted evidence verifier, this
 * fail-closed admission contract and its regression tests. Source checks and
 * independently qualified exact-HEAD formal review are checked separately.
 */
export function sec01QaBrowserCarryIntegrity(index,{
 expectedSha,root=ROOT,checkpoint=SEC01_QA_BROWSER_CARRY_BASE,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(checkpoint||'')||
    expectedSha===checkpoint||
    index?.cumulative_acceptance?.schema!=='risck-comply.a15-cumulative-acceptance.v1'||
    runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',
   checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const names=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 if(names.length!==SEC01_QA_BROWSER_CARRY_FILES.size||
    !names.every(name=>SEC01_QA_BROWSER_CARRY_FILES.has(name)))return false;
 const baseline=committedJson(root,checkpoint,INDEX_PATH);
 if(!baseline||JSON.stringify(baseline)!==JSON.stringify(index)||
    !CUMULATIVE_GATES.every(id=>baseline.gates?.some(g=>g.gate_id===id)))return false;
 const frozen=new Set([COMBINED_PROOF,A15_PROOF,A19_PROOF]);
 for(const gate of baseline.gates||[])if(gate.accepted===true){
  if(typeof gate.acceptance_evidence_ref!=='string')return false;
  frozen.add(gate.acceptance_evidence_ref);
 }
 for(const record of baseline.evidence_records||[])if(record.status==='PASS'){
  if(typeof record.artifact_path!=='string')return false;
  frozen.add(record.artifact_path);
 }
 for(const name of frozen){
  const prior=committedDigest(root,checkpoint,name);
  if(!SHA256.test(prior||'')||committedDigest(root,expectedSha,name)!==prior)return false;
 }
 return true;
}

/** A review cannot be faked by a PR comment, empty APPROVED submission or a
 * prior-HEAD decision. The immutable GitHub main artifact must still prove
 * 4/24 accepted gates; the new exact source requires real QAT-01 CI and CircleCI.
 */
export async function verifySec01QaBrowserCarry(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 const prSpecified=prNumber!==undefined&&prNumber!==null&&String(prNumber).trim()!=='';
 if((prSpecified&&Number(prNumber)!==SEC01_QA_BROWSER_CARRY_PR)||
    !token||!sec01QaBrowserCarryIntegrity(index,{expectedSha,root}))return false;
 const readProvider=githubRead(request,token);
 try{
  const pull=await reviewedPull(readProvider,expectedSha,
   prSpecified?prNumber:null,QUALIFIED_REVIEWER);
  if(!pull||pull.number!==SEC01_QA_BROWSER_CARRY_PR)return false;
  if(pull.mergedAt){
   const tree=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   const entries=tree.stdout?.toString('utf8').trim().split('\n')||[];
   if(tree.status!==0||entries.length!==2||!SHA40.test(entries[0])||
      entries[0]!==entries[1])return false;
  }
  const [run,artifacts,reviews,ci]=await Promise.all([
   readProvider('/actions/runs/'+SEC01_QA_BROWSER_CARRY_RUN),
   readProvider('/actions/runs/'+SEC01_QA_BROWSER_CARRY_RUN+'/artifacts?per_page=100'),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
   verifyQat01AfterProviderSettles({sha:pull.sha,token,request}),
  ]);
  const artifact=artifacts?.artifacts?.find(a=>a.id===SEC01_QA_BROWSER_CARRY_ARTIFACT);
  if(run?.head_sha!==SEC01_QA_BROWSER_CARRY_BASE||run?.conclusion!=='success'||
     run?.event!=='push'||artifact?.workflow_run?.head_sha!==SEC01_QA_BROWSER_CARRY_BASE||
     artifact?.expired||artifact?.digest!=='sha256:'+SEC01_QA_BROWSER_CARRY_DIGEST||
     ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'||
     !Array.isArray(reviews))return false;
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|QA BROWSER HARNESS FOUR-GATE CARRY SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const approved=reviews.find(review=>review?.state==='APPROVED'&&
     review.user?.login===QUALIFIED_REVIEWER&&review.commit_id===pull.sha&&
     CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))&&
     includesReviewLine(review.body,CUMULATIVE_SECURITY)&&
     includesReviewLine(review.body,SEC01_QA_BROWSER_CARRY_REVIEW)&&
     !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
     review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+
      '#pullrequestreview-'+review.id&&
     (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
  return approved?{
   approvalUrl:approved.html_url,acceptedAt:approved.submitted_at,
   qaBrowserCarry:true,
  }:false;
 }catch{return false;}
}

export function sec01LoginCarryIntegrity(index,{
 expectedSha,root=ROOT,checkpoint=SEC01_LOGIN_CARRY_BASE,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(checkpoint||'')||
    expectedSha===checkpoint||
    index?.cumulative_acceptance?.schema!=='risck-comply.a15-cumulative-acceptance.v1'||
    runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',
   checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const names=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 if(names.length!==SEC01_LOGIN_CARRY_FILES.size||
    !names.every(name=>SEC01_LOGIN_CARRY_FILES.has(name)))return false;
 const baseline=committedJson(root,checkpoint,INDEX_PATH);
 if(!baseline||JSON.stringify(baseline)!==JSON.stringify(index)||
    !CUMULATIVE_GATES.every(id=>baseline.gates?.some(g=>g.gate_id===id)))return false;
 const frozen=new Set([COMBINED_PROOF,A15_PROOF,A19_PROOF]);
 for(const gate of baseline.gates||[])if(gate.accepted===true){
  if(typeof gate.acceptance_evidence_ref!=='string')return false;
  frozen.add(gate.acceptance_evidence_ref);
 }
 for(const record of baseline.evidence_records||[])if(record.status==='PASS'){
  if(typeof record.artifact_path!=='string')return false;
  frozen.add(record.artifact_path);
 }
 for(const name of frozen){
  const prior=committedDigest(root,checkpoint,name);
  if(!SHA256.test(prior||'')||committedDigest(root,expectedSha,name)!==prior)return false;
 }
 return true;
}
export async function verifySec01LoginCarry(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 const prSpecified=prNumber!==undefined&&prNumber!==null&&String(prNumber).trim()!=='';
 if((prSpecified&&Number(prNumber)!==SEC01_LOGIN_CARRY_PR)||
    !token||!sec01LoginCarryIntegrity(index,{expectedSha,root}))return false;
 const readProvider=githubRead(request,token);
 try{
  const pull=await reviewedPull(readProvider,expectedSha,
   prSpecified?prNumber:null,QUALIFIED_REVIEWER);
  if(!pull||pull.number!==SEC01_LOGIN_CARRY_PR)return false;
  if(pull.mergedAt){
   const tree=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   const entries=tree.stdout?.toString('utf8').trim().split('\n')||[];
   if(tree.status!==0||entries.length!==2||!SHA40.test(entries[0])||
      entries[0]!==entries[1])return false;
  }
  const [run,artifacts,reviews,ci]=await Promise.all([
   readProvider('/actions/runs/'+SEC01_LOGIN_CARRY_RUN),
   readProvider('/actions/runs/'+SEC01_LOGIN_CARRY_RUN+'/artifacts?per_page=100'),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
   verifyQat01AfterProviderSettles({sha:pull.sha,token,request}),
  ]);
  const artifact=artifacts?.artifacts?.find(a=>a.id===SEC01_LOGIN_CARRY_ARTIFACT);
  if(run?.head_sha!==SEC01_LOGIN_CARRY_BASE||run?.conclusion!=='success'||
     run?.event!=='push'||artifact?.workflow_run?.head_sha!==SEC01_LOGIN_CARRY_BASE||
     artifact?.expired||artifact?.digest!=='sha256:'+SEC01_LOGIN_CARRY_DIGEST||
     ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'||
     !Array.isArray(reviews))return false;
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|LOGIN SOURCE FOUR-GATE CARRY SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const approved=reviews.find(review=>review?.state==='APPROVED'&&
     review.user?.login===QUALIFIED_REVIEWER&&review.commit_id===pull.sha&&
     CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))&&
     includesReviewLine(review.body,CUMULATIVE_SECURITY)&&
     includesReviewLine(review.body,SEC01_LOGIN_CARRY_REVIEW)&&
     !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
     review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+
      '#pullrequestreview-'+review.id&&
     (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
  return approved?{
   approvalUrl:approved.html_url,acceptedAt:approved.submitted_at,
   loginCarry:true,
  }:false;
 }catch{return false;}
}

export function sec01HydrationCarryIntegrity(index,{
 expectedSha,root=ROOT,checkpoint=SEC01_HYDRATION_CARRY_BASE,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(checkpoint||'')||
    expectedSha===checkpoint||
    index?.cumulative_acceptance?.schema!=='risck-comply.a15-cumulative-acceptance.v1'||
    runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',
   checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const names=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 if(names.length!==SEC01_HYDRATION_CARRY_FILES.size||
    !names.every(name=>SEC01_HYDRATION_CARRY_FILES.has(name)))return false;
 const baseline=committedJson(root,checkpoint,INDEX_PATH);
 if(!baseline||JSON.stringify(baseline)!==JSON.stringify(index)||
    !CUMULATIVE_GATES.every(id=>baseline.gates?.some(g=>g.gate_id===id)))return false;
 const frozen=new Set([COMBINED_PROOF,A15_PROOF,A19_PROOF]);
 for(const gate of baseline.gates||[])if(gate.accepted===true){
  if(typeof gate.acceptance_evidence_ref!=='string')return false;
  frozen.add(gate.acceptance_evidence_ref);
 }
 for(const record of baseline.evidence_records||[])if(record.status==='PASS'){
  if(typeof record.artifact_path!=='string')return false;
  frozen.add(record.artifact_path);
 }
 for(const name of frozen){
  const prior=committedDigest(root,checkpoint,name);
  if(!SHA256.test(prior||'')||committedDigest(root,expectedSha,name)!==prior)return false;
 }
 return true;
}
export async function verifySec01HydrationCarry(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 const prSpecified=prNumber!==undefined&&prNumber!==null&&String(prNumber).trim()!=='';
 if((prSpecified&&Number(prNumber)!==SEC01_HYDRATION_CARRY_PR)||
    !token||!sec01HydrationCarryIntegrity(index,{expectedSha,root}))return false;
 const readProvider=githubRead(request,token);
 try{
  const pull=await reviewedPull(readProvider,expectedSha,
   prSpecified?prNumber:null,QUALIFIED_REVIEWER);
  if(!pull||pull.number!==SEC01_HYDRATION_CARRY_PR)return false;
  if(pull.mergedAt){
   const tree=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   const entries=tree.stdout?.toString('utf8').trim().split('\n')||[];
   if(tree.status!==0||entries.length!==2||!SHA40.test(entries[0])||
      entries[0]!==entries[1])return false;
  }
  const [run,artifacts,reviews,ci]=await Promise.all([
   readProvider('/actions/runs/'+SEC01_HYDRATION_CARRY_RUN),
   readProvider('/actions/runs/'+SEC01_HYDRATION_CARRY_RUN+'/artifacts?per_page=100'),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
   verifyQat01AfterProviderSettles({sha:pull.sha,token,request}),
  ]);
  const artifact=artifacts?.artifacts?.find(a=>a.id===SEC01_HYDRATION_CARRY_ARTIFACT);
  if(run?.head_sha!==SEC01_HYDRATION_CARRY_BASE||run?.conclusion!=='success'||
     run?.event!=='push'||artifact?.workflow_run?.head_sha!==SEC01_HYDRATION_CARRY_BASE||
     artifact?.expired||artifact?.digest!=='sha256:'+SEC01_HYDRATION_CARRY_DIGEST||
     ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'||
     !Array.isArray(reviews))return false;
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|LOGIN HYDRATION QA FOUR-GATE CARRY SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const approved=reviews.find(review=>review?.state==='APPROVED'&&
     review.user?.login===QUALIFIED_REVIEWER&&review.commit_id===pull.sha&&
     CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))&&
     includesReviewLine(review.body,CUMULATIVE_SECURITY)&&
     includesReviewLine(review.body,SEC01_HYDRATION_CARRY_REVIEW)&&
     !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
     review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+
      '#pullrequestreview-'+review.id&&
     (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
  return approved?{
   approvalUrl:approved.html_url,acceptedAt:approved.submitted_at,
   hydrationCarry:true,
  }:false;
 }catch{return false;}
}

export function sec01ClickCarryIntegrity(index,{
 expectedSha,root=ROOT,checkpoint=SEC01_CLICK_CARRY_BASE,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(checkpoint||'')||
    expectedSha===checkpoint||
    index?.cumulative_acceptance?.schema!=='risck-comply.a15-cumulative-acceptance.v1'||
    runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',
   checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const names=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 if(names.length!==SEC01_CLICK_CARRY_FILES.size||
    !names.every(name=>SEC01_CLICK_CARRY_FILES.has(name)))return false;
 const baseline=committedJson(root,checkpoint,INDEX_PATH);
 if(!baseline||JSON.stringify(baseline)!==JSON.stringify(index)||
    !CUMULATIVE_GATES.every(id=>baseline.gates?.some(g=>g.gate_id===id)))return false;
 const frozen=new Set([COMBINED_PROOF,A15_PROOF,A19_PROOF]);
 for(const gate of baseline.gates||[])if(gate.accepted===true){
  if(typeof gate.acceptance_evidence_ref!=='string')return false;
  frozen.add(gate.acceptance_evidence_ref);
 }
 for(const record of baseline.evidence_records||[])if(record.status==='PASS'){
  if(typeof record.artifact_path!=='string')return false;
  frozen.add(record.artifact_path);
 }
 for(const name of frozen){
  const prior=committedDigest(root,checkpoint,name);
  if(!SHA256.test(prior||'')||committedDigest(root,expectedSha,name)!==prior)return false;
 }
 return true;
}
export async function verifySec01ClickCarry(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 const reject=(stage)=>{
  if(process.env.GITHUB_ACTIONS==='true'&&process.env.EVIDENCE_PR_NUMBER==='2743')
    console.error('SEC01_CLICK_CARRY_BLOCKED:'+stage);
  return false;
 };
 const prSpecified=prNumber!==undefined&&prNumber!==null&&String(prNumber).trim()!=='';
 if((prSpecified&&Number(prNumber)!==SEC01_CLICK_CARRY_PR)||
    !token||!sec01ClickCarryIntegrity(index,{expectedSha,root}))return reject('source_integrity_or_auth_input');
 const readProvider=githubRead(request,token);
 try{
  const pull=await reviewedPull(readProvider,expectedSha,
   prSpecified?prNumber:null,QUALIFIED_REVIEWER);
  if(!pull||pull.number!==SEC01_CLICK_CARRY_PR)return reject('authenticated_pr_identity');
  if(pull.mergedAt){
   const tree=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   const entries=tree.stdout?.toString('utf8').trim().split('\n')||[];
   if(tree.status!==0||entries.length!==2||!SHA40.test(entries[0])||
      entries[0]!==entries[1])return reject('merged_tree_mismatch');
  }
  const [run,artifacts,reviews,ci]=await Promise.all([
   readProvider('/actions/runs/'+SEC01_CLICK_CARRY_RUN),
   readProvider('/actions/runs/'+SEC01_CLICK_CARRY_RUN+'/artifacts?per_page=100'),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
   verifyQat01AfterProviderSettles({sha:pull.sha,token,request}),
  ]);
  const artifact=artifacts?.artifacts?.find(a=>a.id===SEC01_CLICK_CARRY_ARTIFACT);
  if(run?.head_sha!==SEC01_CLICK_CARRY_BASE||run?.conclusion!=='success'||run?.event!=='push')
    return reject('immutable_main_workflow');
  if(artifact?.workflow_run?.head_sha!==SEC01_CLICK_CARRY_BASE||artifact?.expired||
     artifact?.digest!=='sha256:'+SEC01_CLICK_CARRY_DIGEST)
    return reject('immutable_main_artifact');
  if(ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE')
    return reject('current_source_ci');
  if(!Array.isArray(reviews))return reject('qualified_review_readback_shape');
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|PLAYWRIGHT POINTER QA FOUR-GATE CARRY SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const approved=reviews.find(review=>review?.state==='APPROVED'&&
     review.user?.login===QUALIFIED_REVIEWER&&review.commit_id===pull.sha&&
     CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))&&
     includesReviewLine(review.body,CUMULATIVE_SECURITY)&&
     includesReviewLine(review.body,SEC01_CLICK_CARRY_REVIEW)&&
     !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
     review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+
      '#pullrequestreview-'+review.id&&
     (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
  return approved?{
   approvalUrl:approved.html_url,acceptedAt:approved.submitted_at,
   clickCarry:true,
  }:reject('qualified_exact_head_formal_review');
 }catch{return reject('authenticated_provider_readback_exception');}
}


/**
 * This narrowly-scoped continuation cannot modify the evidence index,
 * historical acceptance proofs, workflows, SQL, server security, billing or
 * Production. A new PR head is independently reviewed, even if main passed.
 */
export function sec01ProfileCarryIntegrity(index,{
 expectedSha,root=ROOT,checkpoint=SEC01_PROFILE_CARRY_BASE,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(checkpoint||'')||
    expectedSha===checkpoint||
    index?.cumulative_acceptance?.schema!=='risck-comply.a15-cumulative-acceptance.v1'||
    runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',
   checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const names=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 if(names.length!==SEC01_PROFILE_CARRY_FILES.size||
    !names.every(name=>SEC01_PROFILE_CARRY_FILES.has(name)))return false;
 const baseline=committedJson(root,checkpoint,INDEX_PATH);
 if(!baseline||JSON.stringify(baseline)!==JSON.stringify(index)||
    !CUMULATIVE_GATES.every(id=>baseline.gates?.some(g=>g.gate_id===id&&
      (id==='A-19'||g.accepted===true))))
    return false;
 const frozen=new Set([COMBINED_PROOF,A15_PROOF,A19_PROOF]);
 for(const gate of baseline.gates||[])if(gate.accepted===true){
  if(typeof gate.acceptance_evidence_ref!=='string')return false;
  frozen.add(gate.acceptance_evidence_ref);
 }
 for(const record of baseline.evidence_records||[])if(record.status==='PASS'){
  if(typeof record.artifact_path!=='string')return false;
  frozen.add(record.artifact_path);
 }
 for(const path of frozen){
  const prior=committedDigest(root,checkpoint,path);
  if(!SHA256.test(prior||'')||committedDigest(root,expectedSha,path)!==prior)return false;
 }
 return true;
}

export async function verifySec01ProfileCarry(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 const prSpecified=prNumber!==undefined&&prNumber!==null&&String(prNumber).trim()!=='';
 if((prSpecified&&Number(prNumber)!==SEC01_PROFILE_CARRY_PR)||
    !token||!sec01ProfileCarryIntegrity(index,{expectedSha,root}))return false;
 const readProvider=githubRead(request,token);
 try{
  const pull=await reviewedPull(readProvider,expectedSha,
   prSpecified?prNumber:null,QUALIFIED_REVIEWER);
  if(!pull||pull.number!==SEC01_PROFILE_CARRY_PR)return false;
  if(pull.mergedAt){
   const trees=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   const items=trees.stdout?.toString('utf8').trim().split('\n')||[];
   if(trees.status!==0||items.length!==2||!SHA40.test(items[0])||
      items[0]!==items[1])return false;
  }
  const [run,artifacts,reviews,ci]=await Promise.all([
   readProvider('/actions/runs/'+SEC01_PROFILE_CARRY_RUN),
   readProvider('/actions/runs/'+SEC01_PROFILE_CARRY_RUN+'/artifacts?per_page=100'),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
   verifyQat01AfterProviderSettles({sha:pull.sha,token,request}),
  ]);
  const artifact=artifacts?.artifacts?.find(a=>a.id===SEC01_PROFILE_CARRY_ARTIFACT);
  if(run?.head_sha!==SEC01_PROFILE_CARRY_BASE||run?.conclusion!=='success'||
    run?.event!=='push'||artifact?.workflow_run?.head_sha!==SEC01_PROFILE_CARRY_BASE||
    artifact?.expired||artifact?.digest!=='sha256:'+SEC01_PROFILE_CARRY_DIGEST||
    ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'||
    !Array.isArray(reviews))return false;
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|PROFILE RETURN FOUR-GATE CARRY SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const approved=reviews.find(review=>review?.state==='APPROVED'&&
    review.user?.login===QUALIFIED_REVIEWER&&review.commit_id===pull.sha&&
    CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))&&
    includesReviewLine(review.body,CUMULATIVE_SECURITY)&&
    includesReviewLine(review.body,SEC01_PROFILE_CARRY_REVIEW)&&
    !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
    review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+
      '#pullrequestreview-'+review.id&&
    (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
  return approved?{
    approvalUrl:approved.html_url,acceptedAt:approved.submitted_at,
    profileCarry:true,
  }:false;
 }catch{return false;}
}


/** Only a reviewed five-file QA harness and validator edit can carry 4 accepted gates. */
export function sec01ConsentCarryIntegrity(index,{
 expectedSha,root=ROOT,checkpoint=SEC01_CONSENT_CARRY_BASE,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(checkpoint||'')||
    expectedSha===checkpoint||
    index?.cumulative_acceptance?.schema!=='risck-comply.a15-cumulative-acceptance.v1'||
    runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',
    checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const paths=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 if(paths.length!==SEC01_CONSENT_CARRY_FILES.size||
    !paths.every(p=>SEC01_CONSENT_CARRY_FILES.has(p)))return false;
 const baseline=committedJson(root,checkpoint,INDEX_PATH);
 if(!baseline||JSON.stringify(baseline)!==JSON.stringify(index)||
    !CUMULATIVE_GATES.every(id=>baseline.gates?.some(g=>g.gate_id===id&&
      (id==='A-19'||g.accepted===true))))return false;
 const immutable=new Set([COMBINED_PROOF,A15_PROOF,A19_PROOF]);
 for(const gate of baseline.gates||[])if(gate.accepted===true){
  if(typeof gate.acceptance_evidence_ref!=='string')return false;
  immutable.add(gate.acceptance_evidence_ref);
 }
 for(const row of baseline.evidence_records||[])if(row.status==='PASS'){
  if(typeof row.artifact_path!=='string')return false;
  immutable.add(row.artifact_path);
 }
 for(const p of immutable){
  const before=committedDigest(root,checkpoint,p);
  if(!SHA256.test(before||'')||committedDigest(root,expectedSha,p)!==before)return false;
 }
 return true;
}

export async function verifySec01ConsentCarry(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 const provided=prNumber!==undefined&&prNumber!==null&&String(prNumber).trim()!=='';
 if((provided&&Number(prNumber)!==SEC01_CONSENT_CARRY_PR)||
    !token||!sec01ConsentCarryIntegrity(index,{expectedSha,root}))return false;
 const provider=githubRead(request,token);
 try{
  const pull=await reviewedPull(provider,expectedSha,
    provided?prNumber:null,QUALIFIED_REVIEWER);
  if(!pull||pull.number!==SEC01_CONSENT_CARRY_PR)return false;
  if(pull.mergedAt){
   const pair=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   const trees=pair.stdout?.toString('utf8').trim().split('\n')||[];
   if(pair.status!==0||trees.length!==2||!SHA40.test(trees[0])||
     trees[0]!==trees[1])return false;
  }
  const [run,artifacts,reviews,ci]=await Promise.all([
   provider('/actions/runs/'+SEC01_CONSENT_CARRY_RUN),
   provider('/actions/runs/'+SEC01_CONSENT_CARRY_RUN+'/artifacts?per_page=100'),
   provider('/pulls/'+pull.number+'/reviews?per_page=100'),
   verifyQat01AfterProviderSettles({sha:pull.sha,token,request}),
  ]);
  const artifact=artifacts?.artifacts?.find(a=>a.id===SEC01_CONSENT_CARRY_ARTIFACT);
  if(run?.head_sha!==SEC01_CONSENT_CARRY_BASE||run?.conclusion!=='success'||
    run?.event!=='push'||artifact?.workflow_run?.head_sha!==SEC01_CONSENT_CARRY_BASE||
    artifact?.expired||artifact?.digest!=='sha256:'+SEC01_CONSENT_CARRY_DIGEST||
    ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'||
    !Array.isArray(reviews))return false;
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|CONSENT OVERLAY FOUR-GATE CARRY SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const accepted=reviews.find(review=>review?.state==='APPROVED'&&
    review.user?.login===QUALIFIED_REVIEWER&&review.commit_id===pull.sha&&
    CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))&&
    includesReviewLine(review.body,CUMULATIVE_SECURITY)&&
    includesReviewLine(review.body,SEC01_CONSENT_CARRY_REVIEW)&&
    !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
    review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+
      '#pullrequestreview-'+review.id&&
    (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
  return accepted?{approvalUrl:accepted.html_url,acceptedAt:accepted.submitted_at,
   consentCarry:true}:false;
 }catch{return false;}
}

/** Only a reviewed five-file QA harness and validator edit can carry 4 accepted gates. */
export function sec01AlertCarryIntegrity(index,{
 expectedSha,root=ROOT,checkpoint=SEC01_ALERT_CARRY_BASE,
}={}){
 if(!SHA40.test(expectedSha||'')||!SHA40.test(checkpoint||'')||
    expectedSha===checkpoint||
    index?.cumulative_acceptance?.schema!=='risck-comply.a15-cumulative-acceptance.v1'||
    runGit(root,['merge-base','--is-ancestor',checkpoint,expectedSha]).status!==0)return false;
 const diff=runGit(root,['diff','--no-ext-diff','--name-only','--no-renames','-z',
    checkpoint,expectedSha,'--']);
 if(diff.status!==0||!Buffer.isBuffer(diff.stdout))return false;
 const paths=diff.stdout.toString('utf8').split('\0').filter(Boolean);
 if(paths.length!==SEC01_ALERT_CARRY_FILES.size||
    !paths.every(p=>SEC01_ALERT_CARRY_FILES.has(p)))return false;
 const baseline=committedJson(root,checkpoint,INDEX_PATH);
 if(!baseline||JSON.stringify(baseline)!==JSON.stringify(index)||
    !CUMULATIVE_GATES.every(id=>baseline.gates?.some(g=>g.gate_id===id&&
      (id==='A-19'||g.accepted===true))))return false;
 const immutable=new Set([COMBINED_PROOF,A15_PROOF,A19_PROOF]);
 for(const gate of baseline.gates||[])if(gate.accepted===true){
  if(typeof gate.acceptance_evidence_ref!=='string')return false;
  immutable.add(gate.acceptance_evidence_ref);
 }
 for(const row of baseline.evidence_records||[])if(row.status==='PASS'){
  if(typeof row.artifact_path!=='string')return false;
  immutable.add(row.artifact_path);
 }
 for(const p of immutable){
  const before=committedDigest(root,checkpoint,p);
  if(!SHA256.test(before||'')||committedDigest(root,expectedSha,p)!==before)return false;
 }
 return true;
}

export async function verifySec01AlertCarry(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 const provided=prNumber!==undefined&&prNumber!==null&&String(prNumber).trim()!=='';
 if((provided&&Number(prNumber)!==SEC01_ALERT_CARRY_PR)||
    !token||!sec01AlertCarryIntegrity(index,{expectedSha,root}))return false;
 const provider=githubRead(request,token);
 try{
  const pull=await reviewedPull(provider,expectedSha,
    provided?prNumber:null,QUALIFIED_REVIEWER);
  if(!pull||pull.number!==SEC01_ALERT_CARRY_PR)return false;
  if(pull.mergedAt){
   const pair=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   const trees=pair.stdout?.toString('utf8').trim().split('\n')||[];
   if(pair.status!==0||trees.length!==2||!SHA40.test(trees[0])||
     trees[0]!==trees[1])return false;
  }
  const [run,artifacts,reviews,ci]=await Promise.all([
   provider('/actions/runs/'+SEC01_ALERT_CARRY_RUN),
   provider('/actions/runs/'+SEC01_ALERT_CARRY_RUN+'/artifacts?per_page=100'),
   provider('/pulls/'+pull.number+'/reviews?per_page=100'),
   verifyQat01AfterProviderSettles({sha:pull.sha,token,request}),
  ]);
  const artifact=artifacts?.artifacts?.find(a=>a.id===SEC01_ALERT_CARRY_ARTIFACT);
  if(run?.head_sha!==SEC01_ALERT_CARRY_BASE||run?.conclusion!=='success'||
    run?.event!=='push'||artifact?.workflow_run?.head_sha!==SEC01_ALERT_CARRY_BASE||
    artifact?.expired||artifact?.digest!=='sha256:'+SEC01_ALERT_CARRY_DIGEST||
    ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'||
    !Array.isArray(reviews))return false;
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW|QA INVALID PASSWORD ALERT FOUR-GATE CARRY SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const accepted=reviews.find(review=>review?.state==='APPROVED'&&
    review.user?.login===QUALIFIED_REVIEWER&&review.commit_id===pull.sha&&
    CUMULATIVE_LINES.every(line=>includesReviewLine(review.body,line))&&
    includesReviewLine(review.body,CUMULATIVE_SECURITY)&&
    includesReviewLine(review.body,SEC01_ALERT_CARRY_REVIEW)&&
    !rejection.test(review.body)&&!decisionWithdrawn(reviews,review,pull,rejection)&&
    review.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+
      '#pullrequestreview-'+review.id&&
    (!pull.mergedAt||Date.parse(review.submitted_at)<=Date.parse(pull.mergedAt)));
  return accepted?{approvalUrl:accepted.html_url,acceptedAt:accepted.submitted_at,
   alertCarry:true}:false;
 }catch{return false;}
}

export async function verifyCumulativeRelease(index,{
 expectedSha,prNumber,token,request=globalThis.fetch,root=ROOT,
}={}){
 if(!SHA40.test(expectedSha||'')||!token)return false;
 if(!cumulativeIntegrity(index,{expectedSha,root})){
  if(sec01SourceCarryIntegrity(index,{expectedSha,root})){
   return verifySec01SourceCarry(index,{expectedSha,prNumber,token,request,root});
  }
  if(sec01QaBrowserCarryIntegrity(index,{expectedSha,root})){
   return verifySec01QaBrowserCarry(index,{expectedSha,prNumber,token,request,root});
  }
  if(sec01LoginCarryIntegrity(index,{expectedSha,root})){
   return verifySec01LoginCarry(index,{expectedSha,prNumber,token,request,root});
  }
  // Click carry is the narrower, later PR. Its changes sit inside the
  // earlier hydration carry's cumulative six-file allowlist, so dispatch
  // it first; each verifier still enforces its OWN exact PR number and
  // native qualified review rather than inheriting an earlier approval.
  // New post-consent alert proof shares its five-file change set with the earlier
  // consent harness; validate the newer exact-PR identity before historic carries.
  if(sec01AlertCarryIntegrity(index,{expectedSha,root})){
   return verifySec01AlertCarry(index,{expectedSha,prNumber,token,request,root});
  }
  if(sec01ConsentCarryIntegrity(index,{expectedSha,root})){
   return verifySec01ConsentCarry(index,{expectedSha,prNumber,token,request,root});
  }
  if(sec01ProfileCarryIntegrity(index,{expectedSha,root})){
   return verifySec01ProfileCarry(index,{expectedSha,prNumber,token,request,root});
  }
  if(sec01ClickCarryIntegrity(index,{expectedSha,root})){
   return verifySec01ClickCarry(index,{expectedSha,prNumber,token,request,root});
  }
  if(sec01HydrationCarryIntegrity(index,{expectedSha,root})){
   return verifySec01HydrationCarry(index,{expectedSha,prNumber,token,request,root});
  }
  return verifyDocsPacketCarry(index,{expectedSha,prNumber,token,request,root});
 }
 const readProvider=githubRead(request,token),source=index.cumulative_acceptance.source_sha;
 try{
  const pull=await reviewedPull(readProvider,expectedSha,prNumber,QUALIFIED_REVIEWER);
  if(!pull||runGit(root,['merge-base','--is-ancestor',source,pull.sha]).status!==0)return false;
  if(pull.mergedAt){
   const trees=runGit(root,['rev-parse',pull.sha+'^{tree}',expectedSha+'^{tree}']);
   const [headTree,mergeTree]=trees.stdout.toString('utf8').trim().split('\n');
   if(trees.status!==0||!SHA40.test(headTree)||headTree!==mergeTree)return false;
  }
  const [ci,reviews,checkpoint]=await Promise.all([
   verifyQat01NativeChecks({sha:source,token,request}),
   readProvider('/pulls/'+pull.number+'/reviews?per_page=100'),
   officialCheckpoint(readProvider,request,token),
  ]);
  if(!checkpoint||ci.decision!=='SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE'||
      !Array.isArray(reviews))return false;
  const proof=JSON.parse(fs.readFileSync(path.join(root,A15_PROOF),'utf8'));
  const sourceObservation=proof.qualified_review?.source_ci_verification;
  const sourceReview=reviews.find(r=>r.id===sourceObservation?.review_id&&
   r.user?.login===QUALIFIED_REVIEWER&&r.state==='COMMENTED'&&r.commit_id===source&&
   includesReviewLine(r.body,'A-15/QAT-01 INDEPENDENT SOURCE CI VERIFICATION: 11/11 PASS')&&
   !sourceObservationWithdrawn(reviews,r,pull,/A-15\/QAT-01.{0,85}(?:WITHHELD|REJECTED|NOT APPROVED)/i));
  const finished=Math.max(...ci.checks.map(c=>Date.parse(c.completed_at)));
  if(!sourceReview||!Number.isFinite(finished)||Date.parse(sourceReview.submitted_at)<finished||
     sourceObservation.reviewed_head_sha!==source||sourceObservation.review_url!==sourceReview.html_url)return false;
  const rejection=/(?:FORMAL GATE ACCEPTANCE|CUMULATIVE ACCEPTANCE SECURITY REVIEW).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i;
  const approval=reviews.find(r=>r.state==='APPROVED'&&r.user?.login===QUALIFIED_REVIEWER&&
   r.commit_id===pull.sha&&CUMULATIVE_LINES.every(line=>includesReviewLine(r.body,line))&&
   includesReviewLine(r.body,CUMULATIVE_SECURITY)&&!rejection.test(r.body)&&
   !decisionWithdrawn(reviews,r,pull,rejection)&&
   r.html_url==='https://github.com/'+REPOSITORY+'/pull/'+pull.number+'#pullrequestreview-'+r.id&&
   Date.parse(r.submitted_at)>=Date.parse(sourceReview.submitted_at)&&
   (!pull.mergedAt||Date.parse(r.submitted_at)<=Date.parse(pull.mergedAt)));
  return approval?{approvalUrl:approval.html_url,acceptedAt:approval.submitted_at}:false;
 }catch{return false;}
}

// Prove two separate evidence-only intervals without widening either gate's path rules.
// The exact-head provider reviews are still required for all three claims.
export function a19AncestryTarget(indexGates,{expectedSha,root=ROOT}={}){
 const a19Claims=indexGates.filter(gate=>gate.gate_id==='A-19');
 const [a19]=a19Claims;
 if(a19Claims.length!==1||a19.acceptance_evidence_ref!==A19_PROOF)return null;
 const options={expectedSha,root};
 const combined=indexGates.filter(gate=>gate.acceptance_evidence_ref===COMBINED_PROOF);
 if(combined.length===0)return sourceCommitIsReviewedAncestor(a19,options)?expectedSha:null;
 if(!combinedClaimsMatch(indexGates,combined))return null;
 const [claim]=combined;
 const source=claim.acceptance_sha;
 if(source===expectedSha||!sourceCommitIsReviewedAncestor(claim,options)||
    !sourceCommitIsReviewedAncestor(a19,{expectedSha:source,root}))return null;
 const frozen=frozenA19Claims(root,source);
 if(frozen?.length!==1||frozen[0].acceptance_evidence_ref!==A19_PROOF||
    frozen[0].acceptance_sha!==a19.acceptance_sha||
    frozen[0].acceptance_evidence_sha256!==a19.acceptance_evidence_sha256||
    !SHA256.test(a19.acceptance_evidence_sha256||'')||
    committedDigest(root,source,A19_PROOF)!==a19.acceptance_evidence_sha256||
    committedDigest(root,expectedSha,A19_PROOF)!==a19.acceptance_evidence_sha256||
    !SHA256.test(claim.acceptance_evidence_sha256||'')||
    committedDigest(root,expectedSha,COMBINED_PROOF)!==claim.acceptance_evidence_sha256)return null;
 return source;
}

// A gate may claim acceptance only after ALL children pass and a separate
// qualified review is recorded against the exact SHA and digest-matched proof.
// This validates the ledger shape; the release reviewer must also independently
// verify the external approval URL against the provider.
export function validateGateAcceptance(gate,{eligible,expectedSha,now=new Date(),root=ROOT,providerApproved=false}={}){
 if(gate?.accepted!==true)return [];
 const errors=[];
 if(['A-09','A-15','A-18','A-19'].includes(gate.gate_id)&&providerApproved!==true)errors.push('authenticated_current_head_review_required');
 if(gate.gate_id==='A-09'&&gate.acceptance_evidence_ref!==COMBINED_PROOF)errors.push('combined_a09_a18_proof_required');
 if(!eligible)errors.push('child_controls_not_all_pass');
 for(const key of ['accepted_by','reviewer_id','approval_url','acceptance_evidence_ref']){
  if(typeof gate[key]!=='string'||!gate[key].trim())errors.push(key+'_required');
 }
 if(gate.reviewer_status!=='ACCEPTED'||gate.acceptance_status!=='ACCEPTED')errors.push('qualified_acceptance_required');
 const when=Date.parse(gate.accepted_at||'');
 if(!Number.isFinite(when)||when>now.getTime())errors.push('accepted_at_missing_invalid_or_future');
 if(!SHA40.test(gate.acceptance_sha||''))errors.push('acceptance_sha_invalid');
 else if(expectedSha&&!sourceCommitIsReviewedAncestor(gate,{expectedSha,root}))errors.push('acceptance_sha_mismatch');
 if(typeof gate.approval_url==='string'&&!/^https:\/\/github\.com\/renanescola40-afk\/eurocomply_saas\/pull\/\d+#pullrequestreview-\d+$/.test(gate.approval_url))errors.push('qualified_review_url_invalid');
 const ref=gate.acceptance_evidence_ref;
 if(typeof ref==='string'&&ref.trim()){
  const absolute=path.resolve(root,ref);
  if(!absolute.startsWith(path.resolve(root)+path.sep))errors.push('acceptance_artifact_path_outside_repository');
  else {
   let proofBytes;
   try{proofBytes=fs.readFileSync(absolute);}
   catch{errors.push('acceptance_artifact_missing');return errors;}
   const digest=crypto.createHash('sha256').update(proofBytes).digest('hex');
   if(!SHA256.test(gate.acceptance_evidence_sha256||'')||digest!==gate.acceptance_evidence_sha256){
    errors.push('acceptance_artifact_sha256_mismatch');
   }else{
    // The baseline must be frozen inside the digest-matched proof, not chosen
    // later through editable ledger metadata. Prevents moving the baseline past
    // an unreviewed code change while reusing an older review and proof.
    try{
     const proof=gateProof(JSON.parse(proofBytes.toString('utf8')),gate);
     if(!proof||typeof proof!=='object'||Array.isArray(proof)||
      !SHA40.test(proof.acceptance_source_sha||'')||
      proof.acceptance_source_sha!==gate.acceptance_sha||
      proof.gate_id!==gate.gate_id||
      (gate.gate_id==='A-15'&&proof.tested_source_sha!==gate.acceptance_sha)||
      proof.qualified_review?.reviewer_login!==gate.reviewer_id||
      (gate.gate_id!=='A-19'&&proof.qualified_review?.review_url!==gate.approval_url)){
      errors.push('acceptance_source_not_bound_to_proof');
     }
    }catch{errors.push('acceptance_proof_invalid_json');}
   }
  }
 }
 return errors;
}

// Archived unaccepted readbacks retain the frozen baseline SHA. Any PASS or
// reviewer-accepted claim must match the candidate SHA and cannot inherit it.
export function evidenceExpectedSha(record,{frozenSha,candidateSha}={}){
 const historical=SHA40.test(String(frozenSha||''))&&record?.commit_sha===frozenSha&&
  ['BLOCKED','NOT_VERIFIED','FAIL'].includes(record?.status)&&
  record?.reviewer_status==='NOT_REVIEWED'&&record?.acceptance_status==='NOT_ACCEPTED';
 return historical?frozenSha:candidateSha;
}

export function reconcile({scope,gates,index,expectedSha,now=new Date(),providerA18Approved=false,providerA09Approved=false,providerA15Approved=false,a19Review=null,cumulativeReview=null}){
 const errors=[];if(scope.mandatory.length!==38)errors.push('atomic_scope_must_equal_38');if(gates.groups.length!==24)errors.push('formal_gate_scope_must_equal_24');if(index.fixed_scope?.atomic_controls!==38||index.fixed_scope?.formal_gates!==24)errors.push('index_scope_mismatch');
 const cumulative=Boolean(index.cumulative_acceptance);
 const docsCarry=Boolean(cumulative&&cumulativeReview?.documentationOnly===true&&docsPacketIntegrity(index,{expectedSha}));
  const sec01Carry=Boolean(cumulative&&cumulativeReview?.sec01SourceCarry===true&&
   sec01SourceCarryIntegrity(index,{expectedSha}));
 const qaBrowserCarry=Boolean(cumulative&&cumulativeReview?.qaBrowserCarry===true&&
   sec01QaBrowserCarryIntegrity(index,{expectedSha}));
 const loginCarry=Boolean(cumulative&&cumulativeReview?.loginCarry===true&&
   sec01LoginCarryIntegrity(index,{expectedSha}));
 const hydrationCarry=Boolean(cumulative&&cumulativeReview?.hydrationCarry===true&&
   sec01HydrationCarryIntegrity(index,{expectedSha}));
 const clickCarry=Boolean(cumulative&&cumulativeReview?.clickCarry===true&&
   sec01ClickCarryIntegrity(index,{expectedSha}));
 const profileCarry=Boolean(cumulative&&cumulativeReview?.profileCarry===true&&
   sec01ProfileCarryIntegrity(index,{expectedSha}));
 const consentCarry=Boolean(cumulative&&cumulativeReview?.consentCarry===true&&
   sec01ConsentCarryIntegrity(index,{expectedSha}));
 const alertCarry=Boolean(cumulative&&cumulativeReview?.alertCarry===true&&
   sec01AlertCarryIntegrity(index,{expectedSha}));
 const carry=Boolean(cumulative&&cumulativeReview&&
   (docsCarry||sec01Carry||qaBrowserCarry||loginCarry||hydrationCarry||clickCarry||profileCarry||consentCarry||alertCarry||cumulativeIntegrity(index,{expectedSha})));
 const qatGate=(index.gates||[]).find(gate=>gate.gate_id==='A-15'&&gate.accepted===true);
 const isQatPass=record=>record.control_id==='QAT-01'&&record.status==='PASS';
 const qatEvidenceMatches=record=>qatGate&&record.gate_id==='A-15'&&
  record.artifact_path===qatGate.acceptance_evidence_ref&&
  record.artifact_sha256===qatGate.acceptance_evidence_sha256&&
  sourceCommitIsReviewedAncestor(qatGate,{expectedSha:(docsCarry||sec01Carry||qaBrowserCarry||loginCarry||hydrationCarry||clickCarry||profileCarry||consentCarry||alertCarry)?DOCS_CHECKPOINT:expectedSha});
 const recordSha=record=>isQatPass(record)&&qatEvidenceMatches(record)
  ?qatGate.acceptance_sha
  :evidenceExpectedSha(record,{frozenSha:index.source?.commit_sha,candidateSha:expectedSha});
 const ids=new Set(scope.mandatory.map(c=>c.id)), mappedIds=gates.groups.flatMap(g=>g.atomicCriteria), seen=new Set(), byControl=new Map();
 const indexGates=index.gates||[];
 const a19Candidate=indexGates.find(g=>g.gate_id==='A-19'&&g.acceptance_evidence_ref===A19_PROOF);
 const combined=indexGates.filter(gate=>gate.acceptance_evidence_ref===COMBINED_PROOF);
 const jointRequired=combined.length>0&&(a19Candidate||
  committedDigest(ROOT,expectedSha,A19_PROOF)!==null||
  combined.some(gate=>frozenA19Claims(ROOT,gate.acceptance_sha)?.some(
   claim=>claim.acceptance_evidence_ref===A19_PROOF)));
 if(cumulative&&!carry)errors.push('cumulative_acceptance_requires_authenticated_release');
 const a19Target=a19Candidate&&a19AncestryTarget(indexGates,{expectedSha:carry?CUMULATIVE_CHECKPOINT:expectedSha});
 const a19Bound=Boolean(a19Target);
 if(jointRequired&&!a19Bound)errors.push('invalid_joint_release:A-19:source_or_artifact_mismatch');
 if(a19Bound&&!a19Review&&!carry)errors.push('invalid_gate_acceptance:A-19:authenticated_current_head_review_required');
 const a19Approved=Boolean(a19Bound&&(a19Review?.state==='APPROVED'||carry));
 for(const id of ids){const n=mappedIds.filter(x=>x===id).length;if(n!==1)errors.push('control_must_map_to_exactly_one_gate:'+id);}
 for(const id of mappedIds)if(!ids.has(id))errors.push('gate_maps_unknown_control:'+id);
 for(const r of index.evidence_records||[]){if(seen.has(r.evidence_id))errors.push('duplicate_evidence_id:'+r.evidence_id);seen.add(r.evidence_id);if(!ids.has(r.control_id))errors.push('unknown_control:'+r.control_id);const mapped=gates.groups.filter(g=>g.atomicCriteria.includes(r.control_id)).map(g=>g.id);if(!mapped.includes(r.gate_id))errors.push('control_gate_mapping_mismatch:'+r.control_id);const boundSha=recordSha(r);const re=validateEvidenceRecord(r,{expectedSha:boundSha,now});if(re.length)errors.push(r.evidence_id+':'+re.join(','));if(!byControl.has(r.control_id))byControl.set(r.control_id,[]);byControl.get(r.control_id).push(r);}
 const g1SourceAdmission=evaluateG1Scope(scope,ROOT);
 if(!g1SourceAdmission.valid)errors.push('g1_source_acceptance_evidence_invalid');
 const controls=scope.mandatory.map(c=>{const rs=byControl.get(c.id)||[];const validPass=(c.id==='OPS-02'&&a19Approved)||rs.some(r=>r.status==='PASS'&&r.reviewer_status==='ACCEPTED'&&r.acceptance_status==='ACCEPTED'&&(!isQatPass(r)||((providerA15Approved||carry)&&qatEvidenceMatches(r)))&&validateEvidenceRecord(r,{expectedSha:isQatPass(r)?recordSha(r):expectedSha,now}).length===0);const sourceEvidenceValid=Array.isArray(c.evidenceRefs)&&c.evidenceRefs.length>0&&c.evidenceRefs.every(ref=>{if(typeof ref!=='string'||!ref.trim())return false;const p=path.resolve(ROOT,ref);return p.startsWith(ROOT+path.sep)&&fs.existsSync(p)&&fs.statSync(p).isFile();});const sourceAccepted=c.status==='PASS'&&typeof c.acceptedBy==='string'&&c.acceptedBy.trim().length>0&&Number.isFinite(Date.parse(c.acceptedAt||''))&&Date.parse(c.acceptedAt)<=now.getTime()&&sourceEvidenceValid&&g1SourceAdmission.valid&&g1SourceAdmission.passIds.includes(c.id);const status=c.status==='BLOCKED'?'BLOCKED':validPass||sourceAccepted?'PASS':rs.some(r=>r.status==='FAIL')?'FAIL':rs.some(r=>r.status==='BLOCKED')?'BLOCKED':c.status==='PASS'?'NOT_VERIFIED':c.status;if(c.status==='BLOCKED'&&validPass)errors.push('blocked_control_pass_claim_requires_source_reconciliation:'+c.id);if(c.status==='PASS'&&!sourceAccepted&&!validPass)errors.push('source_pass_unverified:'+c.id);return {control_id:c.id,status,source_status:c.status,evidence_count:rs.length+(c.id==='OPS-02'&&a19Candidate?1:0),valid_pass_evidence:validPass};});
 if(combined.length>0&&!combinedClaimsMatch(indexGates,combined)){
  errors.push('combined_acceptance_claims_must_match');
 }
 const gateRows=gates.groups.map(gate=>{
  const children=gate.atomicCriteria.map(id=>controls.find(control=>control.control_id===id));
  let claim=indexGates.find(row=>row.gate_id===gate.id);
  if(gate.id==='A-19'&&a19Approved)claim={...a19Candidate,accepted:true,
   accepted_by:QUALIFIED_REVIEWER,reviewer_id:QUALIFIED_REVIEWER,reviewer_status:'ACCEPTED',
   acceptance_status:'ACCEPTED',approval_url:carry?cumulativeReview.approvalUrl:a19Review.approvalUrl,
   accepted_at:carry?cumulativeReview.acceptedAt:a19Review.acceptedAt};
  const eligible=children.length===gate.atomicCriteria.length&&children.every(control=>control?.status==='PASS');
  const computed=eligible?'ELIGIBLE_FOR_INDEPENDENT_REVIEW':
   children.some(control=>control?.status==='BLOCKED')?'BLOCKED':'NOT_ELIGIBLE';
  const status=claim?.status==='REQUIRES_RECONCILIATION'?'REQUIRES_RECONCILIATION':computed;
  const reviewErrors=validateGateAcceptance(claim,{
   eligible:eligible&&status===computed,
   expectedSha:carry&&gate.id==='A-19'?claim.acceptance_sha:
    carry&&['A-09','A-18'].includes(gate.id)?CUMULATIVE_CHECKPOINT:
    gate.id==='A-19'&&a19Approved?a19Target:(docsCarry||sec01Carry||qaBrowserCarry||loginCarry||hydrationCarry||clickCarry||profileCarry||consentCarry||alertCarry)&&gate.id==='A-15'?DOCS_CHECKPOINT:expectedSha,now,
   providerApproved:carry&&CUMULATIVE_GATES.includes(gate.id)||
    (gate.id==='A-19'?a19Approved:gate.id==='A-09'?providerA09Approved:gate.id==='A-15'?providerA15Approved:providerA18Approved),
  });
  if(reviewErrors.length)errors.push('invalid_gate_acceptance:'+gate.id+':'+reviewErrors.join(','));
  return {gate_id:gate.id,atomic_control_ids:gate.atomicCriteria,status,accepted:claim?.accepted===true&&reviewErrors.length===0,
   ...(gate.id==='A-19'&&a19Approved?{approval_url:carry?cumulativeReview.approvalUrl:a19Review.approvalUrl}:{})};
 });
 if(combined.length>0){
  const jointIds=jointRequired?['A-09','A-18','A-19']:['A-09','A-18'];
  if(errors.includes('combined_acceptance_claims_must_match')||
     jointIds.some(id=>!gateRows.find(gate=>gate.gate_id===id)?.accepted)){
   if(jointRequired)errors.push('joint_release_requires_all_three_gates');
   for(const gate of gateRows)if(jointIds.includes(gate.gate_id))gate.accepted=false;
  }
 }
 if(cumulative&&(!carry||CUMULATIVE_GATES.some(id=>!gateRows.find(gate=>gate.gate_id===id)?.accepted))){
  if(!errors.includes('cumulative_acceptance_requires_authenticated_release'))errors.push('cumulative_acceptance_requires_four_gates');
  for(const gate of gateRows)if(CUMULATIVE_GATES.includes(gate.gate_id))gate.accepted=false;
 }
 return {valid:errors.length===0,errors,summary:{controls_total:38,controls_pass:controls.filter(c=>c.status==='PASS').length,controls_blocked:controls.filter(c=>c.status==='BLOCKED').length,controls_not_verified:controls.filter(c=>c.status==='NOT_VERIFIED').length,controls_fail:controls.filter(c=>c.status==='FAIL').length,evidence_records:(index.evidence_records||[]).length,evidence_records_valid:(index.evidence_records||[]).filter(r=>validateEvidenceRecord(r,{expectedSha:recordSha(r),now}).length===0).length,gates_total:24,gates_eligible:gateRows.filter(g=>g.status==='ELIGIBLE_FOR_INDEPENDENT_REVIEW').length,gates_blocked:gateRows.filter(g=>g.status==='BLOCKED').length,gates_accepted:gateRows.filter(g=>g.accepted).length},controls,gates:gateRows};
}
async function main(){
 const args=process.argv.slice(2);
 const index=read(INDEX_PATH);
 const expectedSha=process.env.EVIDENCE_EXACT_SHA||index.source.commit_sha;
 const providerExpectedSha=process.env.EVIDENCE_EXACT_SHA;
 const options={expectedSha:providerExpectedSha,prNumber:process.env.EVIDENCE_PR_NUMBER,token:process.env.GITHUB_TOKEN};
 const cumulativeReview=index.cumulative_acceptance&&await verifyCumulativeRelease(index,options);
 const findGate=id=>(index.gates||[]).find(g=>g.gate_id===id);
 const a18=findGate('A-18'),a09=findGate('A-09'),a15=findGate('A-15'),a19=findGate('A-19');
 const providerA18Approved=!index.cumulative_acceptance&&a18?.accepted===true&&SHA40.test(providerExpectedSha||'')&&
  await verifyGitHubA18CurrentHead(a18,{expectedSha:providerExpectedSha,prNumber:options.prNumber,token:options.token});
 const providerA09Approved=!index.cumulative_acceptance&&a09?.accepted===true&&await verifyGitHubA09CurrentHead(a09,options);
 const providerA15Approved=!index.cumulative_acceptance&&a15?.accepted===true&&await verifyGitHubA15CurrentHead(a15,options);
 let a19Review=null;
 const a19Target=a19AncestryTarget(index.gates||[],{expectedSha});
 if(a19Target&&!index.cumulative_acceptance){
  const bytes=fs.readFileSync(path.join(ROOT,A19_PROOF));
  if(crypto.createHash('sha256').update(bytes).digest('hex')===a19.acceptance_evidence_sha256){
   const proof=JSON.parse(bytes.toString('utf8'));
   if(proof.schema==='risck-comply.g1.a19-ops02-acceptance-proof.v1'&&proof.gate_id==='A-19'&&
      proof.control_id==='OPS-02'&&proof.release_decision==='NO_GO'&&
      proof.qualified_review?.reviewer_login===QUALIFIED_REVIEWER&&proof.acceptance_source_sha===a19.acceptance_sha){
    a19Review=await verifyGitHubA19CurrentHead(proof,{
     ...options,jointReleaseSource:a19Target===expectedSha?null:a19Target,
    });
   }
  }
 }
 const result=reconcile({scope:read('config/g1-enterprise-scope-v1.json'),gates:read('config/g1-product-ready-24-gates.json'),
  index,expectedSha,providerA18Approved,providerA09Approved,providerA15Approved,a19Review,cumulativeReview});
 if(args.includes('--require-a19-review')&&a19Review?.state==='PENDING'){
  result.valid=false;
  result.errors.push('invalid_gate_acceptance:A-19:authenticated_current_head_review_required');
 }
 const dir=path.join(ROOT,'artifacts/enterprise-evidence-factory');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'progress-report.json'),JSON.stringify({...result,source_sha:expectedSha,
  ci_sha:process.env.GITHUB_SHA||null,generated_at:new Date().toISOString()},null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 if(!result.valid||(args.includes('--strict')&&result.summary.gates_accepted!==24))process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url)))main().catch(()=>{console.error('evidence_provider_validation_failed');process.exitCode=1;});
