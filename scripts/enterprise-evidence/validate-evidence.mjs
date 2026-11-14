#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

export function reconcile({scope,gates,index,expectedSha,now=new Date(),providerA18Approved=false,providerA09Approved=false,providerA15Approved=false,a19Review=null}){
 const errors=[];if(scope.mandatory.length!==38)errors.push('atomic_scope_must_equal_38');if(gates.groups.length!==24)errors.push('formal_gate_scope_must_equal_24');if(index.fixed_scope?.atomic_controls!==38||index.fixed_scope?.formal_gates!==24)errors.push('index_scope_mismatch');
 const qatGate=(index.gates||[]).find(gate=>gate.gate_id==='A-15'&&gate.accepted===true);
 const isQatPass=record=>record.control_id==='QAT-01'&&record.status==='PASS';
 const qatEvidenceMatches=record=>qatGate&&record.gate_id==='A-15'&&
  record.artifact_path===qatGate.acceptance_evidence_ref&&
  record.artifact_sha256===qatGate.acceptance_evidence_sha256&&
  sourceCommitIsReviewedAncestor(qatGate,{expectedSha});
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
 const a19Target=a19Candidate&&a19AncestryTarget(indexGates,{expectedSha});
 const a19Bound=Boolean(a19Target);
 if(jointRequired&&!a19Bound)errors.push('invalid_joint_release:A-19:source_or_artifact_mismatch');
 if(a19Bound&&!a19Review)errors.push('invalid_gate_acceptance:A-19:authenticated_current_head_review_required');
 const a19Approved=Boolean(a19Bound&&a19Review?.state==='APPROVED');
 for(const id of ids){const n=mappedIds.filter(x=>x===id).length;if(n!==1)errors.push('control_must_map_to_exactly_one_gate:'+id);}
 for(const id of mappedIds)if(!ids.has(id))errors.push('gate_maps_unknown_control:'+id);
 for(const r of index.evidence_records||[]){if(seen.has(r.evidence_id))errors.push('duplicate_evidence_id:'+r.evidence_id);seen.add(r.evidence_id);if(!ids.has(r.control_id))errors.push('unknown_control:'+r.control_id);const mapped=gates.groups.filter(g=>g.atomicCriteria.includes(r.control_id)).map(g=>g.id);if(!mapped.includes(r.gate_id))errors.push('control_gate_mapping_mismatch:'+r.control_id);const boundSha=recordSha(r);const re=validateEvidenceRecord(r,{expectedSha:boundSha,now});if(re.length)errors.push(r.evidence_id+':'+re.join(','));if(!byControl.has(r.control_id))byControl.set(r.control_id,[]);byControl.get(r.control_id).push(r);}
 const g1SourceAdmission=evaluateG1Scope(scope,ROOT);
 if(!g1SourceAdmission.valid)errors.push('g1_source_acceptance_evidence_invalid');
 const controls=scope.mandatory.map(c=>{const rs=byControl.get(c.id)||[];const validPass=(c.id==='OPS-02'&&a19Approved)||rs.some(r=>r.status==='PASS'&&r.reviewer_status==='ACCEPTED'&&r.acceptance_status==='ACCEPTED'&&(!isQatPass(r)||(providerA15Approved&&qatEvidenceMatches(r)))&&validateEvidenceRecord(r,{expectedSha:isQatPass(r)?recordSha(r):expectedSha,now}).length===0);const sourceEvidenceValid=Array.isArray(c.evidenceRefs)&&c.evidenceRefs.length>0&&c.evidenceRefs.every(ref=>{if(typeof ref!=='string'||!ref.trim())return false;const p=path.resolve(ROOT,ref);return p.startsWith(ROOT+path.sep)&&fs.existsSync(p)&&fs.statSync(p).isFile();});const sourceAccepted=c.status==='PASS'&&typeof c.acceptedBy==='string'&&c.acceptedBy.trim().length>0&&Number.isFinite(Date.parse(c.acceptedAt||''))&&Date.parse(c.acceptedAt)<=now.getTime()&&sourceEvidenceValid&&g1SourceAdmission.valid&&g1SourceAdmission.passIds.includes(c.id);const status=c.status==='BLOCKED'?'BLOCKED':validPass||sourceAccepted?'PASS':rs.some(r=>r.status==='FAIL')?'FAIL':rs.some(r=>r.status==='BLOCKED')?'BLOCKED':c.status==='PASS'?'NOT_VERIFIED':c.status;if(c.status==='BLOCKED'&&validPass)errors.push('blocked_control_pass_claim_requires_source_reconciliation:'+c.id);if(c.status==='PASS'&&!sourceAccepted&&!validPass)errors.push('source_pass_unverified:'+c.id);return {control_id:c.id,status,source_status:c.status,evidence_count:rs.length+(c.id==='OPS-02'&&a19Candidate?1:0),valid_pass_evidence:validPass};});
 if(combined.length>0&&!combinedClaimsMatch(indexGates,combined)){
  errors.push('combined_acceptance_claims_must_match');
 }
 const gateRows=gates.groups.map(gate=>{
  const children=gate.atomicCriteria.map(id=>controls.find(control=>control.control_id===id));
  let claim=indexGates.find(row=>row.gate_id===gate.id);
  if(gate.id==='A-19'&&a19Approved)claim={...a19Candidate,accepted:true,
   accepted_by:QUALIFIED_REVIEWER,reviewer_id:QUALIFIED_REVIEWER,reviewer_status:'ACCEPTED',
   acceptance_status:'ACCEPTED',approval_url:a19Review.approvalUrl,accepted_at:a19Review.acceptedAt};
  const eligible=children.length===gate.atomicCriteria.length&&children.every(control=>control?.status==='PASS');
  const computed=eligible?'ELIGIBLE_FOR_INDEPENDENT_REVIEW':
   children.some(control=>control?.status==='BLOCKED')?'BLOCKED':'NOT_ELIGIBLE';
  const status=claim?.status==='REQUIRES_RECONCILIATION'?'REQUIRES_RECONCILIATION':computed;
  const reviewErrors=validateGateAcceptance(claim,{
   eligible:eligible&&status===computed,expectedSha:gate.id==='A-19'&&a19Approved?a19Target:expectedSha,now,
   providerApproved:gate.id==='A-19'?a19Approved:gate.id==='A-09'?providerA09Approved:gate.id==='A-15'?providerA15Approved:providerA18Approved,
  });
  if(reviewErrors.length)errors.push('invalid_gate_acceptance:'+gate.id+':'+reviewErrors.join(','));
  return {gate_id:gate.id,atomic_control_ids:gate.atomicCriteria,status,accepted:claim?.accepted===true&&reviewErrors.length===0,
   ...(gate.id==='A-19'&&a19Approved?{approval_url:a19Review.approvalUrl}:{})};
 });
 if(combined.length>0){
  const jointIds=jointRequired?['A-09','A-18','A-19']:['A-09','A-18'];
  if(errors.includes('combined_acceptance_claims_must_match')||
     jointIds.some(id=>!gateRows.find(gate=>gate.gate_id===id)?.accepted)){
   if(jointRequired)errors.push('joint_release_requires_all_three_gates');
   for(const gate of gateRows)if(jointIds.includes(gate.gate_id))gate.accepted=false;
  }
 }
 return {valid:errors.length===0,errors,summary:{controls_total:38,controls_pass:controls.filter(c=>c.status==='PASS').length,controls_blocked:controls.filter(c=>c.status==='BLOCKED').length,controls_not_verified:controls.filter(c=>c.status==='NOT_VERIFIED').length,controls_fail:controls.filter(c=>c.status==='FAIL').length,evidence_records:(index.evidence_records||[]).length,evidence_records_valid:(index.evidence_records||[]).filter(r=>validateEvidenceRecord(r,{expectedSha:recordSha(r),now}).length===0).length,gates_total:24,gates_eligible:gateRows.filter(g=>g.status==='ELIGIBLE_FOR_INDEPENDENT_REVIEW').length,gates_blocked:gateRows.filter(g=>g.status==='BLOCKED').length,gates_accepted:gateRows.filter(g=>g.accepted).length},controls,gates:gateRows};
}
async function main(){
 const args=process.argv.slice(2);
 const index=read(INDEX_PATH);
 const expectedSha=process.env.EVIDENCE_EXACT_SHA||index.source.commit_sha;
 const providerExpectedSha=process.env.EVIDENCE_EXACT_SHA;
 const options={expectedSha:providerExpectedSha,prNumber:process.env.EVIDENCE_PR_NUMBER,token:process.env.GITHUB_TOKEN};
 const findGate=id=>(index.gates||[]).find(g=>g.gate_id===id);
 const a18=findGate('A-18'),a09=findGate('A-09'),a15=findGate('A-15'),a19=findGate('A-19');
 const providerA18Approved=a18?.accepted===true&&SHA40.test(providerExpectedSha||'')&&
  await verifyGitHubA18CurrentHead(a18,{expectedSha:providerExpectedSha,prNumber:options.prNumber,token:options.token});
 const providerA09Approved=a09?.accepted===true&&await verifyGitHubA09CurrentHead(a09,options);
 const providerA15Approved=a15?.accepted===true&&await verifyGitHubA15CurrentHead(a15,options);
 let a19Review=null;
 const a19Target=a19AncestryTarget(index.gates||[],{expectedSha});
 if(a19Target){
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
  index,expectedSha,providerA18Approved,providerA09Approved,providerA15Approved,a19Review});
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
