#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluateG1Scope } from '../release/verify-g1-enterprise-scope.mjs';
const ROOT=process.cwd(), ALLOWED=new Set(['PASS','FAIL','BLOCKED','NOT_VERIFIED','NOT_APPLICABLE']), SHA40=/^[a-f0-9]{40}$/, SHA256=/^[a-f0-9]{64}$/;
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));

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
 const prSpecified=prNumber!==null&&prNumber!==undefined&&String(prNumber).trim()!=='';
 const n=Number(prNumber);
 if(prSpecified&&(!Number.isSafeInteger(n)||n<1))return false;
 const url=/^https:\/\/github\.com\/renanescola40-afk\/eurocomply_saas\/pull\/(\d+)#pullrequestreview-(\d+)$/.exec(gate.approval_url||'');
 if(!url||gate.reviewer_id!=='renansilva2002-tech')return false;
 const oldPr=Number(url[1]),oldId=Number(url[2]);
 // Immutable historical A-18 review. Committed metadata cannot select an outbound GitHub API URL.
 if(oldPr!==2610||oldId!==5784789887)return false;
 const rootDir=path.resolve(root),proofPath=path.resolve(rootDir,gate.acceptance_evidence_ref||'');
 if(!proofPath.startsWith(rootDir+path.sep))return false;
 const api='https://api.github.com/repos/renanescola40-afk/eurocomply_saas';
 const readProvider=async(resource)=>{
  const res=await request(api+resource,{redirect:'error',headers:{
   Accept:'application/vnd.github+json',
   Authorization:'Bearer '+token,
   'X-GitHub-Api-Version':'2022-11-28'
  },signal:AbortSignal.timeout(10000)});
  if(!res?.ok)throw Error('provider_readback_unavailable');
  return res.json();
 };
 try{
  const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));
  if(proof.gate_id!=='A-18'||proof.qualified_review?.reviewer_login!==gate.reviewer_id||
     proof.qualified_review?.review_url!==gate.approval_url||
     proof.qualified_review?.reviewer_followup_comment_id!==6659265179)return false;
  let pull,reviewedHead,reviewPrNumber;
  if(prSpecified){
   pull=await readProvider('/pulls/'+n);
   if(pull?.state!=='open'||pull.head?.sha!==expectedSha)return false;
   reviewedHead=expectedSha;
   reviewPrNumber=n;
  }else{
   // GitHub must associate this EXACT commit with a single merged PR.
   // Never infer merge provenance from commit text, a local ledger or a stale URL.
   const associated=await readProvider('/commits/'+expectedSha+'/pulls?per_page=100');
   if(!Array.isArray(associated)||associated.length!==1)return false;
   pull=associated[0];
   if(pull?.state!=='closed'||!pull.merged_at||pull.merge_commit_sha!==expectedSha||
      !Number.isSafeInteger(pull.number)||pull.number<1||
      !SHA40.test(pull.head?.sha||''))return false;
   reviewedHead=pull.head.sha;
   reviewPrNumber=pull.number;
  }
  if(pull?.draft===true||
     pull.head?.repo?.full_name!=='renanescola40-afk/eurocomply_saas'||
     pull.base?.repo?.full_name!=='renanescola40-afk/eurocomply_saas'||
     pull.base?.ref!=='main'||pull.user?.login===gate.reviewer_id)return false;
  const [prior,followup,current]=await Promise.all([
   readProvider('/pulls/2610/reviews/5784789887'),
   readProvider('/issues/comments/6659265179),
   readProvider('/pulls/'+reviewPrNumber+'/reviews?per_page=100')
  ]);
  if(prior?.id!==oldId||prior.state!=='APPROVED'||
     prior.user?.login!==gate.reviewer_id||
     prior.commit_id!==proof.qualified_review.reviewed_head_sha||
     followup?.user?.login!==gate.reviewer_id||
     !/A-18\s*\/\s*OPS-01/i.test(followup.body||''))return false;
  // The native current-head approval is attested by the provider, not a
  // mutable review URL or an approval ID embedded before the review existed.
  return Array.isArray(current)&&current.some(r=>
   r?.state==='APPROVED'&&r.user?.login===gate.reviewer_id&&
   r.user?.login!==pull.user?.login&&r.commit_id===reviewedHead&&
   // Require an affirmative standalone gate decision rather than a mere mention.
   // A native APPROVED code review may explicitly withhold formal gate acceptance.
   typeof r.body==='string'&&
   r.body.split(/\r?\n/).some(line=>line.trim()==='A-18/OPS-01 FORMAL GATE ACCEPTANCE: APPROVED')&&
   !/(?:FORMAL GATE ACCEPTANCE|A-18\s*\/\s*OPS-01).{0,85}\b(?:NOT APPROVED|REJECTED|WITHHELD|DENIED|PENDING|BLOCKED)\b/i.test(r.body));
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
 const exec=args=>spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,windowsHide:true});
 const ancestor=exec(['merge-base','--is-ancestor',source,expectedSha]);
 if(ancestor.error||ancestor.status!==0)return false;
 const changed=exec(['diff','--no-ext-diff','--name-only','--no-renames','-z',source,expectedSha,'--']);
 if(changed.error||changed.status!==0||typeof changed.stdout!=='string')return false;
 const names=changed.stdout.split('\0').filter(Boolean);
 const allowed=new Set(['docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json',proof]);
 return names.length>0&&names.every(name=>allowed.has(name));
}

