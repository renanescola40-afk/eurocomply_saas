import { describe, expect, it } from 'vitest';
import { getPlanLimit, getUpgradeReason, getUsagePercentage, isWithinPlanLimit } from './entitlements';

describe('billing entitlements', () => {
  it('returns configured limits for a plan', () => {
    expect(getPlanLimit('starter', 'users')).toBe(3);
    expect(getPlanLimit('growth', 'vendors')).toBe(50);
    expect(getPlanLimit('business', 'documents')).toBe(500);
  });

  it('blocks usage when the limit is reached', () => {
    expect(isWithinPlanLimit('starter', 'users', 2)).toBe(true);
    expect(isWithinPlanLimit('starter', 'users', 3)).toBe(false);
  });

  it('calculates usage percentage safely', () => {
    expect(getUsagePercentage('starter', 'documents', 5)).toBe(20);
    expect(getUsagePercentage('starter', 'documents', 100)).toBe(100);
  });

  it('returns clear upgrade reasons', () => {
    expect(getUpgradeReason('vendors')).toContain('vendors');
  });
});
