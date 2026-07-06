/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tryCreateAdminClient: vi.fn(),
  noStore: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: mocks.noStore,
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateAdminClient: mocks.tryCreateAdminClient,
}));

import { getOrganizationBillingContext } from './billing';

type SubscriptionRow = { plan: string | null; status: string | null } | null;

let subscriptionRow: SubscriptionRow;
let countByTable: Record<string, number>;
let subscriptionStatusFilters: string[];

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
    in: vi.fn((_column: string, statuses: string[]) => {
      subscriptionStatusFilters = statuses;
      return builder;
    }),
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
    subscriptionStatusFilters = [];
    mocks.tryCreateAdminClient.mockReturnValue(makeSupabaseClient());
  });

  it('uses the active subscription plan when Stripe has a valid subscription', async () => {
    subscriptionRow = { plan: 'business', status: 'active' };

    const context = await getOrganizationBillingContext('org_a');

    expect(subscriptionStatusFilters).toEqual([]);
    expect(context).toEqual({
      plan: 'growth',
      status: 'active',
      usage: {
        users: 2,
        documents: 5,
        vendors: 1,
        risks: 3,
      },
    });
  });

  it('preserves delinquent subscription status without granting paid entitlements', async () => {
    subscriptionRow = { plan: 'business', status: 'past_due' };

    const context = await getOrganizationBillingContext('org_a');

    expect(subscriptionStatusFilters).toEqual([]);
    expect(context.plan).toBe('starter');
    expect(context.status).toBe('past_due');
  });

  it('does not grant paid entitlements when there is no subscription row', async () => {
    subscriptionRow = null;

    const context = await getOrganizationBillingContext('org_a');

    expect(subscriptionStatusFilters).toEqual([]);
    expect(context.plan).toBe('starter');
    expect(context.status).toBeNull();
  });
});
