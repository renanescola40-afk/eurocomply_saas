import { describe, expect, it } from 'vitest';

import {
  createEnterpriseContractSchema,
  updateEnterpriseEntitlementsSchema,
} from '../../src/server/enterprise/contracts';

const entitlements = {
  memberLimit: 3000,
  fullUserLimit: 500,
  participantLimit: 2400,
  viewerLimit: 100,
  adminLimit: 25,
  legalEntityLimit: 5,
  aiSystemLimit: 1000,
  storageLimitBytes: 1_099_511_627_776,
  auditRetentionDays: 2555,
  ssoEnabled: true,
  scimEnabled: true,
  apiEnabled: true,
  webhooksEnabled: true,
  customRolesEnabled: true,
  advancedReportsEnabled: true,
  prioritySupportEnabled: true,
};

describe('enterprise contract validation', () => {
  it('accepts a complete negotiated annual contract', () => {
    const parsed = createEnterpriseContractSchema.safeParse({
      organizationId: '00000000-0000-4000-8000-000000000001',
      contractCode: 'EU-2026-0001',
      currency: 'eur',
      annualValueMinor: 3_000_000,
      startsAt: '2026-08-01T00:00:00.000Z',
      endsAt: '2027-07-31T23:59:59.000Z',
      renewsAt: '2027-08-01T00:00:00.000Z',
      paymentTermsDays: 30,
      gracePeriodDays: 14,
      ...entitlements,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.currency).toBe('EUR');
  });

  it('rejects seat-type limits that do not cover the total member limit', () => {
    const parsed = updateEnterpriseEntitlementsSchema.safeParse({
      contractId: '00000000-0000-4000-8000-000000000002',
      expectedVersion: 3,
      reason: 'Approved amendment',
      ...entitlements,
      memberLimit: 3001,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === 'memberLimit')).toBe(true);
    }
  });

  it('rejects an administrator limit above the total member limit', () => {
    const parsed = updateEnterpriseEntitlementsSchema.safeParse({
      contractId: '00000000-0000-4000-8000-000000000002',
      expectedVersion: 3,
      reason: 'Approved amendment',
      ...entitlements,
      memberLimit: 10,
      fullUserLimit: 10,
      participantLimit: 0,
      viewerLimit: 0,
      adminLimit: 11,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === 'adminLimit')).toBe(true);
    }
  });

  it('rejects a contract end before its start', () => {
    const parsed = createEnterpriseContractSchema.safeParse({
      organizationId: '00000000-0000-4000-8000-000000000001',
      contractCode: 'EU-2026-0002',
      currency: 'EUR',
      annualValueMinor: 3_000_000,
      startsAt: '2026-08-01T00:00:00.000Z',
      endsAt: '2026-07-31T23:59:59.000Z',
      paymentTermsDays: 30,
      gracePeriodDays: 14,
      ...entitlements,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === 'endsAt')).toBe(true);
    }
  });
});
