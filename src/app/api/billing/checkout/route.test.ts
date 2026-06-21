/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkDistributedRateLimit: vi.fn(),
  stripeCheckoutCreate: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  assertOrganizationPermission: vi.fn(),
  permissionDeniedResponse: vi.fn(),
  assertTrustedOrigin: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  publicStepUpSummary: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }),
}));

vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/server/billing/app-url', () => ({
  resolveBillingReturnBaseUrl: () => ({ ok: true, appUrl: 'https://app.eurocomply.test' }),
}));

vi.mock('@/server/billing/stripe', () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: mocks.stripeCheckoutCreate,
      },
    },
  }),
}));

vi.mock('@/server/billing/plans', () => ({
  isSelfServePlan: (plan: string) => plan === 'essential' || plan === 'professional' || plan === 'business',
  getStripePriceId: (plan: string) => `price_${plan}`,
}));

vi.mock('@/server/queries/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/security/rbac', () => ({
  assertOrganizationPermission: mocks.assertOrganizationPermission,
  permissionDeniedResponse: mocks.permissionDeniedResponse,
}));

vi.mock('@/server/security/origin-guard', () => ({
  assertTrustedOrigin: mocks.assertTrustedOrigin,
}));

vi.mock('@/server/security/step-up', () => ({
  requireStepUpForRequest: mocks.requireStepUpForRequest,
  publicStepUpSummary: mocks.publicStepUpSummary,
}));

import { POST } from './route';

function buildRequest(body: unknown) {
  return new Request('https://app.eurocomply.test/api/billing/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.eurocomply.test',
      'x-eurocomply-step-up-token': 'step_up_token',
    },
    body: JSON.stringify(body),
  });
}

describe('billing checkout API security gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_admin', email: 'admin@example.test' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a' });
    mocks.assertOrganizationPermission.mockResolvedValue({ ok: true, role: 'admin' });
    mocks.permissionDeniedResponse.mockImplementation(() => new Response(JSON.stringify({ error: 'permission_denied' }), { status: 403 }));
    mocks.assertTrustedOrigin.mockReturnValue(null);
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: { action: 'manage_billing', verifiedAt: '2026-06-21T09:00:00.000Z' },
    });
    mocks.publicStepUpSummary.mockReturnValue({ verified: true });
    mocks.stripeCheckoutCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.test/cs_test_123' });
    mocks.writeAuditLog.mockResolvedValue(undefined);
  });

  it('blocks checkout without a valid step-up token', async () => {
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'step_up_required' }), { status: 403 }),
    });

    const response = await POST(buildRequest({ plan: 'business', locale: 'en' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'step_up_required' });
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('rejects invalid or non-self-serve plans before contacting Stripe', async () => {
    const response = await POST(buildRequest({ plan: 'enterprise', locale: 'en' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_plan' });
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
  });

  it('creates checkout only from server-side organization, permission, step-up, and price mapping', async () => {
    const response = await POST(buildRequest({ plan: 'business', locale: 'en' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: 'https://checkout.stripe.test/cs_test_123', stepUp: { verified: true } });
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_business', quantity: 1 }],
        client_reference_id: 'org_a',
        metadata: expect.objectContaining({
          organization_id: 'org_a',
          user_id: 'user_admin',
          plan: 'business',
        }),
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({
            organization_id: 'org_a',
            user_id: 'user_admin',
            plan: 'business',
          }),
        }),
      }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing.checkout_start',
        organizationId: 'org_a',
        userId: 'user_admin',
        entityType: 'stripe_checkout_session',
        entityId: 'cs_test_123',
      }),
    );
  });
});
