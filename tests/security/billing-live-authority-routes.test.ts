import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const PORTAL_ROUTE = new URL('../../src/app/api/billing/portal/route.ts', import.meta.url);
const SUBSCRIPTION_ROUTE = new URL('../../src/app/api/billing/subscription/route.ts', import.meta.url);
const LIFECYCLE = new URL('../../src/server/billing/subscription-lifecycle.ts', import.meta.url);
const ACTIVATION_ROUTE = new URL('../../src/app/api/billing/checkout/activation/route.ts', import.meta.url);
const ACTIVATION_CLIENT = new URL('../../src/app/[locale]/checkout/complete/checkout-activation-client.tsx', import.meta.url);

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

  it('does not expose annual self-serve billing before live annual Prices are provider-verified', async () => {
    const source = await readFile(SUBSCRIPTION_ROUTE, 'utf8');

    expect(source).toContain("parsed.data.interval === 'year' || parsed.data.interval === 'annual'");
    expect(source).toContain("{ error: 'annual_billing_not_available' }");
  });

  it('requires live subscription authority before upgrade, downgrade, cancel, reactivate or add-on mutations', async () => {
    const source = await readFile(SUBSCRIPTION_ROUTE, 'utf8');

    const liveLookup = source.indexOf('const liveBinding = await getLiveSubscriptionBinding');
    const mutation = source.indexOf('await mutateSubscriptionLifecycle({');
    expect(liveLookup).toBeGreaterThan(-1);
    expect(mutation).toBeGreaterThan(liveLookup);
    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).toContain("{ error: 'live_stripe_subscription_not_found' }");
  });

  it('schedules downgrades from the existing subscription and preserves the paid current phase', async () => {
    const source = await readFile(LIFECYCLE, 'utf8');
    const downgradeStart = source.indexOf('async function scheduleDowngradeAtPeriodEnd');
    const mutationStart = source.indexOf('export async function mutateSubscriptionLifecycle');
    const downgrade = source.slice(downgradeStart, mutationStart);

    expect(downgradeStart).toBeGreaterThan(-1);
    expect(downgrade).toContain('from_subscription: input.subscription.id');
    expect(downgrade).toContain('currentPhaseParams(currentPhase)');
    expect(downgrade).toContain('futureDowngradePhase({');
    expect(downgrade).toContain("end_behavior: 'release'");
    expect(downgrade).toContain("proration_behavior: 'none'");
    expect(source).toContain('assertPlanTransition(input.action, currentPlan, targetPlan)');
    expect(source).toContain("throw new BillingLifecycleRequestError('billing_invalid_plan_transition', 409)");
    expect(source).toContain("throw new BillingLifecycleRequestError('billing_schedule_conflict', 409)");
  });
});

describe('post-checkout activation UX', () => {
  it('polls one bounded server-authoritative endpoint and never trusts a browser session identifier', async () => {
    const client = await readFile(ACTIVATION_CLIENT, 'utf8');
    const route = await readFile(ACTIVATION_ROUTE, 'utf8');

    expect(client).toContain('const MAX_WAIT_MS = 30000');
    expect(client).toContain("fetch('/api/billing/checkout/activation'");
    expect(client).toContain("data.state === 'activated'");
    expect(client).toContain("window.location.replace(`/${locale}${data.next ?? '/dashboard/organizations'}`)");
    expect(client).toContain('setTimedOut(true)');
    expect(client).not.toContain('session_id');

    expect(route).toContain('getCurrentOrganizationForUser(user.id)');
    expect(route).toContain("new Set(['active'])");
    expect(route).not.toContain("new Set(['active', 'trialing'])");
    expect(route).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(route).toContain('stripeCustomerId: subscription?.stripe_customer_id');
    expect(route).toContain('stripeSubscriptionId: subscription?.stripe_subscription_id');
    expect(route).toContain("authority: 'processed_live_stripe_subscription_event'");
    expect(route).toContain('liveStripeAuthority');
    expect(route).not.toContain("authority: 'persisted_subscription'");
    expect(route).not.toContain('session_id');
  });
});
