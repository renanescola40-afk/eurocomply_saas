import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const PORTAL_ROUTE = new URL('../../src/app/api/billing/portal/route.ts', import.meta.url);
const SUBSCRIPTION_ROUTE = new URL('../../src/app/api/billing/subscription/route.ts', import.meta.url);
const COMPLETE_PAGE = new URL('../../src/app/[locale]/checkout/complete/page.tsx', import.meta.url);

describe('billing portal authority', () => {
  it('requires a correlated live Stripe subscription and excludes signed contracts', async () => {
    const source = await readFile(PORTAL_ROUTE, 'utf8');

    expect(source).toContain('getAuthoritativeSignedContractPlan(organization.id)');
    expect(source).toContain("{ error: 'contract_managed_billing' }");
    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).toContain("{ error: 'live_stripe_subscription_not_found' }");
    expect(source).toContain('stripeSubscriptionId: subscription.stripe_subscription_id');
    expect(source).toContain('liveSubscriptionAuthority: true');
  });
});

describe('billing lifecycle authority', () => {
  it('allows generic plan mutation only for canonical self-serve plans', async () => {
    const source = await readFile(SUBSCRIPTION_ROUTE, 'utf8');

    expect(source).toContain('!isSelfServePlan(plan)');
    expect(source).toContain("{ error: 'sales_assisted_plan_required' }");
    expect(source).toContain('getAuthoritativeSignedContractPlan(organization.id)');
    expect(source).toContain("{ error: 'contract_managed_billing' }");
  });

  it('requires live subscription authority before upgrade, cancel, reactivate or add-on mutations', async () => {
    const source = await readFile(SUBSCRIPTION_ROUTE, 'utf8');

    const liveLookup = source.indexOf('const liveBinding = await getLiveSubscriptionBinding');
    const mutation = source.indexOf('await mutateSubscriptionLifecycle({');
    expect(liveLookup).toBeGreaterThan(-1);
    expect(mutation).toBeGreaterThan(liveLookup);
    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).toContain("{ error: 'live_stripe_subscription_not_found' }");
  });

  it('blocks the old immediate downgrade implementation rather than reducing entitlements mid-period', async () => {
    const source = await readFile(SUBSCRIPTION_ROUTE, 'utf8');

    expect(source).toContain("parsed.data.action === 'downgrade'");
    expect(source).toContain("{ error: 'billing_downgrade_schedule_required' }");
  });
});

describe('post-checkout activation UX', () => {
  it('polls a bounded authoritative endpoint and never grants access itself', async () => {
    const source = await readFile(COMPLETE_PAGE, 'utf8');

    expect(source).toContain('const MAX_POLLS = 20');
    expect(source).toContain('/api/billing/checkout/status?session_id=');
    expect(source).toContain("body.state === 'ready'");
    expect(source).toContain("window.location.replace(`/${locale}/dashboard/organizations?checkout=success`)");
    expect(source).toContain("setState('timeout')");
  });
});
