import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateGateAcceptance } from '../../scripts/enterprise-evidence/validate-evidence.mjs';

// This child branch tests the unchanged #2620 reviewed source, NOT a new gate
// acceptance. The actual native GitHub review is authenticated separately;
// CI has no private GitHub token and never manufactures a provider response.
const REVIEWED_PR_HEAD='33bf1a7897a73b3198a9a3506ef2b7ec1444d529';
const FROZEN_SOURCE='e3163b677b4fec76f4c388327d849acb4b09732c';
const PROOF_PATH='docs/enterprise/gate-closure-v27/A18_OPS01_FORMAL_ACCEPTANCE_PROOF_20261105.json';
const INDEX_PATH='docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const gate=read(INDEX_PATH).gates.find(x=>x.gate_id==='A-18');
const proof=read(PROOF_PATH);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();

test('child source is one immediate commit after the independently approved unchanged PR #2620 head',()=>{
 assert.equal(git('rev-parse','HEAD^'),REVIEWED_PR_HEAD);
 assert.equal(git('rev-parse','HEAD').length,40);
});
test('A18 accepted ledger proof is locked to the qualified original review and scope',()=>{
 assert.equal(gate.gate_id,'A-18');
 assert.equal(gate.accepted,true);
 assert.equal(gate.reviewer_id,'renansilva2002-tech');
 assert.equal(gate.acceptance_sha,FROZEN_SOURCE);
 assert.equal(gate.acceptance_evidence_ref,PROOF_PATH);
 assert.equal(proof.acceptance_source_sha,FROZEN_SOURCE);
 assert.equal(proof.gate_id,'A-18');
 assert.equal(proof.control_id,'OPS-01');
 assert.equal(proof.qualified_review.reviewer_login,gate.reviewer_id);
 assert.equal(proof.qualified_review.review_url,gate.approval_url);
 assert.equal(proof.claim_scope,'ONLY_CURRENT_PRODUCTION_DEPLOYMENT_IDENTITY_NOT_FULL_RELEASE_GO');
});
test('A18 evidence SHA256 is the actual immutable proof file digest',()=>{
 const bytes=readFileSync(PROOF_PATH);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),gate.acceptance_evidence_sha256);
});
test('frozen qualified source to reviewed PR head changes only the proof and ledger index',()=>{
 assert.equal(git('merge-base',FROZEN_SOURCE,REVIEWED_PR_HEAD),FROZEN_SOURCE);
 const names=git('diff','--no-ext-diff','--name-only','--no-renames',FROZEN_SOURCE,REVIEWED_PR_HEAD,'--').split('\n').filter(Boolean).sort();
 assert.deepEqual(names,[INDEX_PATH,PROOF_PATH].sort());
});
test('source validator fails closed when the authenticated exact-head GitHub review is missing',()=>{
 const errors=validateGateAcceptance(gate,{
  eligible:true,expectedSha:REVIEWED_PR_HEAD,providerApproved:false
 });
 assert.ok(errors.includes('authenticated_current_head_review_required'));
});
test('source and proof are structurally reviewable but a mocked provider flag is not real provider acceptance',()=>{
 const metadataErrors=validateGateAcceptance(gate,{
  eligible:true,expectedSha:REVIEWED_PR_HEAD,providerApproved:true
 });
 assert.deepEqual(metadataErrors,[]);
 // This test is only a metadata dry-run. It MUST NOT record an A-18 PASS,
 // pretend to authenticate reviewer status or authorize production.
 assert.equal(proof.scope_limitations.includes('Provider READY/domain ID is not runtime health or customer E2E'),true);
 assert.match(proof.governance_status,/CI_AND_POST_MERGE_PROVIDER_TESTS_NOT_RUN/);
});
