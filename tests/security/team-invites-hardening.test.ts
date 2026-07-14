/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  requirePermission: vi.fn(),
  requireTrustedMutation: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  createOrganizationInvite: vi.fn(),
  createAuditEvent: vi.fn(),
  createNotification: vi.fn(),
  getOrganizationEntitlements: vi.fn(),
  isPlanAtLeast: vi.fn(),
  requireStepUpForRequest: vi.fn(),
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/queries/invites', () => ({
  createOrganizationInvite: mocks.createOrganizationInvite,
}));

vi.mock('@/server/queries/audit-events', () => ({
  createAuditEvent: mocks.createAuditEvent,
}));

vi.mock('@/server/queries/notifications', () => ({
  createNotification: mocks.createNotification,
}));

vi.mock('@/server/billing/entitlements', () => ({
  getOrganizationEntitlements: mocks.getOrganizationEntitlements,
}));

vi.mock('@/server/queries/subscription', () => ({
  isPlanAtLeast: mocks.isPlanAtLeast,
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
}));

import { POST } from '../../src/app/api/team/invites/route';

function buildRequest(body = { email: 'new.user@example.test', role: 'Editor' }) {
  return new Request('https://app.eurocomply.test/api/team/invites', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.eurocomply.test',
      'x-eurocomply-step-up-token': 'step_up_token',
    },
    body: JSON.stringify(body),
  });
}

describe('team invites API security gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: 'user_admin' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a' });
    mocks.requirePermission.mockResolvedValue({ ok: true, role: 'admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.requireStepUpForRequest.mockResolvedValue({ ok: true, assessment: { action: 'manage_team' } });
    mocks.getOrganizationEntitlements.mockResolvedValue({ employeeInvites: true, plan: 'business' });
    mocks.isPlanAtLeast.mockReturnValue(false);
    mocks.createOrganizationInvite.mockResolvedValue({
      invite: { id: 'inv_123', email: 'new.user@example.test', role: 'Editor' },
      persisted: true,
    });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
    mocks.createNotification.mockResolvedValue({ persisted: true });
  });

  it('returns the authentication failure before inspecting an invalid invite payload', async () => {
    mocks.requireApiUser.mockRejectedValue({ code: 'authentication_required', status: 401 });

    const response = await POST(buildRequest({ email: 'not-an-email', role: 'Editor' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'authentication_required' });
    expect(mocks.getCurrentOrganizationForUser).not.toHaveBeenCalled();
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.requireTrustedMutation).not.toHaveBeenCalled();
    expect(mocks.createOrganizationInvite).not.toHaveBeenCalled();
  });

  it('rejects invalid invite payload after auth, RBAC, trusted mutation, and step-up gates pass', async () => {
    const response = await POST(buildRequest({ email: 'not-an-email', role: 'Editor' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_invite_payload' });
    expect(mocks.requireApiUser).toHaveBeenCalled();
    expect(mocks.requirePermission).toHaveBeenCalled();
    expect(mocks.requireTrustedMutation).toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).toHaveBeenCalled();
    expect(mocks.getOrganizationEntitlements).not.toHaveBeenCalled();
    expect(mocks.createOrganizationInvite).not.toHaveBeenCalled();
  });

  it('blocks invite creation without manage_team permission before mutation or step-up', async () => {
    mocks.requirePermission.mockRejectedValue({ code: 'permission_denied', status: 403 });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'permission_denied' });
    expect(mocks.requireTrustedMutation).not.toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.createOrganizationInvite).not.toHaveBeenCalled();
  });

  it('fails closed when trusted mutation or rate limiting denies the request', async () => {
    mocks.requireTrustedMutation.mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }),
    );

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: 'rate_limited' });
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.createOrganizationInvite).not.toHaveBeenCalled();
  });

  it('creates an invite only after RBAC, trusted mutation, and step-up checks pass', async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      invite: { id: 'inv_123', email: 'new.user@example.test', role: 'Editor' },
      persisted: true,
      auditPersisted: true,
      notificationPersisted: true,
      plan: 'business',
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith({
      userId: 'user_admin',
      organizationId: 'org_a',
      permission: 'manage_team',
    });
    expect(mocks.requireTrustedMutation).toHaveBeenCalledWith(expect.any(Request), {
      rateLimit: {
        key: 'team-invite:org_a:user_admin',
        limit: 5,
        windowMs: 60_000,
      },
    });
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledWith(expect.objectContaining({
      action: 'manage_team',
      userId: 'user_admin',
      organizationId: 'org_a',
    }));
    expect(mocks.createOrganizationInvite).toHaveBeenCalledWith({
      organizationId: 'org_a',
      invitedBy: 'user_admin',
      email: 'new.user@example.test',
      role: 'Editor',
    });
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org_a',
      actorUserId: 'user_admin',
      action: 'team_invite_created',
      entityType: 'team_invite',
      entityId: 'inv_123',
      metadata: expect.objectContaining({ emailDomain: 'example.test', role: 'Editor', actorRole: 'admin' }),
    }));
  });
});
