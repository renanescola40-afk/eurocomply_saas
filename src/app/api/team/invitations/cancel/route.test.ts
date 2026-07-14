/* eslint-disable */
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

function buildClient({ revoked = { id: 'invite_1' } }: { revoked?: { id: string } | null } = {}) {
  const lookupMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'invite_1',
      email: 'masked@example.com',
      role: 'viewer',
      organization_id: 'org_a',
      status: 'pending',
    },
    error: null,
  });
  const lookupEq = vi.fn();
  const lookupBuilder = {
    select: vi.fn(),
    eq: lookupEq,
    maybeSingle: lookupMaybeSingle,
  };
  lookupBuilder.select.mockReturnValue(lookupBuilder);
  lookupEq.mockReturnValue(lookupBuilder);

  const updateMaybeSingle = vi.fn().mockResolvedValue({ data: revoked, error: null });
  const updateSelect = vi.fn();
  const updateEq = vi.fn();
  const updateBuilder = {
    eq: updateEq,
    select: updateSelect,
    maybeSingle: updateMaybeSingle,
  };
  updateEq.mockReturnValue(updateBuilder);
  updateSelect.mockReturnValue(updateBuilder);

  const table = {
    select: lookupBuilder.select,
    update: vi.fn(() => updateBuilder),
  };

  mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => table) });

  return { lookupEq, updateEq, updateSelect };
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
    const builder = { select: vi.fn(), eq, maybeSingle };
    builder.select.mockReturnValue(builder);
    eq.mockReturnValue(builder);
    const update = vi.fn();
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => ({ select: builder.select, update })) });

    const response = await POST(buildRequest({ invitationId: 'invite_from_org_b' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'invitation_not_pending' });
    expect(eq).toHaveBeenCalledWith('id', 'invite_from_org_b');
    expect(eq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(update).not.toHaveBeenCalled();
  });

  it('scopes and verifies the conditional revoke before auditing success', async () => {
    const { lookupEq, updateEq, updateSelect } = buildClient();

    const response = await POST(buildRequest({ invitationId: 'invite_1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ cancelled: true, auditPersisted: true });
    expect(lookupEq).toHaveBeenCalledWith('id', 'invite_1');
    expect(lookupEq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(updateEq).toHaveBeenCalledWith('id', 'invite_1');
    expect(updateEq).toHaveBeenCalledWith('organization_id', 'org_a');
    expect(updateEq).toHaveBeenCalledWith('status', 'pending');
    expect(updateSelect).toHaveBeenCalledWith('id');
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
    buildClient({ revoked: null });

    const response = await POST(buildRequest({ invitationId: 'invite_1' }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'invitation_state_changed' });
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });
});
