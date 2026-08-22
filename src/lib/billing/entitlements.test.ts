import { describe, expect, it } from 'vitest';
import { getPlanLimit, getUpgradeReason, getUsagePercentage, isWithinPlanLimit } from './entitlements';

describe('billing entitlements', () => {
  it('returns canonical catalog limits for every legacy and current plan id', () => {
    expect(getPlanLimit('starter', 'users')).toBe(3);
    expect(getPlanLimit('essential', 'vendors')).toBe(0);
    expect(getPlanLimit('essential', 'risks')).toBe(0);
    expect(getPlanLimit('growth', 'vendors')).toBe(30);
    expect(getPlanLimit('professional', 'users')).toBe(15);
    expect(getPlanLimit('business', 'documents')).toBe(10000);
  });

  it('blocks usage when the canonical limit is reached', () => {
    expect(isWithinPlanLimit('starter', 'users', 2)).toBe(true);
    expect(isWithinPlanLimit('starter', 'users', 3)).toBe(false);
    expect(isWithinPlanLimit('starter', 'vendors', 0)).toBe(false);
  });

  it('calculates usage percentage safely', () => {
    expect(getUsagePercentage('starter', 'documents', 5)).toBe(5);
    expect(getUsagePercentage('starter', 'documents', 100)).toBe(100);
    expect(getUsagePercentage('starter', 'vendors', 0)).toBe(100);
  });

  it('returns clear upgrade reasons', () => {
    expect(getUpgradeReason('vendors')).toContain('vendors');
  });
});
