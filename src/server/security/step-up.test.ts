import { describe, expect, it } from 'vitest';

import { assessStepUp, HIGH_RISK_ACTIONS, stepUpRequiredResponse } from './step-up';

describe('step-up authentication helper', () => {
  it('lists high-risk actions that require explicit policy review', () => {
    expect(HIGH_RISK_ACTIONS).toEqual(
      expect.arrayContaining(['export_data', 'manage_billing', 'manage_team', 'gdpr_delete', 'audit_chain_verify']),
    );
  });

  it('accepts a fresh verification timestamp', () => {
    const assessment = assessStepUp({
      action: 'export_data',
      verifiedAt: '2026-06-12T10:00:00.000Z',
      now: '2026-06-12T10:05:00.000Z',
    });

    expect(assessment).toMatchObject({ ok: true, action: 'export_data' });
    expect(assessment.expiresAt).toBe('2026-06-12T10:10:00.000Z');
  });

  it('rejects a missing verification timestamp', () => {
    expect(assessStepUp({ action: 'manage_billing', verifiedAt: null })).toMatchObject({
      ok: false,
      action: 'manage_billing',
      reason: 'missing_verification',
    });
  });

  it('rejects an invalid verification timestamp', () => {
    expect(assessStepUp({ action: 'manage_team', verifiedAt: 'not-a-date' })).toMatchObject({
      ok: false,
      action: 'manage_team',
      reason: 'invalid_verification',
    });
  });

  it('rejects an expired verification timestamp', () => {
    expect(
      assessStepUp({
        action: 'gdpr_delete',
        verifiedAt: '2026-06-12T10:00:00.000Z',
        now: '2026-06-12T10:11:00.000Z',
      }),
    ).toMatchObject({
      ok: false,
      action: 'gdpr_delete',
      reason: 'expired_verification',
    });
  });

  it('returns no-store headers for step-up required responses', () => {
    const response = stepUpRequiredResponse(
      assessStepUp({
        action: 'audit_chain_verify',
        verifiedAt: null,
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
  });
});
