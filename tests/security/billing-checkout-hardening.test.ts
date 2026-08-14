import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const CHECKOUT_ROUTE = new URL('../../src/app/api/billing/checkout/route.ts', import.meta.url);
const STATUS_ROUTE = new URL('../../src/app/api/billing/checkout/status/route.ts', import.meta.url);

describe('billing checkout authority contract', () => {
  it('keeps authentication, RBAC, trusted mutation and server-side plan authority ahead of Stripe mutation', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');

    const auth = source.indexOf('await requireApiUser()');
    const permission = source.indexOf('await requirePermission({');
    const trustedMutation = source.indexOf('await requireTrustedMutation(request');
    const parseBody = source.indexOf('checkoutBodySchema.safeParse');
    const selfServe = source.indexOf('isSelfServePlan(normalizedPlan)');
    const stripeMutation = source.indexOf('stripe.checkout.sessions.create');

    expect(auth).toBeGreaterThan(-1);
    expect(permission).toBeGreaterThan(auth);
    expect(trustedMutation).toBeGreaterThan(permission);
    expect(parseBody).toBeGreaterThan(trustedMutation);
    expect(selfServe).toBeGreaterThan(parseBody);
    expect(stripeMutation).toBeGreaterThan(selfServe);
  });

  it('does not treat a status-only or test-mode database row as an existing paid relationship', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');

    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).not.toContain('function hasExistingBillingRelationship');
    expect(source).toContain('const hasLiveSubscription = await hasLiveSubscriptionRelationship');
    expect(source).toContain("status: 'incomplete'");
    expect(source).toContain("plan: 'starter'");
    expect(source).toContain("tier: 'starter'");
    expect(source).toContain('pendingCustomerBindingPersisted: true');
  });

  it('repairs only the precise live-provider resource_missing case for stale test customer ids', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');

    expect(source).toContain("(error as { code?: unknown }).code === 'resource_missing'");
    expect(source).toContain("throw classifyProviderFailure('stripe', 'customer_update', error)");
    expect(source).toContain('await stripe.customers.del(customer.id)');
    expect(source).toContain("deriveStripeIdempotencyKey(idempotency, 'customer-create')");
  });

  it('prevents a second self-serve subscription for an organization with proven live billing', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');
    const liveBranch = source.slice(
      source.indexOf('if (hasLiveSubscription) {'),
      source.indexOf('const stripe = getStripeClient();'),
    );

    expect(liveBranch).toContain('mutateSubscriptionLifecycle');
    expect(liveBranch).toContain("action: 'upgrade'");
    expect(liveBranch).toContain("billing_downgrade_schedule_required");
    expect(liveBranch).not.toContain('stripe.checkout.sessions.create');
  });

  it('keeps negotiated contracts out of generic self-serve checkout', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');

    expect(source).toContain('getAuthoritativeSignedContractPlan(organization.id)');
    expect(source).toContain("{ error: 'contract_managed_billing' }");
    expect(source).toContain('isSelfServePlan(normalizedPlan)');
  });

  it('lands successful Checkout outside the dashboard gate with the Stripe session placeholder', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');

    expect(source).toContain('/checkout/complete?session_id={CHECKOUT_SESSION_ID}');
    expect(source).not.toContain('/dashboard/organizations?checkout=success`');
  });
});

describe('post-checkout status authority contract', () => {
  it('never grants readiness from the query string or payment status alone', async () => {
    const source = await readFile(STATUS_ROUTE, 'utf8');

    expect(source).toContain('await stripe.checkout.sessions.retrieve(sessionId)');
    expect(source).toContain('sessionBelongsToOrganization(session, organization.id)');
    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).toContain("ACCESS_STATUSES.has(subscription?.status ?? '')");
    expect(source).toContain('exactBinding && liveAuthority');
    expect(source).toContain("state: paymentAccepted ? 'pending' : 'failed'");
  });

  it('fails closed for delinquent, canceled and expired subscription states', async () => {
    const source = await readFile(STATUS_ROUTE, 'utf8');

    expect(source).toContain("const FAIL_CLOSED_STATUSES = new Set(['past_due', 'unpaid', 'canceled', 'incomplete_expired'])");
    expect(source).toContain("state: 'failed'");
    expect(source).toContain("checkout_session_not_found");
  });
});
