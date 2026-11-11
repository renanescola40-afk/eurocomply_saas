import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeDat01NativeReviews } from '../../scripts/diagnostics/dat01-review-submission-preflight.mjs';

const read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const triage=read('docs/enterprise/phase1-v22/recovered-provider-statements/case-review-triage-48.json');
const sha='617649987c8546a9dde0348adfbbd151214de9f1';
const c=triage.cases[0], ownerLogin='renanescola40-afk';
const makeBody = ({
  caseId=c.caseId, version=c.providerVersion, digest=c.appliedSqlSha256,
  target=sha, disposition='REMEDIATION REQUIRED', reviewer='renansilva2002-tech',
  replay='NOT GRANTED', rationale='The original whole source file has not been proven and the applied SQL requires independent RLS and ACL analysis before any authorized isolated replay is permitted.'
}={})=>[
  '**Review target SHA:** '+target,
  '**Case ID:** '+caseId,
  '**Provider migration version:** '+version,
  '**Source provenance:** Original complete historical source not verified; production applied statements recovered cryptographically, not a filename equivalence proof.',
  '**Version mapping:** Exact provider identity preserved; any historical source alias needs a distinct evidence-based approval.',
  '**Security assessment:** Requires review of global authenticated access, FORCE RLS, privilege grants and security of the applied policy semantics.',
  '**Evidence references:** https://github.com/renanescola40-afk/eurocomply_saas/pull/2642 ; applied SQL SHA256 '+digest,
  '**Independent disposition:** '+disposition,
  '**Technical rationale:** '+rationale,
  '**Reviewer:** '+reviewer,
  '**Review date:** 2026-11-07',
  '**Replay authorization:** '+replay,
  '**Formal A-12 acceptance:** PENDING',
].join('\n');
const native=(body=makeBody(), commit_id=sha,login='renansilva2002-tech',state='APPROVED')=>({
  body,commit_id,user:{login},state,submitted_at:'2026-11-07T16:54:22Z'
});
const run=reviews=>summarizeDat01NativeReviews({headSha:sha,triage,reviews,ownerLogin});
test('GitHub APPROVED review with unfilled copy/paste fields never closes any case',()=>{
  const template=makeBody().replace(c.caseId,'DAT01-[CASE NUMBER]').replace(c.providerVersion,'[VERSION]');
  const r=run([native(template)]);
  assert.equal(r.structurallyCompleteCaseSubmissions,0);
  assert.equal(r.remainingCasesWithoutStructuredSubmission,48);
  assert.equal(r.formalGateA12,'BLOCKED');
  assert.equal(r.rejectedSubmissionsByReason.PLACEHOLDERS_OR_EMPTY_BODY,1);
});
test('GitHub APPROVED empty body and an unrelated generic checkpoint do not count',()=>{
  const r=run([native(''),native('A-12 is BLOCKED. Evidence available: 34/34, 25/25.')]);
  assert.equal(r.structurallyCompleteCaseSubmissions,0);
});
test('review bound to earlier SHA is rejected even if all case fields filled',()=>{
  const r=run([native(makeBody(),'26750971a17e1f5e690cc0e3f0d20888c57df7ae')]);
  assert.equal(r.structurallyCompleteCaseSubmissions,0);
});
test('same owner account cannot self-approve via a filled review',()=>{
  const r=run([native(makeBody({reviewer:ownerLogin}),sha,ownerLogin)]);
  assert.equal(r.structurallyCompleteCaseSubmissions,0);
});
test('wrong provider version or review SHA cannot be attached to an existing case',()=>{
  assert.equal(run([native(makeBody({version:'20200101000000'}))]).structurallyCompleteCaseSubmissions,0);
  assert.equal(run([native(makeBody({target:'a'.repeat(40)}))]).structurallyCompleteCaseSubmissions,0);
});
test('insufficient rationale or missing exact applied SQL digest cannot count',()=>{
  assert.equal(run([native(makeBody({rationale:'looks good'}))]).structurallyCompleteCaseSubmissions,0);
  assert.equal(run([native(makeBody({digest:'0'.repeat(64)}))]).structurallyCompleteCaseSubmissions,0);
});
test('explicit NOT GRANTED is required for replay and formal A12 stays BLOCKED',()=>{
  assert.equal(run([native(makeBody({replay:'GRANTED'}))]).structurallyCompleteCaseSubmissions,0);
  const r=run([native()]);
  assert.equal(r.structurallyCompleteCaseSubmissions,1);
  assert.equal(r.formalGateA12,'BLOCKED');
  assert.equal(r.replayAuthorized,false);
  assert.equal(r.qualifiedTechnicalAcceptanceGranted,false);
  assert.equal(r.structurallyCompleteBlockedOrRemediation,1);
});
test('repeated completed native reviews for same case count only once',()=>{
  const r=run([native(),native()]);
  assert.equal(r.structurallyCompleteCaseSubmissions,1);
  assert.deepEqual(r.submittedCaseIds,[c.caseId]);
});
test('structured ACCEPTED does not equate to independent qualified case approval',()=>{
  const r=run([native(makeBody({disposition:'ACCEPTED WITH VERIFIED EVIDENCE'}))]);
  assert.equal(r.acceptedDispositionClaimsNotIndependentlyVerified,1);
  assert.equal(r.qualifiedTechnicalAcceptanceGranted,false);
  assert.equal(r.formalGateA12,'BLOCKED');
});
test('false input schema cannot hide case count or corrupt replay eligibility',()=>{
  assert.throws(()=>summarizeDat01NativeReviews({headSha:sha,triage:{cases:[]},reviews:[],ownerLogin}),/INVALID_INPUT/);
  const changed=structuredClone(triage);
  changed.cases[0].replayAuthorized=true;
  assert.throws(()=>summarizeDat01NativeReviews({headSha:sha,triage:changed,reviews:[],ownerLogin}),/BAD_CASE_MATRIX/);
});
