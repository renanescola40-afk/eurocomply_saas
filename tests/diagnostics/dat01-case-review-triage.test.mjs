import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDat01CaseTriage } from '../../scripts/diagnostics/dat01-case-review-triage.mjs';
import { validateDat01ProviderRecoveryBundle } from '../../scripts/diagnostics/dat01-provider-applied-snapshot.mjs';

const prefix='docs/enterprise/phase1-v22/recovered-provider-statements/';
const read=path=>JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
const inputs=()=>({
  manifest:read('docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json'),
  queue:read('docs/enterprise/phase1-v22/DAT01_PROVENANCE_REVIEW_DECISIONS_20261106.json'),
  crosswalk:read(prefix+'nonexact-crosswalk-25.json'),
  parts:[1,2,3,4,5].map(n=>read(prefix+'part-0'+n+'.json'))
});
const build=()=>buildDat01CaseTriage(inputs());

test('34 SQL bodies and 25 nonexact mappings have 48 exact, ordered review cases',()=>{
  const inData=inputs();
  assert.equal(validateDat01ProviderRecoveryBundle(inData).gateA12,'BLOCKED');
  const r=buildDat01CaseTriage(inData);
  assert.equal(r.counts.frozenLedger,137);
  assert.equal(r.counts.uniqueCaseReviews,48);
  assert.equal(r.counts.originalSourceReviews,34);
  assert.equal(r.counts.nonexactVersionReviews,25);
  assert.equal(r.counts.overlap,11);
  assert.equal(r.counts.qualifiedHumanDecisions,0);
  assert.equal(r.counts.authorizationToReplay,0);
  assert.equal(new Set(r.cases.map(x=>x.providerVersion)).size,48);
});
test('version-specific signals are visibly heuristics and do not declare a vulnerability',()=>{
  const r=build();
  assert.match(r.signalNotice,/do not establish a vulnerability/);
  assert.ok(r.cases.find(x=>x.providerVersion==='20260726070000').riskSignals.includes('HISTORICAL_RLS_DRIFT_REVIEW_REQUIRED'));
  assert.ok(r.cases.find(x=>x.providerVersion==='20261013133341').riskSignals.includes('SECURITY_DEFINER_PRESENT'));
  assert.ok(r.cases.find(x=>x.providerVersion==='20261013133341').consolidationGroup==='CONSOLIDATION_2');
});
test('no original provenance or version mapping is independently signed or replay-authorized',()=>{
  const r=build();
  assert.ok(r.cases.every(x=>x.humanReview.independentlyAccepted===false && x.replayAuthorized===false && x.humanReview.reviewerIdentity===null));
  assert.equal(r.formalGateA12,'BLOCKED');
  assert.equal(r.productionWrites,0);
  assert.equal(r.sqlReplayExecuted,false);
});
test('output is metadata-only and has no raw SQL statements or production connection string',()=>{
  const rendered=JSON.stringify(build());
  assert.doesNotMatch(rendered,/"statements"\s*:/);
  assert.doesNotMatch(rendered,/DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY|CREATE\s+POLICY\s+/i);
});
test('snapshot artifact equals deterministic source-only triage without 48 handcrafted decisions',()=>{
  const expected=read(prefix+'case-review-triage-48.json');
  assert.deepEqual(build(),expected);
});
test('tampered queue provider identity fails closed',()=>{
  const d=inputs();d.queue.decisions[0].providerVersion='20200101000000';
  assert.throws(()=>buildDat01CaseTriage(d),/DAT01_CASE_TRIAGE_QUEUE_IDENTITY_MISMATCH/);
});
test('tampered human signoff in original decision queue is rejected',()=>{
  const d=inputs();d.queue.decisions[0].independentReviewApproved=true;
  assert.throws(()=>buildDat01CaseTriage(d),/DAT01_CASE_TRIAGE_QUEUE_IDENTITY_MISMATCH/);
});
test('duplicate/repointed mapped version cannot pass coverage',()=>{
  const d=inputs();d.crosswalk.records[0].providerVersion=d.crosswalk.records[1].providerVersion;
  assert.throws(()=>buildDat01CaseTriage(d),/DAT01_CASE_TRIAGE_PROVIDER_COVERAGE|DAT01_CASE_TRIAGE_SOURCE_OR_MAPPING_DRIFT/);
});
test('provider SQL case metadata cannot be silently assigned to another version',()=>{
  const d=inputs();d.parts[0].records[0].providerVersion=d.parts[0].records[1].providerVersion;
  assert.throws(()=>buildDat01CaseTriage(d),/DAT01_CASE_TRIAGE_PROVIDER_COVERAGE|DAT01_CASE_TRIAGE_SOURCE_OR_MAPPING_DRIFT/);
});
test('missing case cannot reduce the 48 independent decisions',()=>{
  const d=inputs();d.queue.decisions.pop();
  assert.throws(()=>buildDat01CaseTriage(d),/DAT01_CASE_TRIAGE_FROZEN_INPUT_MISMATCH/);
});
