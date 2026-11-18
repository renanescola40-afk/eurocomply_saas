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
  auditedAtomic: vi.fn(),
  createAdminClient: vi.fn(),
  memberMaybeSingle: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  publicStepUpSummary: vi.fn(),
}));

vi.mock('@/lib/security/validate', () => ({
  readBoundedJsonRequest: async (request: Request) => JSON.parse(await request.text()),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/server/queries/audit-events', () => ({
  changeMemberRoleWithChainedAuditAtomic: mocks.auditedAtomic,
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
  return { id: MEMBER_B, organization_id: ORGANIZATION_A, user_id: USER_B, role, status: 'active' };
}

function auditedResult(
  outcome: 'changed' | 'last_owner' | 'state_changed' | 'permission_denied' | 'member_inactive',
  previousRole = 'member',
  appliedRole: string | null = 'admin',
) {
  return {
    row: {
      outcome,
      affected_member_id: MEMBER_B,
      affected_user_id: USER_B,
      previous_role: previousRole,
      applied_role: appliedRole,
    },
    error: null,
  };
}

describe('single-transaction audited team member role API (mocked, not PostgreSQL integration)', () => {
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
    mocks.memberMaybeSingle.mockResolvedValue({ data: member(), error: null });
    mocks.auditedAtomic.mockResolvedValue(auditedResult('changed'));

    const memberQuery = {
      eq: vi.fn(() => memberQuery),
      maybeSingle: mocks.memberMaybeSingle,
    };
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => memberQuery) })),
    });
  });

  it('rejects malformed member IDs before constructing a database client or audit', async () => {
    const response = await POST(buildRequest('admin', 'not-a-uuid'));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ error: 'invalid_team_role_payload' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('requires Step-Up before any membership lookup or mutation', async () => {
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'step_up_required' }), { status: 403 }),
    });
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(403);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('does not change a role for a member outside the selected organization', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'team_member_not_found' });
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });


  it.each(['suspended', 'deprovisioned'])('rejects an inactive %s membership before audited RPC', async (status) => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: { ...member(), status }, error: null });
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: 'team_member_inactive' });
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('fails closed when a member status value is missing', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: { ...member(), status: null }, error: null });
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(409);
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('maps atomic row-lock status rejection to HTTP conflict', async () => {
    mocks.auditedAtomic.mockResolvedValue(auditedResult('member_inactive', 'member', null));
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: 'team_member_inactive' });
    expect(mocks.auditedAtomic).toHaveBeenCalledOnce();
  });

  it('returns success only for the signed audited-atomic changed outcome', async () => {
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(200);
    expect(mocks.auditedAtomic).toHaveBeenCalledOnce();
    expect(mocks.auditedAtomic).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_A,
      memberId: MEMBER_B,
      expectedUserId: USER_B,
      expectedRole: 'member',
      nextRole: 'admin',
      actorUserId: USER_ADMIN,
      metadata: {
        changedUserId: USER_B,
        previousRole: 'member',
        nextRole: 'admin',
        actorRole: 'owner',
        stepUpAction: 'manage_team',
      },
    });
    expect(await response.json()).toMatchObject({ changed: true, role: 'admin', auditPersisted: true });
  });

  it('blocks demotion of the final owner without reporting success', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: member('owner'), error: null });
    mocks.auditedAtomic.mockResolvedValue(auditedResult('last_owner', 'owner', null));
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'last_owner_role_change_blocked' });
    expect(mocks.auditedAtomic).toHaveBeenCalledOnce();
  });

  it('returns a conflict when target role changed between lookup and audited update', async () => {
    mocks.auditedAtomic.mockResolvedValue(auditedResult('state_changed', 'viewer', null));
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'team_member_state_changed' });
  });

  it('honors a same-role no-op without requiring a new signed audit', async () => {
    const response = await POST(buildRequest('member'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ changed: false, role: 'member' });
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('fails closed when audit persistence or its RPC is unavailable', async () => {
    mocks.auditedAtomic.mockResolvedValue({ row: null, error: 'atomic_audit_or_member_role_change_failed' });
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'team_role_change_audit_unavailable' });
  });

  it('returns forbidden when the audited transaction rejects actor authority', async () => {
    mocks.auditedAtomic.mockResolvedValue(auditedResult('permission_denied', 'member', null));
    const response = await POST(buildRequest('admin'));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'team_role_change_forbidden' });
  });

  it('does not let an administrator assign owner access', async () => {
    mocks.requirePermission.mockResolvedValue({ role: 'admin' });
    const response = await POST(buildRequest('owner'));
    expect(response.status).toBe(403);
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('returns a review conflict for a changed Clerk-only role without calling the audited RPC', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: { ...member(), user_id: null }, error: null });

    const response = await POST(buildRequest('admin'));

    expect(response.status).toBe(409);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ error: 'clerk_only_role_change_requires_review' });
    expect(mocks.requireApiUser).toHaveBeenCalledOnce();
    expect(mocks.requirePermission).toHaveBeenCalledOnce();
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledOnce();
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('keeps owner-only authorization ahead of the Clerk-only review conflict', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: { ...member('owner'), user_id: null }, error: null });
    mocks.requirePermission.mockResolvedValue({ role: 'admin' });

    const response = await POST(buildRequest('member'));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'owner_role_change_requires_owner',
      message: 'Only organization owners can grant or remove owner access.',
    });
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('returns a review conflict when an authorized owner tries to demote a Clerk-only owner', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: { ...member('owner'), user_id: null }, error: null });

    const response = await POST(buildRequest('member'));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'clerk_only_role_change_requires_review' });
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('preserves the unchanged-role no-op for Clerk-only members', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: { ...member(), user_id: null }, error: null });

    const response = await POST(buildRequest('member'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ changed: false, role: 'member' });
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('requires step-up before querying even a Clerk-only member', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: { ...member(), user_id: null }, error: null });
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'step_up_required' }), { status: 403 }),
    });

    const response = await POST(buildRequest('admin'));

    expect(response.status).toBe(403);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

  it('does not bypass the own-organization membership lookup for Clerk-only targets', async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await POST(buildRequest('admin'));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'team_member_not_found' });
    expect(mocks.auditedAtomic).not.toHaveBeenCalled();
  });

});