// A gate may claim acceptance only after ALL children pass and a separate
// qualified review is recorded against the exact SHA and digest-matched proof.
// This validates the ledger shape; the release reviewer must also independently
// verify the external approval URL against the provider.
export function validateGateAcceptance(gate,{eligible,expectedSha,now=new Date(),root=ROOT,providerApproved=false}={}){
 if(gate?.accepted!==true)return [];
 const errors=[];
 if(gate.gate_id==='A-18'&&providerApproved!==true)errors.push('authenticated_current_head_review_required');
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
     const proof=JSON.parse(proofBytes.toString('utf8'));
     if(!proof||typeof proof!=='object'||Array.isArray(proof)||
      !SHA40.test(proof.acceptance_source_sha||'')||
      proof.acceptance_source_sha!==gate.acceptance_sha||
      proof.gate_id!==gate.gate_id||
      proof.qualified_review?.reviewer_login!==gate.reviewer_id||
      proof.qualified_review?.review_url!==gate.approval_url){
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

export function reconcile({scope,gates,index,expectedSha,now=new Date(),providerA18Approved=false}){
 const errors=[];if(scope.mandatory.length!==38)errors.push('atomic_scope_must_equal_38');if(gates.groups.length!==24)errors.push('formal_gate_scope_must_equal_24');if(index.fixed_scope?.atomic_controls!==38||index.fixed_scope?.formal_gates!==24)errors.push('index_scope_mismatch');
 const ids=new Set(scope.mandatory.map(c=>c.id)), mappedIds=gates.groups.flatMap(g=>g.atomicCriteria), seen=new Set(), byControl=new Map();
 for(const id of ids){const n=mappedIds.filter(x=>x===id).length;if(n!==1)errors.push('control_must_map_to_exactly_one_gate:'+id);}
 for(const id of mappedIds)if(!ids.has(id))errors.push('gate_maps_unknown_control:'+id);
 for(const r of index.evidence_records||[]){if(seen.has(r.evidence_id))errors.push('duplicate_evidence_id:'+r.evidence_id);seen.add(r.evidence_id);if(!ids.has(r.control_id))errors.push('unknown_control:'+r.control_id);const mapped=gates.groups.filter(g=>g.atomicCriteria.includes(r.control_id)).map(g=>g.id);if(!mapped.includes(r.gate_id))errors.push('control_gate_mapping_mismatch:'+r.control_id);const boundSha=evidenceExpectedSha(r,{frozenSha:index.source?.commit_sha,candidateSha:expectedSha});const re=validateEvidenceRecord(r,{expectedSha:boundSha,now});if(re.length)errors.push(r.evidence_id+':'+re.join(','));if(!byControl.has(r.control_id))byControl.set(r.control_id,[]);byControl.get(r.control_id).push(r);}
 const g1SourceAdmission=evaluateG1Scope(scope,ROOT);
 if(!g1SourceAdmission.valid)errors.push('g1_source_acceptance_evidence_invalid');
 const controls=scope.mandatory.map(c=>{const rs=byControl.get(c.id)||[];const validPass=rs.some(r=>r.status==='PASS'&&r.reviewer_status==='ACCEPTED'&&r.acceptance_status==='ACCEPTED'&&validateEvidenceRecord(r,{expectedSha,now}).length===0);const sourceEvidenceValid=Array.isArray(c.evidenceRefs)&&c.evidenceRefs.length>0&&c.evidenceRefs.every(ref=>{if(typeof ref!=='string'||!ref.trim())return false;const p=path.resolve(ROOT,ref);return p.startsWith(ROOT+path.sep)&&fs.existsSync(p)&&fs.statSync(p).isFile();});const sourceAccepted=c.status==='PASS'&&typeof c.acceptedBy==='string'&&c.acceptedBy.trim().length>0&&Number.isFinite(Date.parse(c.acceptedAt||''))&&Date.parse(c.acceptedAt)<=now.getTime()&&sourceEvidenceValid&&g1SourceAdmission.valid&&g1SourceAdmission.passIds.includes(c.id);const status=c.status==='BLOCKED'?'BLOCKED':validPass||sourceAccepted?'PASS':rs.some(r=>r.status==='FAIL')?'FAIL':rs.some(r=>r.status==='BLOCKED')?'BLOCKED':c.status==='PASS'?'NOT_VERIFIED':c.status;if(c.status==='BLOCKED'&&validPass)errors.push('blocked_control_pass_claim_requires_source_reconciliation:'+c.id);if(c.status==='PASS'&&!sourceAccepted&&!validPass)errors.push('source_pass_unverified:'+c.id);return {control_id:c.id,status,source_status:c.status,evidence_count:rs.length,valid_pass_evidence:validPass};});
 const gateRows=gates.groups.map(g=>{const children=g.atomicCriteria.map(id=>controls.find(c=>c.control_id===id));const sourceGate=(index.gates||[]).find(x=>x.gate_id===g.id);const computed=children.length===g.atomicCriteria.length&&children.every(c=>c?.status==='PASS')?'ELIGIBLE_FOR_INDEPENDENT_REVIEW':children.some(c=>c?.status==='BLOCKED')?'BLOCKED':'NOT_ELIGIBLE';const status=sourceGate?.status==='REQUIRES_RECONCILIATION'?'REQUIRES_RECONCILIATION':computed;const reviewErrors=validateGateAcceptance(sourceGate,{eligible:computed==='ELIGIBLE_FOR_INDEPENDENT_REVIEW'&&status===computed,expectedSha,now,providerApproved:providerA18Approved});if(reviewErrors.length)errors.push('invalid_gate_acceptance:'+g.id+':'+reviewErrors.join(','));return {gate_id:g.id,atomic_control_ids:g.atomicCriteria,status,accepted:sourceGate?.accepted===true&&reviewErrors.length===0};});
 return {valid:errors.length===0,errors,summary:{controls_total:38,controls_pass:controls.filter(c=>c.status==='PASS').length,controls_blocked:controls.filter(c=>c.status==='BLOCKED').length,controls_not_verified:controls.filter(c=>c.status==='NOT_VERIFIED').length,controls_fail:controls.filter(c=>c.status==='FAIL').length,evidence_records:(index.evidence_records||[]).length,evidence_records_valid:(index.evidence_records||[]).filter(r=>validateEvidenceRecord(r,{expectedSha:evidenceExpectedSha(r,{frozenSha:index.source?.commit_sha,candidateSha:expectedSha}),now}).length===0).length,gates_total:24,gates_eligible:gateRows.filter(g=>g.status==='ELIGIBLE_FOR_INDEPENDENT_REVIEW').length,gates_blocked:gateRows.filter(g=>g.status==='BLOCKED').length,gates_accepted:gateRows.filter(g=>g.accepted).length},controls,gates:gateRows};
}
async function main(){const args=process.argv.slice(2),strict=args.includes('--strict'),index=read('docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json'),expectedSha=process.env.EVIDENCE_EXACT_SHA||index.source.commit_sha;const a18=(index.gates||[]).find(g=>g.gate_id==='A-18');const providerA18Approved=a18?.accepted===true&&await verifyGitHubA18CurrentHead(a18,{expectedSha,prNumber:process.env.EVIDENCE_PR_NUMBER,token:process.env.GITHUB_TOKEN});const result=reconcile({scope:read('config/g1-enterprise-scope-v1.json'),gates:read('config/g1-product-ready-24-gates.json'),index,expectedSha,providerA18Approved});const dir=path.join(ROOT,'artifacts/enterprise-evidence-factory');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'progress-report.json'),JSON.stringify({...result,source_sha:expectedSha,ci_sha:process.env.GITHUB_SHA||null,generated_at:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.valid||(strict&&result.summary.gates_accepted!==24))process.exitCode=1;}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url)))main().catch(()=>{console.error('evidence_provider_validation_failed');process.exitCode=1;});
