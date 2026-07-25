import { describe, expect, it } from 'vitest';

import {
  entitlementPayloadDigest,
  entitlementSnapshotSchema,
  validateEntitlementWindow,
} from './entitlement-reconciliation';

const base = {
  organizationId: '11111111-1111-4111-8111-111111111111',
  sourceId: '22222222-2222-4222-8222-222222222222',
  idempotencyKey: 'stripe:event:evt_123456',
  expectedSourceVersion: 3,
  planCode: 'enterprise-5000',
  fullSeatLimit: 5000,
  participantSeatLimit: 2500,
  viewerSeatLimit: 10000,
  entitlements: { scim: true, sso: true, auditRetentionDays: 365 },
  observedAt: '2026-07-24T18:00:00.000Z',
  validFrom: '2026-08-01T00:00:00.000Z',
  validUntil: '2027-08-01T00:00:00.000Z',
  actorUserId: null,
};

describe('enterprise entitlement reconciliation', () => {
  it('accepts explicit bounded seat limits and entitlements', () => {
    expect(entitlementSnapshotSchema.parse(base)).toEqual(base);
  });

  it('creates a deterministic digest independent of entitlement key order', () => {
    const first = entitlementPayloadDigest(base);
    const second = entitlementPayloadDigest({
      ...base,
      entitlements: { auditRetentionDays: 365, sso: true, scim: true },
    });
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
  });

  it('rejects negative limits and ambiguous unlimited values', () => {
    expect(() => entitlementSnapshotSchema.parse({ ...base, fullSeatLimit: -1 })).toThrow();
    expect(() => entitlementSnapshotSchema.parse({ ...base, fullSeatLimit: Number.POSITIVE_INFINITY })).toThrow();
  });

  it('fails closed on invalid validity windows', () => {
    expect(validateEntitlementWindow({ ...base, validUntil: '2026-07-01T00:00:00.000Z' })).toEqual({
      ok: false,
      reason: 'invalid_window',
    });
  });
});
