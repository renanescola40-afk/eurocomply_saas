import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateVendor } from '@/server/actions/vendors';

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  assertCurrentUserCan: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  logAuditEvent: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('@/server/auth/permissions', () => ({
  assertCurrentUserCan: mocks.assertCurrentUserCan,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/actions/audit', () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const VENDOR_ID = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue({ id: USER_ID });
  mocks.assertCurrentUserCan.mockResolvedValue('owner');
  mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
  mocks.logAuditEvent.mockResolvedValue(undefined);
  mocks.reportError.mockReturnValue(undefined);
});

describe('vendor update audit coverage', () => {
  it('updates a vendor only after server-derived identity, write permission, rate limit and records vendor.update', async () => {
    const query: any = {};
    query.update = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.select = vi.fn(() => query);
    query.single = vi.fn().mockResolvedValue({
      data: {
        id: VENDOR_ID,
        name: 'Updated Processor',
        risk_level: 'high',
        review_status: 'approved',
      },
      error: null,
    });

    const from = vi.fn(() => query);
    mocks.createAdminClient.mockReturnValue({ from });

    await expect(
      updateVendor({
        vendorId: VENDOR_ID,
        organizationId: ORGANIZATION_ID,
        name: 'Updated Processor',
        website: 'https://processor.example',
        country: 'Portugal',
        category: 'subprocessor',
        dataAccessLevel: 'high',
        riskLevel: 'high',
        reviewStatus: 'approved',
        dpaSigned: true,
      }),
    ).resolves.toMatchObject({ id: VENDOR_ID });

    expect(mocks.requireCurrentUser).toHaveBeenCalledTimes(1);
    expect(mocks.assertCurrentUserCan).toHaveBeenCalledWith(ORGANIZATION_ID, USER_ID, 'vendors:write');
    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: `vendor.update:${ORGANIZATION_ID}:${USER_ID}`,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        action: 'vendor.update',
        failureMode: 'fail-closed',
      }),
    );
    expect(from).toHaveBeenCalledWith('vendors');
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Processor',
        website: 'https://processor.example',
        country: 'Portugal',
        category: 'subprocessor',
        data_access_level: 'high',
        dpa_signed: true,
        risk_level: 'high',
        review_status: 'approved',
      }),
    );
    expect(query.eq).toHaveBeenCalledWith('id', VENDOR_ID);
    expect(query.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        actorUserId: USER_ID,
        action: 'vendor.update',
        entityType: 'vendor',
        entityId: VENDOR_ID,
        metadata: expect.objectContaining({
          name: 'Updated Processor',
          riskLevel: 'high',
          reviewStatus: 'approved',
        }),
      }),
    );
  });
});
