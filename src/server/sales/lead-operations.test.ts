import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkDistributedRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  logAuditEvent: vi.fn(),
  requireCurrentUser: vi.fn(),
  requirePlatformAdmin: vi.fn(),
  assertTrustedOrigin: vi.fn(),
  insertedActivities: [] as Array<Record<string, unknown>>,
  updatedLeads: [] as Array<Record<string, unknown>>,
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

vi.mock('@/server/queries/auth', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('@/server/security/platform-admin', () => ({
  requirePlatformAdmin: mocks.requirePlatformAdmin,
}));

vi.mock('@/server/security/origin-guard', () => ({
  assertTrustedOrigin: mocks.assertTrustedOrigin,
}));

import { createLeadNoteSchema, updateLeadStatus } from './lead-operations';

const leadId = '11111111-1111-4111-8111-111111111111';

function createSalesLeadsSelectChain() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: { id: leadId, status: 'new', priority: 'normal', next_follow_up_at: null },
      error: null,
    })),
  };
  return chain;
}

function createSalesLeadsUpdateChain(payload: Record<string, unknown>) {
  mocks.updatedLeads.push(payload);
  const chain = {
    eq: vi.fn(() => chain),
    is: vi.fn(async () => ({ error: null })),
  };
  return chain;
}

function createActivitiesInsertChain(payload: Record<string, unknown>) {
  mocks.insertedActivities.push(payload);
  const chain = {
    select: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: { id: 'activity-1' }, error: null })),
  };
  return chain;
}

function installSupabaseMock() {
  mocks.createAdminClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'sales_leads') {
        return {
          select: createSalesLeadsSelectChain().select,
          update: (payload: Record<string, unknown>) => createSalesLeadsUpdateChain(payload),
        };
      }

      if (table === 'sales_lead_activities') {
        return {
          insert: (payload: Record<string, unknown>) => createActivitiesInsertChain(payload),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  });
}

describe('Sales Console lead operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertedActivities.length = 0;
    mocks.updatedLeads.length = 0;
    mocks.assertTrustedOrigin.mockReturnValue(null);
    mocks.requireCurrentUser.mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' });
    mocks.requirePlatformAdmin.mockResolvedValue({ userId: '22222222-2222-4222-8222-222222222222', role: 'sales_admin', enabled: true });
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.logAuditEvent.mockResolvedValue(undefined);
    installSupabaseMock();
  });

  it('blocks access when platform admin permission is missing', async () => {
    mocks.requirePlatformAdmin.mockRejectedValueOnce(new Error('platform_admin_required'));
    const formData = new FormData();
    formData.set('leadId', leadId);
    formData.set('status', 'qualified');

    await expect(updateLeadStatus(new Request('https://risckcomply.test/admin/sales/leads'), formData)).rejects.toThrow('platform_admin_required');
  });

  it('records a status_change activity when status changes', async () => {
    const formData = new FormData();
    formData.set('leadId', leadId);
    formData.set('status', 'qualified');

    await updateLeadStatus(new Request('https://risckcomply.test/admin/sales/leads'), formData);

    expect(mocks.updatedLeads[0]).toMatchObject({ status: 'qualified' });
    expect(mocks.insertedActivities[0]).toMatchObject({
      lead_id: leadId,
      type: 'status_change',
      body: 'Status changed from new to qualified.',
    });
  });

  it('rejects notes above the internal body limit', () => {
    const result = createLeadNoteSchema.safeParse({ leadId, body: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });
});
