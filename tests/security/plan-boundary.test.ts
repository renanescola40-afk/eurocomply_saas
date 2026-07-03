import { describe, expect, it } from 'vitest';

import { isSelfServePlan } from '@/server/billing/plans';

describe('plan boundary', () => {
  it('checks checkout plan allowlist', () => {
    const blockedPlan = 'enterprise';
    expect(isSelfServePlan('starter')).toBe(true);
    expect(isSelfServePlan('growth')).toBe(true);
    expect(isSelfServePlan(blockedPlan)).toBe(false);
  });
});
