import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveAuthorityBinding,
  resolveCompatibilityPromotionRunId,
} from '../../scripts/security/run-supabase-live-tenant-isolation.mjs';

test('accepts governed reattestation authority and exposes only the compatibility numeric guard', () => {
  const result = resolveAuthorityBinding({
    AUTHORITY_MODE: 'reattestation',
    AUTHORITY_RUN_ID: '35130405175',
    INPUT_CONFIRMATION: 'EXECUTE_POST_REATTESTATION_RUNTIME_PROOF',
  });

  assert.equal(result.valid, true);
  assert.equal(result.mode, 'reattestation');
  assert.equal(result.runId, '35130405175');
  assert.equal(result.compatibilityPromotionRunId, '35130405175');
});

test('uses the validated baseline promotion run for the v4 compatibility guard during reattestation', () => {
  const authority = resolveAuthorityBinding({
    AUTHORITY_MODE: 'reattestation',
    AUTHORITY_RUN_ID: '35130405175',
    INPUT_CONFIRMATION: 'EXECUTE_POST_REATTESTATION_RUNTIME_PROOF',
  });
  const compatibility = resolveCompatibilityPromotionRunId(authority, {
    PROMOTION_LINEAGE_RUN_ID: '34762383849',
  });

  assert.equal(compatibility.valid, true);
  assert.equal(compatibility.runId, '34762383849');
});

test('fails closed when reattestation source validation did not bind a baseline promotion lineage', () => {
  const authority = resolveAuthorityBinding({
    AUTHORITY_MODE: 'reattestation',
    AUTHORITY_RUN_ID: '35130405175',
    INPUT_CONFIRMATION: 'EXECUTE_POST_REATTESTATION_RUNTIME_PROOF',
  });
  const compatibility = resolveCompatibilityPromotionRunId(authority, {});

  assert.equal(compatibility.valid, false);
  assert.match(compatibility.reason, /validated baseline promotion lineage is not bound/);
});

test('rejects reattestation authority without the exact confirmation', () => {
  const result = resolveAuthorityBinding({
    AUTHORITY_MODE: 'reattestation',
    AUTHORITY_RUN_ID: '35130405175',
    INPUT_CONFIRMATION: 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF',
  });

  assert.equal(result.valid, false);
  assert.match(result.reason, /reattestation authority confirmation is invalid/);
});

test('accepts governed promotion authority when run ids and confirmation agree', () => {
  const result = resolveAuthorityBinding({
    AUTHORITY_MODE: 'promotion',
    AUTHORITY_RUN_ID: '34762383849',
    PROMOTION_RUN_ID: '34762383849',
    INPUT_CONFIRMATION: 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF',
  });

  assert.equal(result.valid, true);
  assert.equal(result.mode, 'promotion');
  assert.equal(result.runId, '34762383849');
  const compatibility = resolveCompatibilityPromotionRunId(result, {});
  assert.equal(compatibility.valid, true);
  assert.equal(compatibility.runId, '34762383849');
});

test('rejects conflicting promotion and authority run ids', () => {
  const result = resolveAuthorityBinding({
    AUTHORITY_MODE: 'promotion',
    AUTHORITY_RUN_ID: '34762383849',
    PROMOTION_RUN_ID: '123',
    INPUT_CONFIRMATION: 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF',
  });

  assert.equal(result.valid, false);
  assert.match(result.reason, /run IDs do not match/);
});

test('retains the legacy promotion-only binding for existing callers', () => {
  const result = resolveAuthorityBinding({ PROMOTION_RUN_ID: '34762383849' });

  assert.equal(result.valid, true);
  assert.equal(result.mode, 'legacy-promotion');
  assert.equal(result.runId, '34762383849');
  const compatibility = resolveCompatibilityPromotionRunId(result, {});
  assert.equal(compatibility.valid, true);
  assert.equal(compatibility.runId, '34762383849');
});

test('does not accept an arbitrary authority run without an authority mode', () => {
  const result = resolveAuthorityBinding({ AUTHORITY_RUN_ID: '35130405175' });

  assert.equal(result.valid, false);
  assert.match(result.reason, /governed authority run is not bound/);
});
