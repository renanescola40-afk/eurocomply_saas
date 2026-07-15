import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  requirePermission: vi.fn(),
  requireTrustedMutation: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  createAuditEvent: vi.fn(),
  createAdminClient: vi.fn(),
  memberMaybeSingle: vi.fn(),
  rpc: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  publicStepUpSummary: vi.fn(),
}));

vi.mock('@/lib/security/validate', () => ({
  readBoundedJsonRequest: async (request: Request) => request.json(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/queries/audit-events', () => ({
  createAuditEvent: mocks.createAuditEvent,
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/security/api-guards', () => ({
  requireApiUser: mocks.requireApiUser,
  requirePermission: mocks.requirePermission,
  requireTrustedMutation: mocks.requireTrustedMutation,
  secureApiError: (error: { code?: string; status?: number }) =>
    new Response(JSON.stringify({ error: error.code ?? 'internal_server_error' }), {
      status: error.status ?? 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }),
}));

vi.mock('@/server/security/step-up', () => ({
  requireStepUpForRequest: mocks.requireStepUpForRequest,
  publicStepUpSummary: mocks.publicStepUpSummary,
}));

import { POST } from './route';

function buildRequest(role: 'owner' | 'admin' | 'editor' | 'member' | 'viewer') {
  return new Request('https://app.risckcomply.test/api/team/members/role', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.risckcomply.test',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({ memberId: 'member_b', role }),
  });
}

function member(role: string | null = 'member') {
  return {
    id: 'member_b',
    organization_id: 'org_a',
    user_id: 'user_b',
    role,
  };
}

describe('atomic team member role transition API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: 'user_admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a' });
    mocks.requirePermission.mockResolvedValue({ role: 'owner' });
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: { required: true, verifiedAt: '2026-07-15T11:00:00.000Z' },
    });
    mocks.publicStepUpSummary.mockReturnValue({ required: true, verified: true });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
    mocks.memberMaybeSingle.mockResolvedValue({ data: member(), error: null });

    const memberQuery = {
      eq: vi.fn(() => memberQuery),
      maybeSingle: mocks.memberMaybeSingle,
    };
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => memberQuery) })),
      rpc: mocks.rpc,
    });
  });

  it('writes success audit evidence only after the atomic RPC changes the role', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          outcome: 'changed',
          affected_member_id: 'member_b',
          affected_user_id: 'user_b',
          previous_role: 'member',
          applied_role: 'admin',
        },
      ],
      error: null,
    });

    const response = await POST(buildRequest('admin'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('change_organization_member_role_atomic', {
      p_organization_id: 'org_a',
      p_member_id: 'member_b',
      p_expected_role: 'member',
      p_next_role: 'admin',
    });
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_a',
        actorUserId: 'user_admin',
        action: 'team_member_role_changed',
        entityId: 'member_b',
        metadata: expect.objectContaining({
          changedUserId: 'user_b',
          previousRole: 'member',
          nextRole: 'admin',
        }),
      }),
    );
    expect(body).toMatchObject({ changed: true, role: 'admin', auditPersisted: true });
  });

  it('blocks atomic demotion of the final owner without success audit evidence', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: member('owner'), error: null });
    mocks.rpc.mockResolvedValue({
      data: [
        {
          outcome: 'last_owner',
          affected_member_id: 'member_b',
          affected_user_id: 'user_b',
          previous_role: 'owner',
          applied_role: null,
        },
      ],
      error: null,
    });

    const response = await POST(buildRequest('admin'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: 'last_owner_role_change_blocked' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('returns a stale-state conflict without success audit evidence', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          outcome: 'state_changed',
          affected_member_id: 'member_b',
          affected_user_id: 'user_b',
          previous_role: 'viewer',
          applied_role: null,
        },
      ],
      error: null,
    });

    const response = await POST(buildRequest('admin'));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'team_member_state_changed' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('does not invoke the RPC for a same-role no-op', async () => {
    const response = await POST(buildRequest('member'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ changed: false, role: 'member' });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('fails closed when the atomic RPC is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });

    const response = await POST(buildRequest('admin'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'team_role_change_failed' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });
});
