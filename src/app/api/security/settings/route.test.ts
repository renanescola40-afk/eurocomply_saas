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
  secureApiError: () =>
    new Response(JSON.stringify({ error: 'internal_server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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

function buildRequest(body: string) {
  return new Request('https://app.eurocomply.test/api/security/settings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.eurocomply.test',
    },
    body,
  });
}

describe('security settings payload integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: 'user_admin' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a' });
    mocks.requirePermission.mockResolvedValue({ role: 'admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: { required: true, verifiedAt: '2026-07-15T04:00:00.000Z' },
    });
    mocks.publicStepUpSummary.mockReturnValue({ required: true, verified: true });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
  });

  it('rejects malformed JSON without mutating or auditing default settings', async () => {
    const upsert = vi.fn();
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => ({ upsert })) });

    const response = await POST(buildRequest('{"stepUpProviderMode":'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'invalid_security_settings_payload' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('persists valid bounded settings only after all access gates pass', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => ({ upsert })) });

    const response = await POST(
      buildRequest(JSON.stringify({ stepUpProviderMode: 'enterprise_idp', allowedIdpAcrValues: ['urn:example:loa:2'] })),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org_a',
        require_step_up_for_critical_actions: true,
        step_up_provider_mode: 'enterprise_idp',
        allowed_idp_acr_values: ['urn:example:loa:2'],
      }),
      { onConflict: 'organization_id' },
    );
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'security_settings_changed', organizationId: 'org_a' }),
    );
    expect(body).toMatchObject({ changed: true, auditPersisted: true });
  });
});
