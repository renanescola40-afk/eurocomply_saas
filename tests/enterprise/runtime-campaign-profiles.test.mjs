import assert from 'node:assert/strict';
import test from 'node:test';

import { EXPECTED_RUNTIME_LANES } from '../../scripts/enterprise/runtime-lane-contracts.mjs';
import {
  FULL_PROMOTION_DECISION, FULL_RUNTIME_PROFILE, PARTIAL_SAFE_PROMOTION_DECISION,
  SAFE_PROMOTION_DECISION, SAFE_RUNTIME_EXCLUDED_LANES, SAFE_RUNTIME_LANES, SAFE_RUNTIME_PROFILE,
  allowedPromotionDecisionsForProfile, decisionForCampaignResults, expectedDecisionForProfile,
  expectedLanesForProfile, profileAllowsIncrementalPromotion, profileMayReuseExactShaRuns,
  profileRequiresRecoveryConfirmation, resolveRuntimeCampaignProfile,
} from '../../scripts/enterprise/runtime-campaign-profiles.mjs';

const complete = (id) => ({ id, status: 'complete' });
const blocked = (id) => ({ id, status: 'blocked' });

test('full profile preserves every registered runtime lane and remains all-or-nothing', () => {
  assert.equal(resolveRuntimeCampaignProfile('FULL'), FULL_RUNTIME_PROFILE);
  assert.deepEqual(expectedLanesForProfile(FULL_RUNTIME_PROFILE), EXPECTED_RUNTIME_LANES);
  assert.equal(expectedDecisionForProfile(FULL_RUNTIME_PROFILE), FULL_PROMOTION_DECISION);
  assert.deepEqual(allowedPromotionDecisionsForProfile(FULL_RUNTIME_PROFILE), [FULL_PROMOTION_DECISION]);
  assert.equal(decisionForCampaignResults(FULL_RUNTIME_PROFILE, EXPECTED_RUNTIME_LANES.map(complete)), FULL_PROMOTION_DECISION);
  assert.equal(decisionForCampaignResults(FULL_RUNTIME_PROFILE, [complete('IAM-RBAC'), blocked('RECOVERY')]), 'NO_GO');
  assert.equal(profileAllowsIncrementalPromotion(FULL_RUNTIME_PROFILE), false);
  assert.equal(profileRequiresRecoveryConfirmation(FULL_RUNTIME_PROFILE), true);
  assert.equal(profileMayReuseExactShaRuns(FULL_RUNTIME_PROFILE), false);
});

test('safe pre-promotion profile excludes TEN-RLS plus destructive/external lanes', () => {
  assert.equal(resolveRuntimeCampaignProfile('safe'), SAFE_RUNTIME_PROFILE);
  assert.deepEqual(SAFE_RUNTIME_EXCLUDED_LANES, ['TEN-RLS', 'RECOVERY', 'ASSURANCE']);
  assert.deepEqual(expectedLanesForProfile(SAFE_RUNTIME_PROFILE), SAFE_RUNTIME_LANES);
  assert.equal(SAFE_RUNTIME_LANES.length, EXPECTED_RUNTIME_LANES.length - 3);
  assert.equal(SAFE_RUNTIME_LANES.includes('TEN-RLS'), false);
  assert.equal(SAFE_RUNTIME_LANES.includes('RECOVERY'), false);
  assert.equal(SAFE_RUNTIME_LANES.includes('ASSURANCE'), false);
  assert.equal(expectedDecisionForProfile(SAFE_RUNTIME_PROFILE), SAFE_PROMOTION_DECISION);
  assert.deepEqual(allowedPromotionDecisionsForProfile(SAFE_RUNTIME_PROFILE), [SAFE_PROMOTION_DECISION, PARTIAL_SAFE_PROMOTION_DECISION]);
  assert.equal(profileAllowsIncrementalPromotion(SAFE_RUNTIME_PROFILE), true);
  assert.equal(profileRequiresRecoveryConfirmation(SAFE_RUNTIME_PROFILE), false);
  assert.equal(profileMayReuseExactShaRuns(SAFE_RUNTIME_PROFILE), true);
});

test('safe campaign permits incremental promotion only when at least one eligible lane completed', () => {
  assert.equal(decisionForCampaignResults(SAFE_RUNTIME_PROFILE, SAFE_RUNTIME_LANES.map(complete)), SAFE_PROMOTION_DECISION);
  assert.equal(decisionForCampaignResults(SAFE_RUNTIME_PROFILE, [complete('IAM-RBAC'), blocked('PLATFORM')]), PARTIAL_SAFE_PROMOTION_DECISION);
  assert.equal(decisionForCampaignResults(SAFE_RUNTIME_PROFILE, [blocked('IAM-RBAC'), blocked('PLATFORM')]), 'NO_GO');
  assert.equal(decisionForCampaignResults(SAFE_RUNTIME_PROFILE, []), 'NO_GO');
});

test('unknown campaign profile fails closed', () => {
  assert.throws(() => resolveRuntimeCampaignProfile('fast'), /Unsupported runtime campaign profile/);
});
