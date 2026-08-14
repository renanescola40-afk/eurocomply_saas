/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  noStore: vi.fn(),
  getAuthoritativeSignedContractPlan: vi.fn(),
  hasProcessedLiveStripeSubscriptionAuthority: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: mocks.noStore,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/billing/subscription-authority', () => ({
  getAuthoritativeSignedContractPlan: mocks.getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority: mocks.hasProcessedLiveStripeSubscriptionAuthority,
}));

import { getOrganizationBillingContext } from './billing';

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
} | null;

let subscriptionRow: SubscriptionRow;
let countByTable: Record<string, number>;

function makeCountBuilder(table: string) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({ count: countByTable[table] ?? 0, error: null })),
    })),
  };
}

function makeSubscriptionBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: subscriptionRow, error: null })),
  };

  return builder;
}

function makeSupabaseClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') return makeSubscriptionBuilder();
      return makeCountBuilder(table);
    }),
  };
}

describe('organization billing context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionRow = null;
    countByTable = {
      organization_members: 2,
      documents: 5,
      vendors: 1,
      risks: 3,
    };
    mocks.createAdminClient.mockReturnValue(makeSupabaseClient());
    mocks.getAuthoritativeSignedContractPlan.mockResolvedValue(null);
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(false);
  });

  it('uses a paid plan only when a live Stripe subscription is correlated', async () => {
    subscriptionRow = {
      plan: 'business',
      status: 'active',
      stripe_customer_id: 'cus_live',
      stripe_subscription_id: 'sub_live',
    };
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(true);

    const context = await getOrganizationBillingContext('org_a');

    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).toHaveBeenCalledWith({
      organizationId: 'org_a',
      stripeCustomerId: 'cus_live',
      stripeSubscriptionId: 'sub_live',
    });
    expect(context).toEqual({
      plan: 'business',
      status: 'active',
      usage: {
        users: 2,
        documents: 5,
        vendors: 1,
        risks: 3,
      },
    });
  });

  it('demotes status-only legacy rows instead of granting paid access', async () => {
    subscriptionRow = {
      plan: 'business',
      status: 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
    };

    const context = await getOrganizationBillingContext('org_a');

    expect(context.plan).toBe('starter');
    expect(context.status).toBeNull();
  });

  it('preserves delinquent live status without granting paid entitlements', async () => {
    subscriptionRow = {
      plan: 'business',
      status: 'past_due',
      stripe_customer_id: 'cus_live',
      stripe_subscription_id: 'sub_live',
    };
    mocks.hasProcessedLiveStripeSubscriptionAuthority.mockResolvedValue(true);

    const context = await getOrganizationBillingContext('org_a');

    expect(context.plan).toBe('starter');
    expect(context.status).toBe('past_due');
  });

  it('treats an applied signed contract as independent paid authority', async () => {
    mocks.getAuthoritativeSignedContractPlan.mockResolvedValue('enterprise');

    const context = await getOrganizationBillingContext('org_a');

    expect(context.plan).toBe('enterprise');
    expect(context.status).toBe('active');
    expect(mocks.hasProcessedLiveStripeSubscriptionAuthority).not.toHaveBeenCalled();
  });

  it('does not grant paid entitlements when there is no subscription or contract', async () => {
    const context = await getOrganizationBillingContext('org_a');

    expect(context.plan).toBe('starter');
    expect(context.status).toBeNull();
  });
});
