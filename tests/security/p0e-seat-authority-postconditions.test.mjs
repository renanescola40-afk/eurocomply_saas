import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = rel => readFileSync(fileURLToPath(new URL('../../' + rel, import.meta.url)), 'utf8');
const candidate = read('supabase/reconciliation/20261106_p0e_seat_release_actor_authority_candidate.sql');
const verify = read('scripts/security/verify-p0e-seat-release-actor-postconditions.sql');
const receipt = JSON.parse(read('docs/enterprise/phase1-v22/P0E_POSTCONDITIONS_AND_TWO_SESSION_LIMITS_20261106.json'));

test('fingerprints bind current production baseline and independently observed QA candidate', () => {
  assert.match(candidate, /d4714bb9382ae0322376ed433e859162/);
  assert.match(verify, /d14689e31afa4a7e8096fec686d39bd4/);
  assert.equal(receipt.verification.originalPublicRpcDefinitionMd5, 'd4714bb9382ae0322376ed433e859162');
  assert.equal(receipt.verification.candidatePublicRpcDefinitionMd5InRolledBackTransaction,
    'd14689e31afa4a7e8096fec686d39bd4');
});

test('postconditions are read-only and reject a stale, exposed or unexpected function', () => {
  assert.match(verify, /P0E_POSTCONDITION_EXACT_FUNCTION_IDENTITY_MISMATCH/);
  assert.match(verify, /P0E_POSTCONDITION_RPC_EXECUTE_ACL_UNSAFE/);
  assert.match(verify, /P0E_POSTCONDITION_AUTHORIZATION_OR_INVARIANT_MISSING/);
  assert.match(verify, /P0E_POSTCONDITION_ACTOR_GUARD_OR_LOCK_ORDER/);
  assert.match(verify, /has_function_privilege\('authenticated',v_fn,'EXECUTE'\)/);
  assert.doesNotMatch(verify, /^\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|TRUNCATE|COMMIT)\b/im);
});

test('candidate maintains service-only function access and confirms same-tenant actor', () => {
  assert.match(candidate, /actor.organization_id=p_organization_id/);
  assert.match(candidate, /actor.user_id=p_actor_user_id/);
  assert.match(candidate, /actor.status='active'/);
  assert.match(candidate, /in \('owner','admin'\)/);
  assert.match(candidate, /grant execute on function public.release_organization_seat_atomic\(uuid,uuid,uuid,text,text\) to service_role/);
  assert.match(candidate, /revoke execute on function public.release_organization_seat_atomic\(uuid,uuid,uuid,text,text\) from public,anon,authenticated/);
});

test('two-session result does not falsely assert actual overlapping concurrency', () => {
  assert.equal(receipt.twoSessionRehearsal.observedOperationsOverlapped, false);
  assert.equal(receipt.twoSessionRehearsal.qualifiedConcurrencyEvidence, false);
  assert.equal(receipt.twoSessionRehearsal.finalActiveOwners, 1);
  assert.equal(receipt.twoSessionRehearsal.finalActiveMemberCounter, 1);
  assert.equal(receipt.twoSessionRehearsal.finalLegacyAuditCount, 1);
});

test('verified synthetic cleanup and source receipts cannot be used to self-close an enterprise gate', () => {
  const c = receipt.twoSessionRehearsal.cleanup;
  for (const value of [
    c.verifiedResidualOrganizations, c.verifiedResidualMembers,
    c.verifiedResidualAuthUsers, c.verifiedResidualContracts,
  ]) assert.equal(value, 0);
  assert.equal(receipt.safety.productionWrites, 0);
  assert.equal(receipt.safety.formalGateAccepted, false);
});
