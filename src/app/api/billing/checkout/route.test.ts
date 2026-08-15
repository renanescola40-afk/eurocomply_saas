import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const ROUTE_FILE = new URL('./route.ts', import.meta.url);

describe('billing checkout route contract', () => {
  it('keeps all security gates before Stripe checkout mutation', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    const auth = source.indexOf('await requireApiUser()');
    const permission = source.indexOf('await requirePermission({');
    const originAndRate = source.indexOf('await requireTrustedMutation(request');
    const bodyValidation = source.indexOf('checkoutBodySchema.safeParse');
    const idempotency = source.indexOf('readBillingIdempotencyKey(request');
    const stripeCheckout = source.indexOf('stripe.checkout.sessions.create');

    expect(auth).toBeGreaterThan(-1);
    expect(permission).toBeGreaterThan(auth);
    expect(originAndRate).toBeGreaterThan(permission);
    expect(bodyValidation).toBeGreaterThan(originAndRate);
    expect(idempotency).toBeGreaterThan(bodyValidation);
    expect(stripeCheckout).toBeGreaterThan(idempotency);
  });

  it('keeps sales-led plans out of generic self-serve checkout', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    expect(source).toContain('!isSelfServePlan(normalizedPlan)');
    expect(source).toContain("return noStoreJson({ error: 'invalid_plan' }, { status: 400 });");
    expect(source).toContain('getAuthoritativeSignedContractPlan(organization.id)');
    expect(source).toContain("contract_managed_billing");
  });

  it('uses live event correlation rather than database status to decide whether billing already exists', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).toContain('const hasLiveSubscription = await hasLiveSubscriptionRelationship');
    expect(source).not.toContain('hasExistingBillingRelationship');
  });

  it('does not create a second subscription for an existing live subscriber', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');
    const stepUp = source.indexOf('const stepUp = hasLiveSubscription');
    const existingBranch = source.indexOf('if (hasLiveSubscription) {');
    const existingFlow = source.slice(
      existingBranch,
      source.indexOf('const stripe = getStripeClient();'),
    );

    expect(stepUp).toBeGreaterThan(-1);
    expect(existingBranch).toBeGreaterThan(stepUp);
    expect(source.slice(stepUp, existingBranch)).toContain('requireStepUpForRequest');
    expect(existingFlow).toContain('mutateSubscriptionLifecycle');
    expect(existingFlow).toContain("? 'downgrade' : 'upgrade'");
    expect(existingFlow).toContain('billingOutcome');
    expect(existingFlow).not.toContain('stripe.checkout.sessions.create');
  });

  it('persists one non-entitled live customer binding before redirecting a first-time payer', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    const persist = source.indexOf('await persistPendingLiveCustomerBinding');
    const createCheckout = source.indexOf('stripe.checkout.sessions.create');
    expect(persist).toBeGreaterThan(-1);
    expect(createCheckout).toBeGreaterThan(persist);
    expect(source).toContain("plan: 'starter'");
    expect(source).toContain("tier: 'starter'");
    expect(source).toContain("status: 'incomplete'");
    expect(source).toContain('stripe_subscription_id: null');
    expect(source).toContain('pendingCustomerBindingPersisted: true');
  });

  it('repairs a historical test customer only when live Stripe reports resource_missing', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    expect(source).toContain("(error as { code?: unknown }).code === 'resource_missing'");
    expect(source).toContain("throw classifyProviderFailure('stripe', 'customer_update', error)");
    expect(source).toContain("deriveStripeIdempotencyKey(idempotency, 'customer-create')");
    expect(source).toContain('await stripe.customers.del(customer.id)');
  });

  it('hands successful hosted Checkout to the existing fail-closed activation surface', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    expect(source).toContain('success_url: `${returnBaseUrl.appUrl}/${locale}/checkout/complete`');
    expect(source).not.toContain('/dashboard/organizations?checkout=success');
    expect(source).not.toContain('session_id={CHECKOUT_SESSION_ID}');
    expect(source).toContain('stepUpRequired: false');
  });

  it('fails closed if the audit trail cannot be persisted after creating Checkout', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    const audit = source.indexOf('const auditResult = await writeAuditLog');
    const failClosed = source.indexOf('if (!auditResult.persisted)');
    const expire = source.indexOf('await stripe.checkout.sessions.expire(session.id)');
    const success = source.lastIndexOf('return noStoreJson({');

    expect(audit).toBeGreaterThan(-1);
    expect(failClosed).toBeGreaterThan(audit);
    expect(expire).toBeGreaterThan(failClosed);
    expect(success).toBeGreaterThan(failClosed);
    expect(source).toContain("{ error: 'checkout_audit_unavailable' }");
  });
});
