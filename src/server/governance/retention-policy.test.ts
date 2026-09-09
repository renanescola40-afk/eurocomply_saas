import { describe, expect, it } from 'vitest';
import { getRetentionSummary, getRetentionUntil, RETENTION_POLICIES } from './retention-policy';

describe('retention policy', () => {
  it('fails closed until retention targets are approved and enforcement-proven', () => {
    const summary = getRetentionSummary();

    expect(summary.totalPolicies).toBe(RETENTION_POLICIES.length);
    expect(summary.enterpriseReadyPolicies).toBe(0);
    expect(summary.readinessScore).toBe(0);
    expect(RETENTION_POLICIES.every((policy) => policy.status === 'draft')).toBe(true);
    expect(RETENTION_POLICIES.every((policy) => policy.enforcementStatus === 'not_proven')).toBe(true);
    expect(summary.minimumMonths).toBeGreaterThan(0);
    expect(summary.maximumMonths).toBeGreaterThan(summary.minimumMonths);
  });

  it('calculates only the date implied by a draft target for review planning', () => {
    const retainedUntil = getRetentionUntil('audit_events', '2026-01-01T00:00:00.000Z');

    expect(retainedUntil).toContain('2033');
  });

  it('returns null for unknown categories passed from untyped sources', () => {
    const retainedUntil = getRetentionUntil('unknown' as never, '2026-01-01T00:00:00.000Z');

    expect(retainedUntil).toBeNull();
  });
});
