/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  requirePermission: vi.fn(),
  requireTrustedMutation: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  stripeCheckoutCreate: vi.fn(),
  stripeCheckoutExpire: vi.fn(),
  stripeCustomerCreate: vi.fn(),
  stripeCustomerUpdate: vi.fn(),
  stripeCustomerDelete: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  publicStepUpSummary: vi.fn(),
  getStripePriceId: vi.fn(),
  isSelfServePlan: vi.fn(),
  normalizeBillingPlanId: vi.fn(),
  getBillingEntitlements: vi.fn(),
  getAuthoritativeSignedContractPlan: vi.fn(),
  hasProcessedLiveStripeSubscriptionAuthority: vi.fn(),
  writeAuditLog: vi.fn(),
  supabaseMaybeSingle: vi.fn(),
  supabaseUpsert: vi.fn(),
}));

vi.mock('@/lib/billing/plans', () => ({
  getBillingEntitlements: mocks.getBillingEntitlements,
}));

vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: mocks.supabaseMaybeSingle,
            }),
          }),
        }),
      }),
      upsert: mocks.supabaseUpsert,
    }),
  }),
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/billing/app-url', () => ({
  resolveBillingReturnBaseUrl: () => ({ ok: true, appUrl: 'https://app.eurocomply.test' }),
}));

vi.mock('@/server/billing/plans', () => ({
  getStripePriceId: mocks.getStripePriceId,
  isSelfServePlan: mocks.isSelfServePlan,
  normalizeBillingPlanId: mocks.normalizeBillingPlanId,
}));

vi.mock('@/server/billing/subscription-authority', () => ({
  getAuthoritativeSignedContractPlan: mocks.getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority: mocks.hasProcessedLiveStripeSubscriptionAuthority,
}));

