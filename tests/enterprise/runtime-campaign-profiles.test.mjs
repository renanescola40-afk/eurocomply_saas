import assert from 'node:assert/strict';
import test from 'node:test';

import { EXPECTED_RUNTIME_LANES } from '../../scripts/enterprise/runtime-lane-contracts.mjs';
import {
  FULL_RUNTIME_PROFILE,
  SAFE_RUNTIME_EXCLUDED_LANES,
  SAFE_RUNTIME_LANES,
  SAFE_RUNTIME_PROFILE,
  expectedDecisionForProfile,
  expectedLanesForProfile,
  profileMayReuseExactShaRuns,
  profileRequiresRecoveryConfirmation,
  resolveRuntimeCampaignProfile,
} from '../../scripts/enterprise/runtime-campaign-profiles.mjs';

test('full profile preserves every registered runtime lane', () => {
  assert.equal(resolveRuntimeCampaignProfile('FULL'), FULL_RUNTIME_PROFILE);
  assert.deepEqual(expectedLanesForProfile(FULL_RUNTIME_PROFILE), EXPECTED_RUNTIME_LANES);
  assert.equal(expectedDecisionForProfile(FULL_RUNTIME_PROFILE), 'READY_FOR_EVIDENCE_PROMOTION');
  assert.equal(profileRequiresRecoveryConfirmation(FULL_RUNTIME_PROFILE), true);
  assert.equal(profileMayReuseExactShaRuns(FULL_RUNTIME_PROFILE), false);
});

test('safe profile excludes only recovery and external assurance', () => {
  assert.equal(resolveRuntimeCampaignProfile('safe'), SAFE_RUNTIME_PROFILE);
  assert.deepEqual(SAFE_RUNTIME_EXCLUDED_LANES, ['RECOVERY', 'ASSURANCE']);
  assert.deepEqual(expectedLanesForProfile(SAFE_RUNTIME_PROFILE), SAFE_RUNTIME_LANES);
  assert.equal(SAFE_RUNTIME_LANES.length, EXPECTED_RUNTIME_LANES.length - 2);
  assert.equal(SAFE_RUNTIME_LANES.includes('RECOVERY'), false);
  assert.equal(SAFE_RUNTIME_LANES.includes('ASSURANCE'), false);
  assert.equal(expectedDecisionForProfile(SAFE_RUNTIME_PROFILE), 'READY_FOR_SAFE_PROMOTION');
  assert.equal(profileRequiresRecoveryConfirmation(SAFE_RUNTIME_PROFILE), false);
  assert.equal(profileMayReuseExactShaRuns(SAFE_RUNTIME_PROFILE), true);
});

test('unknown campaign profile fails closed', () => {
  assert.throws(() => resolveRuntimeCampaignProfile('fast'), /Unsupported runtime campaign profile/);
});
