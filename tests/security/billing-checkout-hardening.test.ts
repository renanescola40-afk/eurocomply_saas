import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const CHECKOUT_ROUTE = new URL('../../src/app/api/billing/checkout/route.ts', import.meta.url);
const ACTIVATION_ROUTE = new URL('../../src/app/api/billing/checkout/activation/route.ts', import.meta.url);

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

  it('prevents a second Checkout subscription for an organization with proven live billing', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');
    const stepUp = source.indexOf('const stepUp = hasLiveSubscription');
    const liveBranchStart = source.indexOf('if (hasLiveSubscription) {');
    const liveBranch = source.slice(
      liveBranchStart,
      source.indexOf('const stripe = getStripeClient();'),
    );

    expect(stepUp).toBeGreaterThan(-1);
    expect(liveBranchStart).toBeGreaterThan(stepUp);
    expect(source.slice(stepUp, liveBranchStart)).toContain('requireStepUpForRequest');
    expect(liveBranch).toContain('mutateSubscriptionLifecycle');
    expect(liveBranch).toContain("? 'downgrade' : 'upgrade'");
    expect(liveBranch).not.toContain('stripe.checkout.sessions.create');
  });

  it('keeps negotiated contracts and sales-led plans out of generic self-serve checkout', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');

    expect(source).toContain('getAuthoritativeSignedContractPlan(organization.id)');
    expect(source).toContain("{ error: 'contract_managed_billing' }");
    expect(source).toContain('!isSelfServePlan(normalizedPlan)');
  });

  it('lands successful Checkout on the existing fail-closed activation surface, never directly on the dashboard', async () => {
    const source = await readFile(CHECKOUT_ROUTE, 'utf8');

    expect(source).toContain('success_url: `${returnBaseUrl.appUrl}/${locale}/checkout/complete`');
    expect(source).not.toContain('/dashboard/organizations?checkout=success');
    expect(source).not.toContain('session_id={CHECKOUT_SESSION_ID}');
  });

  it('derives activation authority only from current tenant, canonical Stripe ids and a processed live active event', async () => {
    const source = await readFile(ACTIVATION_ROUTE, 'utf8');

    expect(source).toContain('await requireApiUser()');
    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain("new Set(['active'])");
    expect(source).not.toContain("new Set(['active', 'trialing'])");
    expect(source).toContain(".eq('organization_id', organizationId)");
    expect(source).toContain('stripe_customer_id');
    expect(source).toContain('stripe_subscription_id');
    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).toContain("authority: 'processed_live_stripe_subscription_event'");
    expect(source).not.toContain("authority: 'persisted_subscription'");
    expect(source).not.toContain('session_id');
    expect(source).not.toContain('checkout=success');
  });

  it('rate-limits activation polling fail closed and leaves every unproven state pending', async () => {
    const source = await readFile(ACTIVATION_ROUTE, 'utf8');

    expect(source).toContain('checkDistributedRateLimit');
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("state: activated ? 'activated' : 'pending'");
    expect(source).toContain('const activated = hasActivatableStatus && hasCanonicalStripeBinding && liveStripeAuthority');
    expect(source).toContain("...(activated ? { next: '/dashboard/organizations' } : {})");
  });
});