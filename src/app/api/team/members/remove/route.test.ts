// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  delete: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
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

function installSupabaseMock(memberResult: unknown) {
  const builder = {
    select: mocks.select,
    delete: mocks.delete,
    eq: mocks.eq,
    maybeSingle: mocks.maybeSingle,
  };

  mocks.select.mockReturnValue(builder);
  mocks.delete.mockReturnValue(builder);
  mocks.eq.mockReturnValue(builder);
  mocks.maybeSingle.mockResolvedValue(memberResult);
  mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => builder) });

  return builder;
}

describe('team member removal API hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: 'user_admin' });
    mocks.requirePermission.mockResolvedValue({ role: 'admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a' });
    mocks.requireStepUpForRequest.mockResolvedValue({ ok: true, assessment: { required: false } });
    mocks.publicStepUpSummary.mockReturnValue({ required: false });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
  });

  it('blocks requests without organization context', async () => {
    mocks.getCurrentOrganizationForUser.mockResolvedValue(null);

    const response = await POST(buildRequest({ memberId: 'member_1' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'organization_required' });
  });

  it('does not remove a member when the id is not owned by the current tenant', async () => {
    installSupabaseMock({ data: null, error: null });

    const response = await POST(buildRequest({ memberId: 'member_from_org_b' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'team_member_not_found' });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'member_from_org_b');
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('scopes both lookup and delete by organization_id before removing a member', async () => {
    installSupabaseMock({
      data: {
        id: 'member_1',
        user_id: 'user_removed',
        role: 'viewer',
        organization_id: 'org_a',
      },
      error: null,
    });

    const response = await POST(buildRequest({ memberId: 'member_1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ removed: true, auditPersisted: true });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'member_1');
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(mocks.delete).toHaveBeenCalled();
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_a',
        actorUserId: 'user_admin',
        action: 'team_member_removed',
        entityId: 'member_1',
      }),
    );
  });
});
