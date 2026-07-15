import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ADMIN = '00000000-0000-4000-8000-000000000011';
const USER_B = '00000000-0000-4000-8000-000000000012';
const ORGANIZATION_A = '00000000-0000-4000-8000-000000000013';
const MEMBER_B = '00000000-0000-4000-8000-000000000014';

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
  readBoundedJsonRequest: async (request: Request) => JSON.parse(await request.text()),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/server/queries/audit-events', () => ({ createAuditEvent: mocks.createAuditEvent }));
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

type Role = 'owner' | 'admin' | 'editor' | 'member' | 'viewer';

function buildRequest(role: Role, memberId = MEMBER_B) {
  return new Request('https://app.risckcomply.test/api/team/members/role', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.risckcomply.test',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({ memberId, role }),
  });
}

function member(role: string | null = 'member') {
  return { id: MEMBER_B, organization_id: ORGANIZATION_A, user_id: USER_B, role };
}

function rpcResult(
  outcome: 'changed' | 'last_owner' | 'state_changed',
  previousRole: string,
  appliedRole: string | null,
) {
  return {
    data: [
      {
        outcome,
        affected_member_id: MEMBER_B,
        affected_user_id: USER_B,
        previous_role: previousRole,
        applied_role: appliedRole,
      },
    ],
    error: null,
  };
}

describe('atomic team member role transition API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: USER_ADMIN });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: ORGANIZATION_A });
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

  it('rejects malformed member IDs before creating a Supabase client', async () => {
    const response = await POST(buildRequest('admin', 'not-a-uuid'));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ error: 'invalid_team_role_payload' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('writes success audit evidence only after the atomic RPC changes the role', async () => {
    mocks.rpc.mockResolvedValue(rpcResult('changed', 'member', 'admin'));

    const response = await POST(buildRequest('admin'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('change_organization_member_role_atomic', {
      p_organization_id: ORGANIZATION_A,
      p_member_id: MEMBER_B,
      p_expected_role: 'member',
      p_next_role: 'admin',
    });
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_A,
        actorUserId: USER_ADMIN,
        action: 'team_member_role_changed',
        entityId: MEMBER_B,
        metadata: expect.objectContaining({
          changedUserId: USER_B,
          previousRole: 'member',
          nextRole: 'admin',
        }),
      }),
    );
    expect(body).toMatchObject({ changed: true, role: 'admin', auditPersisted: true });
  });

  it('blocks atomic demotion of the final owner without success audit evidence', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: member('owner'), error: null });
    mocks.rpc.mockResolvedValue(rpcResult('last_owner', 'owner', null));

    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'last_owner_role_change_blocked' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('returns a stale-state conflict without success audit evidence', async () => {
    mocks.rpc.mockResolvedValue(rpcResult('state_changed', 'viewer', null));

    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'team_member_state_changed' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('does not invoke the RPC for a same-role no-op', async () => {
    const response = await POST(buildRequest('member'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ changed: false, role: 'member' });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('fails closed when the atomic RPC is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });

    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'team_role_change_failed' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });
});