vi.mock('@/server/billing/stripe', () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: mocks.stripeCheckoutCreate,
        expire: mocks.stripeCheckoutExpire,
      },
    },
    customers: {
      create: mocks.stripeCustomerCreate,
      update: mocks.stripeCustomerUpdate,
      del: mocks.stripeCustomerDelete,
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

import { POST } from '../../src/app/api/billing/checkout/route';

function buildRequest(body = { plan: 'professional', locale: 'pt' }, headers: HeadersInit = {}) {
  return new Request('https://app.eurocomply.test/api/billing/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.eurocomply.test',
      'x-eurocomply-step-up-token': 'step_up_token',
      'Idempotency-Key': 'checkout-hardening-00000001',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('billing checkout API security gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: 'user_admin', email: 'admin@example.test' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a', clerk_org_id: 'clerk_org_a', name: 'Org A' });
    mocks.requirePermission.mockResolvedValue({ ok: true, role: 'admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: { action: 'manage_billing', verifiedAt: '2026-08-14T20:00:00.000Z' },
    });
    mocks.publicStepUpSummary.mockReturnValue({ verified: true });
    mocks.normalizeBillingPlanId.mockImplementation((plan: string) => {
      if (plan === 'starter' || plan === 'essential') return 'starter';
      if (plan === 'growth' || plan === 'professional' || plan === 'pro') return 'professional';
      if (plan === 'business') return 'business';
      if (plan === 'enterprise') return 'enterprise';
      return undefined;
    });
    mocks.isSelfServePlan.mockImplementation((plan: string) => ['starter', 'professional'].includes(plan));
    mocks.getStripePriceId.mockImplementation((plan: string) => `price_${plan}_monthly`);
    mocks.getBillingEntitlements.mockReturnValue({ users: 3, documents: 100 });
    mocks.getAuthoritativeSignedContractPlan.mockResolvedValue(null);
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(false);
    mocks.supabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.supabaseUpsert.mockResolvedValue({ error: null });
    mocks.stripeCustomerCreate.mockResolvedValue({ id: 'cus_live_org_a' });
    mocks.stripeCustomerUpdate.mockResolvedValue({ id: 'cus_existing_live_org_a' });
    mocks.stripeCustomerDelete.mockResolvedValue({ id: 'cus_live_org_a', deleted: true });
    mocks.stripeCheckoutCreate.mockResolvedValue({
      id: 'cs_live_fixture',
      url: 'https://checkout.stripe.com/session-fixture',
    });
    mocks.stripeCheckoutExpire.mockResolvedValue({ id: 'cs_live_fixture', status: 'expired' });
    mocks.writeAuditLog.mockResolvedValue({ persisted: true });
  });

  it('blocks unauthenticated checkout before parsing attacker-controlled body', async () => {
    mocks.requireApiUser.mockRejectedValue({ code: 'unauthorized', status: 401 });

    const response = await POST(buildRequest({ plan: 'enterprise-custom', locale: 'pt' }));
    expect(response.status).toBe(401);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('rejects sales-led or unknown plans after auth and mutation gates', async () => {
    for (const plan of ['business', 'enterprise', 'enterprise-custom']) {
      const response = await POST(buildRequest({ plan, locale: 'pt' }));
      expect(response.status).toBe(400);
    }
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
  });

  it('blocks checkout without manage_billing permission before Stripe mutation', async () => {
    mocks.requirePermission.mockRejectedValue({ code: 'permission_denied', status: 403 });

    const response = await POST(buildRequest());
    expect(response.status).toBe(403);
    expect(mocks.requireTrustedMutation).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('fails closed when trusted mutation or rate limiting denies the request', async () => {
    mocks.requireTrustedMutation.mockResolvedValue(new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }));

    const response = await POST(buildRequest());
    expect(response.status).toBe(429);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('requires an idempotency key before Stripe mutation', async () => {
    const response = await POST(buildRequest(undefined, { 'Idempotency-Key': '' }));
    expect(response.status).toBe(400);
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
  });

  it('treats status-only legacy rows as initial checkout and replaces them with a pending live customer binding', async () => {
    mocks.supabaseMaybeSingle.mockResolvedValue({
      data: { stripe_customer_id: null, stripe_subscription_id: null, status: 'active' },
      error: null,
    });

    const response = await POST(buildRequest({ plan: 'professional', locale: 'pt' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stepUpRequired).toBe(false);
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.stripeCustomerCreate).toHaveBeenCalledTimes(1);
    expect(mocks.supabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org_a',
        stripe_customer_id: 'cus_live_org_a',
        stripe_subscription_id: null,
        plan: 'starter',
        tier: 'starter',
        status: 'incomplete',
      }),
      { onConflict: 'organization_id' },
    );
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_live_org_a',
        line_items: [{ price: 'price_professional_monthly', quantity: 1 }],
        client_reference_id: 'org_a',
        metadata: expect.objectContaining({ billing_flow: 'initial_subscription', plan: 'professional' }),
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining('risck:checkout:') }),
    );
  });

  it('requires step-up and reuses the customer for a proven live subscription relationship', async () => {
    mocks.supabaseMaybeSingle.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_existing_live_org_a',
        stripe_subscription_id: 'sub_existing_live_org_a',
        status: 'active',
      },
      error: null,
    });
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(true);

    const response = await POST(buildRequest({ plan: 'starter', locale: 'en' }));

    expect(response.status).toBe(200);
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledWith(expect.objectContaining({
      action: 'manage_billing',
      organizationId: 'org_a',
      userId: 'user_admin',
    }));
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
    expect(mocks.stripeCustomerUpdate).toHaveBeenCalledWith(
      'cus_existing_live_org_a',
      expect.objectContaining({ metadata: expect.objectContaining({ organization_id: 'org_a' }) }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining('risck:checkout:') }),
    );
    expect(mocks.supabaseUpsert).not.toHaveBeenCalled();
  });

  it('replaces a test-mode customer id when the live provider reports resource_missing', async () => {
    mocks.supabaseMaybeSingle.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_test_contaminated',
        stripe_subscription_id: 'sub_test_contaminated',
        status: 'active',
      },
      error: null,
    });
    mocks.stripeCustomerUpdate.mockRejectedValue({ code: 'resource_missing' });

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    expect(mocks.stripeCustomerUpdate).toHaveBeenCalledWith(
      'cus_test_contaminated',
      expect.anything(),
      expect.anything(),
    );
    expect(mocks.stripeCustomerCreate).toHaveBeenCalledTimes(1);
    expect(mocks.supabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_customer_id: 'cus_live_org_a',
        stripe_subscription_id: null,
        status: 'incomplete',
      }),
      { onConflict: 'organization_id' },
    );
  });

  it('keeps negotiated signed contracts out of generic self-serve checkout', async () => {
    mocks.getAuthoritativeSignedContractPlan.mockResolvedValue('enterprise');

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'contract_managed_billing' });
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });
});
