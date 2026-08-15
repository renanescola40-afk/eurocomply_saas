/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  requirePermission: vi.fn(),
  requireTrustedMutation: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  createAdminClient: vi.fn(),
  stripePortalCreate: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  publicStepUpSummary: vi.fn(),
  writeAuditLog: vi.fn(),
  reportError: vi.fn(),
  getAuthoritativeSignedContractPlan: vi.fn(),
  hasProcessedLiveStripeSubscriptionAuthority: vi.fn(),
}));

vi.mock('@/lib/i18n/locales', () => ({
  normalizeLocale: (locale: string | null | undefined) => locale || 'en',
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/billing/app-url', () => ({
  resolveBillingReturnBaseUrl: () => ({ ok: true, appUrl: 'https://app.eurocomply.test' }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/billing/subscription-authority', () => ({
  getAuthoritativeSignedContractPlan: mocks.getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority: mocks.hasProcessedLiveStripeSubscriptionAuthority,
}));

vi.mock('@/server/billing/stripe', () => ({
  getStripeClient: () => ({
    billingPortal: {
      sessions: {
        create: mocks.stripePortalCreate,
      },
    },
  }),
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

function buildRequest(returnPath = '/dashboard/organizations/billing', headers: HeadersInit = {}) {
  return new Request(`https://app.eurocomply.test/api/billing/portal?locale=en&returnPath=${encodeURIComponent(returnPath)}`, {
    method: 'POST',
    headers: {
      origin: 'https://app.eurocomply.test',
      'x-eurocomply-step-up-token': 'step_up_token',
      'Idempotency-Key': 'portal-request-00000001',
      ...headers,
    },
  });
}

function makeSubscriptionLookup(stripeCustomerId = 'cus_123', stripeSubscriptionId = 'sub_123') {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({
      data: {
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status: 'active',
      },
      error: null,
    })),
  };

  return builder;
}

describe('billing portal API security gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
    mocks.requireApiUser.mockResolvedValue({ id: 'user_admin' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a' });
    mocks.requirePermission.mockResolvedValue({ ok: true, role: 'admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: { action: 'manage_billing', verifiedAt: '2026-06-21T09:00:00.000Z' },
    });
    mocks.publicStepUpSummary.mockReturnValue({ verified: true });
    mocks.getAuthoritativeSignedContractPlan.mockResolvedValue(null);
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(true);
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => makeSubscriptionLookup()) });
    mocks.stripePortalCreate.mockResolvedValue({ id: 'portal_session_fixture', url: 'https://billing.stripe.test/session-fixture' });
    mocks.writeAuditLog.mockResolvedValue({ persisted: true, legacyPersisted: true, chained: true });
  });

  it('blocks billing portal access without an authenticated user', async () => {
    mocks.requireApiUser.mockRejectedValue({ code: 'unauthorized', status: 401 });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mocks.getCurrentOrganizationForUser).not.toHaveBeenCalled();
    expect(mocks.stripePortalCreate).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('blocks billing portal access without manage_billing permission', async () => {
    mocks.requirePermission.mockRejectedValue({ code: 'permission_denied', status: 403 });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'permission_denied' });
    expect(mocks.requireTrustedMutation).not.toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.stripePortalCreate).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('requires an idempotency key before step-up or Stripe calls', async () => {
    const response = await POST(buildRequest(undefined, { 'Idempotency-Key': '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'idempotency_key_required' });
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.stripePortalCreate).not.toHaveBeenCalled();
  });

  it('blocks billing portal access without valid step-up', async () => {
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'step_up_required' }), { status: 403 }),
    });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'step_up_required' });
    expect(mocks.stripePortalCreate).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('rejects unsafe portal return paths', async () => {
    const response = await POST(buildRequest('/settings/billing'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_billing_portal_query' });
    expect(mocks.stripePortalCreate).not.toHaveBeenCalled();
  });

  it('fails closed before Stripe when an explicit portal configuration binding is malformed', async () => {
    process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID = 'not-a-bpc';

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'billing_portal_configuration_invalid' });
    expect(mocks.stripePortalCreate).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        area: 'billing_portal_configuration',
        organizationId: 'org_a',
        userId: 'user_admin',
      }),
    );
  });

  it('withholds the portal URL when audit persistence fails', async () => {
    mocks.writeAuditLog.mockResolvedValueOnce({ persisted: false, legacyPersisted: false, chained: true });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'billing_portal_audit_unavailable' });
    expect(body).not.toHaveProperty('url');
    expect(mocks.stripePortalCreate).toHaveBeenCalledTimes(1);
    expect(mocks.writeAuditLog).toHaveBeenCalledTimes(1);
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        area: 'billing_portal_audit',
        organizationId: 'org_a',
        userId: 'user_admin',
      }),
    );
  });

  it('creates a billing portal session with the account default configuration when no explicit pin is configured', async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      url: 'https://billing.stripe.test/session-fixture',
      idempotencyProtected: true,
      stepUp: { verified: true },
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith({
      userId: 'user_admin',
      organizationId: 'org_a',
      permission: 'manage_billing',
    });
    expect(mocks.requireTrustedMutation).toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'manage_billing', userId: 'user_admin', organizationId: 'org_a' }),
    );
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).toHaveBeenCalledWith({
      organizationId: 'org_a',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
    });
    expect(mocks.stripePortalCreate).toHaveBeenCalledWith(
      {
        customer: 'cus_123',
        return_url: 'https://app.eurocomply.test/en/dashboard/organizations/billing',
      },
      expect.objectContaining({ idempotencyKey: expect.stringContaining('risck:portal:') }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing_portal_created',
        organizationId: 'org_a',
        userId: 'user_admin',
        entityType: 'stripe_billing_portal_session',
        entityId: 'portal_session_fixture',
        metadata: expect.objectContaining({
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          returnUrl: 'https://app.eurocomply.test/en/dashboard/organizations/billing',
          rbacPermission: 'manage_billing',
          trustedOriginRequired: true,
          idempotencyProtected: true,
          liveSubscriptionAuthority: true,
          billingPortalConfigurationSource: 'default',
          billingPortalConfigurationPinned: false,
        }),
      }),
    );
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it('pins a validated explicit Billing Portal configuration without storing its identifier in audit metadata', async () => {
    process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID = 'bpc_livefixture123';

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    expect(mocks.stripePortalCreate).toHaveBeenCalledWith(
      {
        customer: 'cus_123',
        return_url: 'https://app.eurocomply.test/en/dashboard/organizations/billing',
        configuration: 'bpc_livefixture123',
      },
      expect.objectContaining({ idempotencyKey: expect.stringContaining('risck:portal:') }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          billingPortalConfigurationSource: 'explicit',
          billingPortalConfigurationPinned: true,
        }),
      }),
    );
    const auditInput = mocks.writeAuditLog.mock.calls[0]?.[0];
    expect(JSON.stringify(auditInput)).not.toContain('bpc_livefixture123');
  });
});
