/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ADMIN = '00000000-0000-4000-8000-000000000001';
const USER_REMOVED = '00000000-0000-4000-8000-000000000002';
const ORGANIZATION_A = '00000000-0000-4000-8000-000000000003';
const MEMBER_1 = '00000000-0000-4000-8000-000000000004';
const OTHER_TENANT_MEMBER = '00000000-0000-4000-8000-000000000005';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  requirePermission: vi.fn(),
  requireTrustedMutation: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  createAuditEvent: vi.fn(),
  createAdminClient: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  publicStepUpSummary: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/server/security/api-guards', () => ({
  requireApiUser: mocks.requireApiUser,
  requirePermission: mocks.requirePermission,
  requireTrustedMutation: mocks.requireTrustedMutation,
  secureApiError: (error: unknown) =>
    new Response(JSON.stringify({ error: error instanceof Error ? 'internal_server_error' : 'unknown' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }),
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/queries/audit-events', () => ({
  createAuditEvent: mocks.createAuditEvent,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/security/step-up', () => ({
  requireStepUpForRequest: mocks.requireStepUpForRequest,
  publicStepUpSummary: mocks.publicStepUpSummary,
}));

import { POST } from './route';

function buildRequest(body: unknown) {
  return new Request('https://app.eurocomply.test/api/team/members/remove', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.eurocomply.test',
    },
    body: JSON.stringify(body),
  });
}

function installSupabaseMock(memberResult: unknown, removalResult: unknown = null) {
  const builder = {
    select: mocks.select,
    eq: mocks.eq,
    maybeSingle: mocks.maybeSingle,
  };

  mocks.select.mockReturnValue(builder);
  mocks.eq.mockReturnValue(builder);
  mocks.maybeSingle.mockResolvedValue(memberResult);
  mocks.rpc.mockResolvedValue(
    removalResult ?? {
      data: [
        {
          outcome: 'removed',
          affected_member_id: MEMBER_1,
          affected_user_id: USER_REMOVED,
          previous_role: 'viewer',
        },
      ],
      error: null,
    },
  );
  mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => builder), rpc: mocks.rpc });

  return builder;
}

describe('team member removal API hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: USER_ADMIN });
    mocks.requirePermission.mockResolvedValue({ role: 'admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: ORGANIZATION_A });
    mocks.requireStepUpForRequest.mockResolvedValue({ ok: true, assessment: { required: false } });
    mocks.publicStepUpSummary.mockReturnValue({ required: false });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
  });

  it('blocks requests without organization context', async () => {
    mocks.getCurrentOrganizationForUser.mockResolvedValue(null);

    const response = await POST(buildRequest({ memberId: MEMBER_1 }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'organization_required' });
  });

  it('rejects malformed member IDs before creating a Supabase client', async () => {
    const response = await POST(buildRequest({ memberId: 'not-a-uuid' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'invalid_team_member_payload' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('does not remove a member when the id is not owned by the current tenant', async () => {
    installSupabaseMock({ data: null, error: null });

    const response = await POST(buildRequest({ memberId: OTHER_TENANT_MEMBER }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'team_member_not_found' });
    expect(mocks.eq).toHaveBeenCalledWith('id', OTHER_TENANT_MEMBER);
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_A);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('invokes the atomic removal RPC with tenant and expected state before auditing success', async () => {
    installSupabaseMock({
      data: {
        id: MEMBER_1,
        user_id: USER_REMOVED,
        role: 'viewer',
        organization_id: ORGANIZATION_A,
      },
      error: null,
    });

    const response = await POST(buildRequest({ memberId: MEMBER_1 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ removed: true, auditPersisted: true });
    expect(mocks.rpc).toHaveBeenCalledWith('remove_organization_member_atomic', {
      p_organization_id: ORGANIZATION_A,
      p_member_id: MEMBER_1,
      p_expected_user_id: USER_REMOVED,
      p_expected_role: 'viewer',
    });
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_A,
        actorUserId: USER_ADMIN,
        action: 'team_member_removed',
        entityId: MEMBER_1,
      }),
    );
  });

  it('rejects stale state without writing success audit evidence', async () => {
    installSupabaseMock(
      {
        data: {
          id: MEMBER_1,
          user_id: USER_REMOVED,
          role: 'viewer',
          organization_id: ORGANIZATION_A,
        },
        error: null,
      },
      {
        data: [
          {
            outcome: 'state_changed',
            affected_member_id: MEMBER_1,
            affected_user_id: USER_REMOVED,
            previous_role: 'admin',
          },
        ],
        error: null,
      },
    );

    const response = await POST(buildRequest({ memberId: MEMBER_1 }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'team_member_state_changed' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('blocks final-owner removal without writing success audit evidence', async () => {
    installSupabaseMock(
      {
        data: {
          id: MEMBER_1,
          user_id: USER_REMOVED,
          role: 'owner',
          organization_id: ORGANIZATION_A,
        },
        error: null,
      },
      {
        data: [
          {
            outcome: 'last_owner',
            affected_member_id: MEMBER_1,
            affected_user_id: USER_REMOVED,
            previous_role: 'owner',
          },
        ],
        error: null,
      },
    );

    const response = await POST(buildRequest({ memberId: MEMBER_1 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: 'last_owner_removal_blocked' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });
});
