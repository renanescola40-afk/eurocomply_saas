/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  createAdminClient: vi.fn(),
  hasProcessedLiveStripeSubscriptionAuthority: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  buildRateLimitSubjectFromRequest: vi.fn(),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/billing/subscription-authority', () => ({
  hasProcessedLiveStripeSubscriptionAuthority: mocks.hasProcessedLiveStripeSubscriptionAuthority,
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/security/api-guards', () => ({
  requireApiUser: mocks.requireApiUser,
  secureApiError: (error: { code?: string; status?: number }) =>
    new Response(JSON.stringify({ error: error?.code ?? 'internal_server_error' }), {
      status: error?.status ?? 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }),
}));

vi.mock('@/server/security/no-store', () => ({
  noStoreJson: (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...(init?.headers ?? {}),
      },
    }),
}));

vi.mock('@/server/security/rate-limit', () => ({
  buildRateLimitSubjectFromRequest: mocks.buildRateLimitSubjectFromRequest,
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: mocks.rateLimitResponse,
}));

import { GET } from './route';

type SubscriptionFixture = {
  status: string | null;
  plan: string | null;
  updated_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function makeSubscriptionLookup(subscription: SubscriptionFixture | null) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: subscription, error: null })),
  };
  return builder;
}

function setSubscription(subscription: SubscriptionFixture | null) {
  const builder = makeSubscriptionLookup(subscription);
  mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => builder) });
  return builder;
}

function activeSubscription(overrides: Partial<SubscriptionFixture> = {}): SubscriptionFixture {
  return {
    status: 'active',
    plan: 'professional',
    updated_at: '2026-08-15T12:00:00.000Z',
    stripe_customer_id: 'cus_live_fixture',
    stripe_subscription_id: 'sub_live_fixture',
    ...overrides,
  };
}

function request() {
  return new Request('https://app.risckcomply.test/api/billing/checkout/activation');
}

describe('checkout activation live authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: 'user_owner' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a' });
    mocks.buildRateLimitSubjectFromRequest.mockReturnValue({
      userId: 'user_owner',
      organizationId: 'org_a',
      action: 'billing.checkout.activation.poll',
      route: '/api/billing/checkout/activation',
    });
    mocks.checkDistributedRateLimit.mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    mocks.rateLimitResponse.mockReturnValue(new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }));
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(true);
    setSubscription(activeSubscription());
  });

  it('returns 401 before tenant or subscription lookup when the request is unauthenticated', async () => {
    mocks.requireApiUser.mockRejectedValue({ code: 'unauthorized', status: 401 });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mocks.getCurrentOrganizationForUser).not.toHaveBeenCalled();
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).not.toHaveBeenCalled();
  });

  it('returns organization_required without querying subscription authority when no tenant is selected', async () => {
    mocks.getCurrentOrganizationForUser.mockResolvedValue(null);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ state: 'organization_required' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).not.toHaveBeenCalled();
  });

  it('fails closed before subscription lookup when distributed rate limiting denies the poll', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(mocks.rateLimitResponse).toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).not.toHaveBeenCalled();
  });

  it('keeps a historical active status-only row pending and never asks the live-event authority', async () => {
    setSubscription(activeSubscription({
      stripe_customer_id: null,
      stripe_subscription_id: null,
    }));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      state: 'pending',
      subscriptionStatus: 'active',
      plan: 'professional',
      liveStripeAuthority: false,
      authority: 'processed_live_stripe_subscription_event',
    });
    expect(body).not.toHaveProperty('next');
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).not.toHaveBeenCalled();
  });

  it('keeps active rows with Stripe ids pending when no processed live event proves the exact relationship', async () => {
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(false);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ state: 'pending', liveStripeAuthority: false });
    expect(body).not.toHaveProperty('next');
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).toHaveBeenCalledWith({
      organizationId: 'org_a',
      stripeCustomerId: 'cus_live_fixture',
      stripeSubscriptionId: 'sub_live_fixture',
    });
  });

  it('activates active only after exact processed live Stripe authority is proven', async () => {
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(true);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      state: 'activated',
      subscriptionStatus: 'active',
      plan: 'professional',
      updatedAt: '2026-08-15T12:00:00.000Z',
      liveStripeAuthority: true,
      next: '/dashboard/organizations',
      authority: 'processed_live_stripe_subscription_event',
    });
  });

  it('keeps trialing pending even when Stripe ids exist because public trials are not product authority', async () => {
    setSubscription(activeSubscription({ status: 'trialing' }));
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(true);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      state: 'pending',
      subscriptionStatus: 'trialing',
      plan: 'professional',
      liveStripeAuthority: false,
    });
    expect(body).not.toHaveProperty('next');
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).not.toHaveBeenCalled();
  });

  it.each(['past_due', 'unpaid', 'incomplete', 'canceled'])('keeps %s pending even when Stripe ids are persisted', async (status) => {
    setSubscription(activeSubscription({ status }));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      state: 'pending',
      subscriptionStatus: status,
      liveStripeAuthority: false,
    });
    expect(body).not.toHaveProperty('next');
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).not.toHaveBeenCalled();
  });

  it('fails closed when live Stripe authority lookup is unavailable', async () => {
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockRejectedValue(new Error('billing_authority_unavailable'));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'internal_server_error' });
    expect(body).not.toHaveProperty('next');
  });
});
