/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  requirePermission: vi.fn(),
  requireTrustedMutation: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  stripeCheckoutCreate: vi.fn(),
  stripeCustomerCreate: vi.fn(),
  stripeCustomerUpdate: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  publicStepUpSummary: vi.fn(),
  getStripePriceId: vi.fn(),
  isSelfServePlan: vi.fn(),
  normalizeBillingPlanId: vi.fn(),
  writeAuditLog: vi.fn(),
  supabaseMaybeSingle: vi.fn(),
}));

vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: mocks.supabaseMaybeSingle,
              }),
            }),
          }),
        }),
      }),
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

vi.mock('@/server/billing/stripe', () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: mocks.stripeCheckoutCreate,
      },
    },
    customers: {
      create: mocks.stripeCustomerCreate,
      update: mocks.stripeCustomerUpdate,
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

function buildRequest(body = { plan: 'growth', locale: 'pt' }) {
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
    mocks.requireApiUser.mockResolvedValue({ id: 'user_admin', email: 'admin@example.test' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a', clerk_org_id: 'clerk_org_a', name: 'Org A' });
    mocks.requirePermission.mockResolvedValue({ ok: true, role: 'admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: { action: 'manage_billing', verifiedAt: '2026-06-22T09:00:00.000Z' },
    });
    mocks.publicStepUpSummary.mockReturnValue({ verified: true });
    mocks.normalizeBillingPlanId.mockImplementation((plan: string) => {
      if (plan === 'growth' || plan === 'professional' || plan === 'business') return 'growth';
      if (plan === 'starter' || plan === 'essential') return 'starter';
      if (plan === 'enterprise') return 'enterprise';
      return undefined;
    });
    mocks.getStripePriceId.mockReturnValue('price_growth_monthly');
    mocks.isSelfServePlan.mockImplementation((plan: string) => ['starter', 'growth', 'enterprise'].includes(plan));
    mocks.supabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.stripeCustomerCreate.mockResolvedValue({ id: 'cus_org_a' });
    mocks.stripeCustomerUpdate.mockResolvedValue({ id: 'cus_existing_org_a' });
    mocks.stripeCheckoutCreate.mockResolvedValue({
      id: 'cs_test_fixture',
      url: 'https://checkout.stripe.test/session-fixture',
    });
    mocks.writeAuditLog.mockResolvedValue(undefined);
  });

  it('blocks unauthenticated checkout before parsing attacker-controlled body', async () => {
    mocks.requireApiUser.mockRejectedValue({ code: 'unauthorized', status: 401 });

    const response = await POST(buildRequest({ plan: 'enterprise-custom', locale: 'pt' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mocks.getCurrentOrganizationForUser).not.toHaveBeenCalled();
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.requireTrustedMutation).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid checkout plan only after auth, RBAC, trusted origin and rate-limit gates', async () => {
    const response = await POST(buildRequest({ plan: 'enterprise-custom', locale: 'pt' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_plan' });
    expect(mocks.requireApiUser).toHaveBeenCalled();
    expect(mocks.requirePermission).toHaveBeenCalledWith({ userId: 'user_admin', organizationId: 'org_a', permission: 'manage_billing' });
    expect(mocks.requireTrustedMutation).toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('blocks checkout without manage_billing permission before mutation, step-up or Stripe calls', async () => {
    mocks.requirePermission.mockRejectedValue({ code: 'permission_denied', status: 403 });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'permission_denied' });
    expect(mocks.requireTrustedMutation).not.toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('fails closed when the trusted mutation or rate-limit guard denies the request', async () => {
    mocks.requireTrustedMutation.mockResolvedValue(new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }));

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: 'rate_limited' });
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('creates a customer-mapped checkout session only after RBAC, trusted mutation, and step-up', async () => {
    const response = await POST(buildRequest({ plan: 'business', locale: 'pt' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: 'https://checkout.stripe.test/session-fixture', stepUp: { verified: true } });
    expect(mocks.requirePermission).toHaveBeenCalledWith({ userId: 'user_admin', organizationId: 'org_a', permission: 'manage_billing' });
    expect(mocks.stripeCustomerCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'admin@example.test',
      name: 'Org A',
      metadata: expect.objectContaining({
        organization_id: 'org_a',
        user_id: 'user_admin',
        plan: 'growth',
      }),
    }));
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      customer: 'cus_org_a',
      line_items: [{ price: 'price_growth_monthly', quantity: 1 }],
      success_url: 'https://app.eurocomply.test/pt/dashboard/organizations?checkout=success',
      cancel_url: 'https://app.eurocomply.test/pt/checkout?plan=growth&checkout=cancelled',
      client_reference_id: 'org_a',
      locale: 'pt',
      billing_address_collection: 'required',
      customer_update: { address: 'auto', name: 'auto' },
      tax_id_collection: { enabled: true },
      payment_method_collection: 'always',
      allow_promotion_codes: true,
      metadata: expect.objectContaining({
        organization_id: 'org_a',
        organizationId: 'org_a',
        clerk_org_id: 'clerk_org_a',
        clerkOrgId: 'clerk_org_a',
        user_id: 'user_admin',
        userId: 'user_admin',
        plan: 'growth',
        actor_role: 'admin',
        step_up_action: 'manage_billing',
        step_up_verified_at: '2026-06-22T09:00:00.000Z',
      }),
      subscription_data: expect.objectContaining({
        metadata: expect.objectContaining({
          organization_id: 'org_a',
          user_id: 'user_admin',
          plan: 'growth',
          actor_role: 'admin',
          step_up_action: 'manage_billing',
        }),
      }),
    }));
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'checkout_created',
      organizationId: 'org_a',
      userId: 'user_admin',
      metadata: expect.objectContaining({ stripeCustomerId: 'cus_org_a' }),
    }));
  });

  it('reuses and refreshes an existing organization Stripe customer before checkout', async () => {
    mocks.supabaseMaybeSingle.mockResolvedValue({ data: { stripe_customer_id: 'cus_existing_org_a' }, error: null });

    const response = await POST(buildRequest({ plan: 'growth', locale: 'en' }));

    expect(response.status).toBe(200);
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
    expect(mocks.stripeCustomerUpdate).toHaveBeenCalledWith('cus_existing_org_a', {
      metadata: expect.objectContaining({
        organization_id: 'org_a',
        clerk_org_id: 'clerk_org_a',
        user_id: 'user_admin',
        plan: 'growth',
      }),
    });
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_existing_org_a',
    }));
  });
});
