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
  nextLeadUpdateResult: null as null | { data: { id: string } | null; error: unknown },
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

import {
  assertSalesConsoleFormRequest,
  createLeadNote,
  createLeadNoteSchema,
  updateLeadFollowUp,
  updateLeadFollowUpSchema,
  updateLeadPrioritySchema,
  updateLeadStatus,
  updateLeadStatusSchema,
} from './lead-operations';

const leadId = '11111111-1111-4111-8111-111111111111';
const actorUserId = '22222222-2222-4222-8222-222222222222';

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
    is: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => {
      const result = mocks.nextLeadUpdateResult ?? { data: { id: leadId }, error: null };
      mocks.nextLeadUpdateResult = null;
      return result;
    }),
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

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe('Sales Console lead operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertedActivities.length = 0;
    mocks.updatedLeads.length = 0;
    mocks.nextLeadUpdateResult = null;
    mocks.assertTrustedOrigin.mockReturnValue(null);
    mocks.requireCurrentUser.mockResolvedValue({ id: actorUserId });
    mocks.requirePlatformAdmin.mockResolvedValue({ userId: actorUserId, role: 'sales_admin', enabled: true });
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.logAuditEvent.mockResolvedValue(undefined);
    installSupabaseMock();
  });

  it('blocks access when the user is not authenticated', async () => {
    mocks.requireCurrentUser.mockRejectedValueOnce(new Error('auth_required'));

    await expect(
      updateLeadStatus(
        new Request('https://risckcomply.test/admin/sales/leads'),
        formData({ leadId, status: 'qualified' }),
      ),
    ).rejects.toThrow('auth_required');
  });

  it('blocks access when platform admin permission is missing', async () => {
    mocks.requirePlatformAdmin.mockRejectedValueOnce(new Error('platform_admin_required'));

    await expect(
      updateLeadStatus(
        new Request('https://risckcomply.test/admin/sales/leads'),
        formData({ leadId, status: 'qualified' }),
      ),
    ).rejects.toThrow('platform_admin_required');
  });

  it('blocks changes from an untrusted origin before loading lead data', async () => {
    mocks.assertTrustedOrigin.mockReturnValueOnce(new Response(null, { status: 403 }));

    await expect(
      updateLeadStatus(
        new Request('https://evil.example/admin/sales/leads'),
        formData({ leadId, status: 'qualified' }),
      ),
    ).rejects.toThrow('Request origin is not trusted.');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('records a status_change activity when status changes', async () => {
    await updateLeadStatus(
      new Request('https://risckcomply.test/admin/sales/leads'),
      formData({ leadId, status: 'qualified' }),
    );

    expect(mocks.updatedLeads[0]).toMatchObject({ status: 'qualified', updated_by: actorUserId });
    expect(mocks.insertedActivities[0]).toMatchObject({
      lead_id: leadId,
      type: 'status_change',
      body: 'Status changed from new to qualified.',
    });
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'sales_lead.status_changed', entityId: leadId }));
  });

  it('does not record activity or audit evidence when the loaded status is stale', async () => {
    mocks.nextLeadUpdateResult = { data: null, error: null };

    await expect(
      updateLeadStatus(
        new Request('https://risckcomply.test/admin/sales/leads'),
        formData({ leadId, status: 'qualified' }),
      ),
    ).rejects.toThrow('Lead state changed. Refresh and try again.');

    expect(mocks.insertedActivities).toHaveLength(0);
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it('records a follow_up activity when follow-up is updated', async () => {
    await updateLeadFollowUp(
      new Request('https://risckcomply.test/admin/sales/leads'),
      formData({ leadId, nextFollowUpAt: '2026-07-02T10:30' }),
    );

    expect(mocks.updatedLeads[0]).toMatchObject({ next_follow_up_at: '2026-07-02T10:30:00.000Z' });
    expect(mocks.insertedActivities[0]).toMatchObject({ lead_id: leadId, type: 'follow_up' });
  });

  it('creates bounded internal notes as sales lead activity', async () => {
    await createLeadNote(
      new Request('https://risckcomply.test/admin/sales/leads'),
      formData({ leadId, body: 'Demo follow-up: asked for EU AI Act readiness package.' }),
    );

    expect(mocks.insertedActivities[0]).toMatchObject({
      lead_id: leadId,
      type: 'note',
      body: 'Demo follow-up: asked for EU AI Act readiness package.',
    });
    expect(mocks.updatedLeads[0]).toMatchObject({ updated_by: actorUserId });
  });

  it('rejects unsupported statuses and priorities', () => {
    expect(updateLeadStatusSchema.safeParse({ leadId, status: 'customer' }).success).toBe(false);
    expect(updateLeadPrioritySchema.safeParse({ leadId, priority: 'critical' }).success).toBe(false);
  });

  it('rejects invalid follow-up dates', () => {
    expect(updateLeadFollowUpSchema.safeParse({ leadId, nextFollowUpAt: 'not-a-date' }).success).toBe(false);
    expect(updateLeadFollowUpSchema.safeParse({ leadId, nextFollowUpAt: null }).success).toBe(true);
  });

  it('rejects notes above the internal body limit', () => {
    const result = createLeadNoteSchema.safeParse({ leadId, body: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('rejects oversized Sales Console form requests before parsing formData', () => {
    const request = new Request('https://risckcomply.test/admin/sales/leads', {
      method: 'POST',
      headers: { 'content-length': '8193' },
    });

    expect(() => assertSalesConsoleFormRequest(request)).toThrow('Sales Console request body is too large.');
  });
});
