import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/subscription.ts', import.meta.url);
const AUTHORITY_FILE = new URL('../../src/server/billing/subscription-authority.ts', import.meta.url);

describe('subscription plan read failure contract', () => {
  it('propagates unexpected subscription lookup failures', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const lookup = source.slice(
      source.indexOf('async function getLatestSubscriptionRow'),
      source.indexOf('async function rowHasLiveStripeAuthority'),
    );

    expect(source).toContain("const SUBSCRIPTION_PLAN_UNAVAILABLE = 'subscription_plan_unavailable';");
    expect(lookup).toContain("console.warn('[subscription] plan_lookup_failed'");
    expect(lookup).toContain('throw new Error(SUBSCRIPTION_PLAN_UNAVAILABLE);');
  });

  it('limits legacy schema fallback to PostgreSQL undefined-column errors', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("if (error.code === '42703') return null;");
    expect(source).toContain("'plan,status,created_at,stripe_customer_id,stripe_subscription_id'");
    expect(source).toContain("'tier,status,created_at,stripe_customer_id,stripe_subscription_id'");
  });

  it('does not grant paid plans from status-only or test-mode subscription rows', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const authority = await readFile(AUTHORITY_FILE, 'utf8');

    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).toContain('if (!row?.stripe_customer_id || !row.stripe_subscription_id) return false;');
    expect(source).toContain("return 'starter';");

    expect(authority).toContain(".eq('livemode', true)");
    expect(authority).toContain(".eq('status', 'processed')");
    expect(authority).toContain("'customer.subscription.created'");
    expect(authority).toContain("'customer.subscription.updated'");
    expect(authority).toContain('row.payload?.data?.object?.id === stripeSubscriptionId');
    expect(authority).toContain('stripeObjectCustomerId(row.payload) === stripeCustomerId');
  });

  it('keeps signed Enterprise contracts independent from ordinary Stripe lifecycle', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const authority = await readFile(AUTHORITY_FILE, 'utf8');

    const contractLookup = source.indexOf('getAuthoritativeSignedContractPlan(organizationId)');
    const stripeLookup = source.indexOf('const primary = await getLatestSubscriptionRow');
    expect(contractLookup).toBeGreaterThan(-1);
    expect(stripeLookup).toBeGreaterThan(contractLookup);

    expect(authority).toContain(".eq('source_kind', 'signed_contract')");
    expect(authority).toContain(".eq('status', 'applied')");
    expect(authority).toContain(".eq('active', true)");
  });
});
