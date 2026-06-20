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
  update: vi.fn(),
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
  return new Request('https://app.eurocomply.test/api/team/invitations/cancel', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.eurocomply.test',
    },
    body: JSON.stringify(body),
  });
}

describe('team invitation cancel API hardening', () => {
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

    const response = await POST(buildRequest({ invitationId: 'invite_1' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'organization_required' });
  });

  it('does not revoke an invitation from another tenant', async () => {
    const builder = {
      select: mocks.select,
      update: mocks.update,
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
    };
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => builder) });

    const response = await POST(buildRequest({ invitationId: 'invite_from_org_b' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'invitation_not_pending' });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'invite_from_org_b');
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('scopes lookup and update by organization_id when revoking an invitation', async () => {
    const updateEq = vi.fn().mockReturnThis();
    const lookupBuilder = {
      select: mocks.select,
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
      update: mocks.update,
    };
    mocks.select.mockReturnValue(lookupBuilder);
    mocks.eq.mockReturnValue(lookupBuilder);
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: 'invite_1',
        email: 'masked@example.com',
        role: 'viewer',
        organization_id: 'org_a',
        status: 'pending',
      },
      error: null,
    });
    mocks.update.mockReturnValue({
      eq: updateEq,
    });
    updateEq.mockReturnValue({ eq: updateEq });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => lookupBuilder) });

    const response = await POST(buildRequest({ invitationId: 'invite_1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ cancelled: true, auditPersisted: true });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'invite_1');
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(updateEq).toHaveBeenCalledWith('id', 'invite_1');
    expect(updateEq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(updateEq).toHaveBeenCalledWith('status', 'pending');
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_a',
        actorUserId: 'user_admin',
        action: 'team_invitation_cancelled',
        entityId: 'invite_1',
      }),
    );
  });
});
