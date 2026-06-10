import { describe, expect, it } from 'vitest';
import { getRetentionSummary, getRetentionUntil, RETENTION_POLICIES } from './retention-policy';

describe('retention policy', () => {
  it('returns a complete enterprise readiness summary', () => {
    const summary = getRetentionSummary();

    expect(summary.totalPolicies).toBe(RETENTION_POLICIES.length);
    expect(summary.enterpriseReadyPolicies).toBe(RETENTION_POLICIES.length);
    expect(summary.readinessScore).toBe(100);
    expect(summary.minimumMonths).toBeGreaterThan(0);
    expect(summary.maximumMonths).toBeGreaterThan(summary.minimumMonths);
  });

  it('calculates retention until date for known categories', () => {
    const retainedUntil = getRetentionUntil('audit_events', '2026-01-01T00:00:00.000Z');

    expect(retainedUntil).toContain('2033');
  });

  it('returns null for unknown categories passed from untyped sources', () => {
    const retainedUntil = getRetentionUntil('unknown' as never, '2026-01-01T00:00:00.000Z');

    expect(retainedUntil).toBeNull();
  });
});
