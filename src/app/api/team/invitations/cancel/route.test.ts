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

function buildClient({ cancelled = { id: 'invite_1' } }: { cancelled?: { id: string } | null } = {}) {
  const lookupMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'invite_1',
      email: 'masked@example.com',
      role: 'viewer',
      organization_id: 'org_a',
      accepted_at: null,
    },
    error: null,
  });
  const lookupEq = vi.fn();
  const lookupIs = vi.fn();
  const lookupBuilder = {
    select: vi.fn(),
    eq: lookupEq,
    is: lookupIs,
    maybeSingle: lookupMaybeSingle,
  };
  lookupBuilder.select.mockReturnValue(lookupBuilder);
  lookupEq.mockReturnValue(lookupBuilder);
  lookupIs.mockReturnValue(lookupBuilder);

  const deleteMaybeSingle = vi.fn().mockResolvedValue({ data: cancelled, error: null });
  const deleteSelect = vi.fn();
  const deleteEq = vi.fn();
  const deleteIs = vi.fn();
  const deleteBuilder = {
    eq: deleteEq,
    is: deleteIs,
    select: deleteSelect,
    maybeSingle: deleteMaybeSingle,
  };
  deleteEq.mockReturnValue(deleteBuilder);
  deleteIs.mockReturnValue(deleteBuilder);
  deleteSelect.mockReturnValue(deleteBuilder);

  const table = {
    select: lookupBuilder.select,
    delete: vi.fn(() => deleteBuilder),
  };

  mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => table) });

  return { lookupEq, lookupIs, deleteEq, deleteIs, deleteSelect };
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
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn();
    const is = vi.fn();
    const builder = { select: vi.fn(), eq, is, maybeSingle };
    builder.select.mockReturnValue(builder);
    eq.mockReturnValue(builder);
    is.mockReturnValue(builder);
    const deleteInvitation = vi.fn();
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => ({ select: builder.select, delete: deleteInvitation })) });

    const response = await POST(buildRequest({ invitationId: 'invite_from_org_b' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'invitation_not_pending' });
    expect(eq).toHaveBeenCalledWith('id', 'invite_from_org_b');
    expect(eq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(deleteInvitation).not.toHaveBeenCalled();
  });

  it('scopes and verifies the conditional cancellation before auditing success', async () => {
    const { lookupEq, lookupIs, deleteEq, deleteIs, deleteSelect } = buildClient();

    const response = await POST(buildRequest({ invitationId: 'invite_1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ cancelled: true, auditPersisted: true });
    expect(lookupEq).toHaveBeenCalledWith('id', 'invite_1');
    expect(lookupEq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(lookupIs).toHaveBeenCalledWith('accepted_at', null);
    expect(deleteEq).toHaveBeenCalledWith('id', 'invite_1');
    expect(deleteEq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(deleteIs).toHaveBeenCalledWith('accepted_at', null);
    expect(deleteSelect).toHaveBeenCalledWith('id');
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_a',
        actorUserId: 'user_admin',
        action: 'team_invitation_cancelled',
        entityId: 'invite_1',
      }),
    );
  });

  it('returns conflict and does not create a false audit event when another request wins the revoke', async () => {
    buildClient({ cancelled: null });

    const response = await POST(buildRequest({ invitationId: 'invite_1' }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'invitation_state_changed' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });
});
