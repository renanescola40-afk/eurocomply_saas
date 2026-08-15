import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  requirePermission: vi.fn(),
  requireTrustedMutation: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  createOrganizationInvite: vi.fn(),
  deleteOrganizationInvite: vi.fn(),
  createAuditEvent: vi.fn(),
  createNotification: vi.fn(),
  getOrganizationEntitlements: vi.fn(),
  isPlanAtLeast: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  sendEmail: vi.fn(),
  localizedInvitationEmail: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/lib/email/client', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('@/lib/email/localized-invitation', () => ({ localizedInvitationEmail: mocks.localizedInvitationEmail }));
vi.mock('@/lib/observability/report-error', () => ({ reportError: mocks.reportError }));
vi.mock('@/server/queries/organizations', () => ({ getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser }));
vi.mock('@/server/queries/invites', () => ({
  createOrganizationInvite: mocks.createOrganizationInvite,
  deleteOrganizationInvite: mocks.deleteOrganizationInvite,
  OrganizationInviteError: class OrganizationInviteError extends Error {
    code: string;
    status: number;

    constructor(code: string, status = 409) {
      super(code);
      this.name = 'OrganizationInviteError';
      this.code = code;
      this.status = status;
    }
  },
}));
vi.mock('@/server/queries/audit-events', () => ({ createAuditEvent: mocks.createAuditEvent }));
vi.mock('@/server/queries/notifications', () => ({ createNotification: mocks.createNotification }));
vi.mock('@/server/billing/entitlements', () => ({ getOrganizationEntitlements: mocks.getOrganizationEntitlements }));
vi.mock('@/server/queries/subscription', () => ({ isPlanAtLeast: mocks.isPlanAtLeast }));
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
vi.mock('@/server/security/step-up', () => ({ requireStepUpForRequest: mocks.requireStepUpForRequest }));

import { POST } from '../../src/app/api/team/invites/route';

function buildRequest(body: Record<string, unknown> = { email: 'new.user@example.test', role: 'Editor', locale: 'en' }) {
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
      invite: { id: 'inv_123', email: 'new.user@example.test', role: 'editor', seat_type: 'full' },
      persisted: true,
      token: 'secure_invitation_token_value_1234567890',
      tokenFingerprint: 'token_fingerprint',
      organizationName: 'Acme Corp',
    });
    mocks.deleteOrganizationInvite.mockResolvedValue(undefined);
    mocks.localizedInvitationEmail.mockReturnValue({
      subject: 'Join Acme Corp',
      html: '<p>Invite</p>',
      text: 'Invite',
      template: 'member_invited',
    });
    mocks.sendEmail.mockResolvedValue({ sent: true, provider: 'resend', status: 'sent', attempts: 1 });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
    mocks.createNotification.mockResolvedValue({ persisted: true });
  });

  it('returns authentication failure before inspecting an invalid invite payload', async () => {
    mocks.requireApiUser.mockRejectedValue({ code: 'authentication_required', status: 401 });
    const response = await POST(buildRequest({ email: 'not-an-email', role: 'Editor', locale: 'en' }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'authentication_required' });
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.createOrganizationInvite).not.toHaveBeenCalled();
  });

  it('rejects invalid payload only after auth, RBAC, trusted mutation and step-up gates', async () => {
    const response = await POST(buildRequest({ email: 'not-an-email', role: 'Editor', locale: 'en' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_invite_payload' });
    expect(mocks.requireApiUser).toHaveBeenCalled();
    expect(mocks.requirePermission).toHaveBeenCalled();
    expect(mocks.requireTrustedMutation).toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).toHaveBeenCalled();
    expect(mocks.getOrganizationEntitlements).not.toHaveBeenCalled();
  });

  it('blocks invite creation without manage_team permission before mutation', async () => {
    mocks.requirePermission.mockRejectedValue({ code: 'permission_denied', status: 403 });
    const response = await POST(buildRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'permission_denied' });
    expect(mocks.requireTrustedMutation).not.toHaveBeenCalled();
    expect(mocks.createOrganizationInvite).not.toHaveBeenCalled();
  });

  it('fails closed when trusted mutation or rate limiting denies the request', async () => {
    mocks.requireTrustedMutation.mockResolvedValue(new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }));
    const response = await POST(buildRequest());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'rate_limited' });
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.createOrganizationInvite).not.toHaveBeenCalled();
  });

  it('creates and localizes an invite only after all security gates pass', async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      invite: { id: 'inv_123', email: 'new.user@example.test', role: 'editor', seat_type: 'full' },
      persisted: true,
      auditPersisted: true,
      notificationPersisted: true,
      plan: 'business',
      locale: 'en',
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith({
      userId: 'user_admin',
      organizationId: 'org_a',
      permission: 'manage_team',
    });
    expect(mocks.requireTrustedMutation).toHaveBeenCalledWith(expect.any(Request), {
      rateLimit: expect.objectContaining({
        key: 'team-invite:org_a:user_admin',
        policy: 'team-management',
        action: 'team_invite_create',
        failureMode: 'fail-closed',
      }),
    });
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledWith(expect.objectContaining({
      action: 'manage_team', userId: 'user_admin', organizationId: 'org_a',
    }));
    expect(mocks.createOrganizationInvite).toHaveBeenCalledWith({
      organizationId: 'org_a',
      invitedBy: 'user_admin',
      email: 'new.user@example.test',
      role: 'Editor',
      seatType: undefined,
    });
    expect(mocks.localizedInvitationEmail).toHaveBeenCalledWith({
      organizationName: 'Acme Corp',
      role: 'editor',
      inviteUrl: 'http://localhost:3000/en/invite/secure_invitation_token_value_1234567890',
      locale: 'en',
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'new.user@example.test',
      idempotencyKey: 'team-invite:inv_123:token_fingerprint',
      metadata: expect.objectContaining({ locale: 'en' }),
    }));
    expect(JSON.stringify(body)).not.toContain('secure_invitation_token_value');
  });

  it('revokes the persisted invite and audits when email delivery throws', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('provider unavailable'));
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'invitation_delivery_failed', persisted: false, auditPersisted: true });
    expect(mocks.deleteOrganizationInvite).toHaveBeenCalledWith({ organizationId: 'org_a', invitationId: 'inv_123' });
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'provider unavailable' }),
      expect.objectContaining({ area: 'team_invitation_delivery', organizationId: 'org_a', invitationId: 'inv_123' }),
    );
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'team_invite_delivery_failed',
      metadata: expect.objectContaining({ inviteRevoked: true, locale: 'en' }),
    }));
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it('also revokes the invite when the provider returns an unconfirmed delivery', async () => {
    mocks.sendEmail.mockResolvedValue({ sent: false, provider: 'console', status: 'skipped', attempts: 0 });
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'invitation_delivery_failed', persisted: false, auditPersisted: true });
    expect(mocks.deleteOrganizationInvite).toHaveBeenCalledWith({ organizationId: 'org_a', invitationId: 'inv_123' });
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invitation email delivery was not confirmed (skipped)' }),
      expect.objectContaining({ area: 'team_invitation_delivery' }),
    );
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });
});
