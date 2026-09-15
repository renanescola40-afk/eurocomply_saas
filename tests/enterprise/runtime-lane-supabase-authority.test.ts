import { describe, expect, it } from 'vitest';

import { RUNTIME_LANE_CONTRACTS, resolveLaneInputs } from '../../scripts/enterprise/runtime-lane-contracts.mjs';

const SHA = 'a'.repeat(40);
const lane = RUNTIME_LANE_CONTRACTS['TEN-RLS'];

describe('TEN-RLS Supabase authority resolution', () => {
  it('resolves a canonical promotion authority', () => {
    const inputs = resolveLaneInputs(lane.inputs, {
      releaseSha: SHA,
      recoveryRollbackConfirmation: '',
      supabasePromotionRunId: '12345',
      supabaseReattestationRunId: '',
    });
    expect(inputs).toEqual({
      release_sha: SHA,
      promotion_run_id: '12345',
      reattestation_run_id: '',
      confirmation: 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF',
    });
  });

  it('resolves a canonical read-only reattestation authority', () => {
    const inputs = resolveLaneInputs(lane.inputs, {
      releaseSha: SHA,
      recoveryRollbackConfirmation: '',
      supabasePromotionRunId: '',
      supabaseReattestationRunId: '67890',
    });
    expect(inputs).toEqual({
      release_sha: SHA,
      promotion_run_id: '',
      reattestation_run_id: '67890',
      confirmation: 'EXECUTE_POST_REATTESTATION_RUNTIME_PROOF',
    });
  });

  it('fails closed when neither authority is supplied', () => {
    expect(() => resolveLaneInputs(lane.inputs, {
      releaseSha: SHA,
      recoveryRollbackConfirmation: '',
      supabasePromotionRunId: '',
      supabaseReattestationRunId: '',
    })).toThrow(/Exactly one/);
  });

  it('fails closed when both authorities are supplied', () => {
    expect(() => resolveLaneInputs(lane.inputs, {
      releaseSha: SHA,
      recoveryRollbackConfirmation: '',
      supabasePromotionRunId: '12345',
      supabaseReattestationRunId: '67890',
    })).toThrow(/Exactly one/);
  });
});
