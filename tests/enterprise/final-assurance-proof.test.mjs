import assert from 'node:assert/strict';
import test from 'node:test';
import { validateFinalAssuranceBundle } from '../../scripts/enterprise/validate-final-assurance-bundle.mjs';
import { FINAL_ASSURANCE_CONTROL_IDS } from '../../scripts/enterprise/final-assurance-control-registry.mjs';
const SHA='a'.repeat(40); const REPOSITORY='renanescola40-afk/eurocomply_saas';
function item(id, checks, digestChar) { return { id, status:'Complete', outcome:'passed', assessedSha:'b'.repeat(40), artifactDigestSha256:digestChar.repeat(64), reviewedAt:'2026-07-01T00:00:00Z', validUntil:'2027-01-01T00:00:00Z', preparedBy:`${id}-owner`, reviewers:[`${id}-reviewer-a`,`${id}-reviewer-b`], assuranceProvider:`${id}-provider`, changeImpactReviewed:true, checks }; }
function bundle(){ return { schema:'risck-comply.final-assurance-bundle.v1', status:'Complete', repository:REPOSITORY, items:[
  item('external-security-review',{scopeReviewed:true,criticalFindingsClosed:true,highFindingsClosed:true,remediationVerified:true},'a'),
  item('release-approval',{changeScopeReviewed:true,rollbackReviewed:true,goNoGoApproved:true},'b'),
  item('legal-documents-review',{privacyReviewed:true,termsReviewed:true,dpaReviewed:true},'c'),
  item('edge-protection-review',{wafEnabled:true,cdnEnabled:true,ddosProtectionEnabled:true,productionHostnameCovered:true},'d'),
]}; }
test('accepts complete sanitized independent assurance metadata',()=>{ const e=validateFinalAssuranceBundle(bundle(),{targetSha:SHA,observedSha:SHA,repository:REPOSITORY,runId:'42',generatedAt:'2026-07-21T00:00:00Z',verifyAncestry:false}); assert.equal(e.status,'Complete'); assert.deepEqual(e.controlsVerified,[...FINAL_ASSURANCE_CONTROL_IDS]); assert.equal(e.failures.length,0); });
test('rejects self review and missing checks',()=>{ const b=bundle(); b.items[0].reviewers=[b.items[0].preparedBy,'other-reviewer']; b.items[2].checks.dpaReviewed=false; const e=validateFinalAssuranceBundle(b,{targetSha:SHA,observedSha:SHA,repository:REPOSITORY,runId:'42',generatedAt:'2026-07-21T00:00:00Z',verifyAncestry:false}); assert.equal(e.status,'Open'); assert.match(e.failures.join('\n'),/reviewer separation/); assert.match(e.failures.join('\n'),/dpaReviewed/); });
test('rejects secret-shaped metadata',()=>{ const b=bundle(); b.items[0].token='never-store-this'; const e=validateFinalAssuranceBundle(b,{targetSha:SHA,observedSha:SHA,repository:REPOSITORY,runId:'42',generatedAt:'2026-07-21T00:00:00Z',verifyAncestry:false}); assert.equal(e.status,'Open'); assert.match(e.failures.join('\n'),/secret-shaped/); });
