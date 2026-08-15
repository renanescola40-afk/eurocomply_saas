import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const ROUTE_FILE = new URL('./route.ts', import.meta.url);

describe('billing checkout route contract', () => {
  it('keeps all security gates before Stripe checkout mutation', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    const auth = source.indexOf('await requireApiUser()');
    const permission = source.indexOf('await requirePermission({');
    const originAndRate = source.indexOf('await requireTrustedMutation(request');
    const idempotency = source.indexOf('readBillingIdempotencyKey(request');
    const stripeCheckout = source.indexOf('stripe.checkout.sessions.create');

    expect(auth).toBeGreaterThan(-1);
    expect(permission).toBeGreaterThan(auth);
    expect(originAndRate).toBeGreaterThan(permission);
    expect(idempotency).toBeGreaterThan(originAndRate);
    expect(stripeCheckout).toBeGreaterThan(idempotency);
  });

  it('keeps Business and Enterprise out of generic self-serve checkout', async () => {
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
    expect(existingFlow).toContain("action,");
    expect(existingFlow).toContain("billingOutcome = action === 'downgrade' ? 'scheduled' : 'updated'");
    expect(existingFlow).not.toContain('stripe.checkout.sessions.create');
  });

  it('persists one pending live customer binding before redirecting a first-time payer', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    const persist = source.indexOf('await persistPendingLiveCustomerBinding');
    const createCheckout = source.indexOf('stripe.checkout.sessions.create');
    expect(persist).toBeGreaterThan(-1);
    expect(createCheckout).toBeGreaterThan(persist);
    expect(source).toContain("plan: 'starter'");
    expect(source).toContain("tier: 'starter'");
    expect(source).toContain("status: 'incomplete'");
    expect(source).toContain("stripe_subscription_id: null");
  });

  it('repairs a historical test customer only when live Stripe reports resource_missing', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    expect(source).toContain("(error as { code?: unknown }).code === 'resource_missing'");
    expect(source).toContain("throw classifyProviderFailure('stripe', 'customer_update', error)");
    expect(source).toContain('await stripe.customers.del(customer.id)');
  });

  it('uses a bounded authoritative confirmation handoff after hosted Checkout', async () => {
    const source = await readFile(ROUTE_FILE, 'utf8');

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: 'https://checkout.stripe.com/session-fixture', idempotencyProtected: true, stepUpRequired: false });
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.stripeCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.test',
        name: 'Acme Corp',
        metadata: expect.objectContaining({
          organization_id: 'org_a',
          plan: 'starter',
          billing_flow: 'initial_subscription',
          step_up_action: 'not_required_initial_checkout',
        }),
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining('risck:checkout:') }),
    );
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_created_for_org_a',
        line_items: [{ price: 'price_starter', quantity: 1 }],
        success_url: 'https://app.eurocomply.test/pt/checkout/complete',
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining('risck:checkout:') }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'checkout_created',
      metadata: expect.objectContaining({
        billingFlow: 'initial_subscription',
        stepUpRequired: false,
        idempotencyProtected: true,
      }),
    }));
  });

  it('protects an existing billing change with step-up and reuses the mapped Stripe customer', async () => {
    const response = await POST(buildRequest({ plan: 'business', locale: 'en' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: 'https://checkout.stripe.com/session-fixture', idempotencyProtected: true, stepUp: { verified: true } });
    expect(mocks.assertOrganizationPermission).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user_admin',
      organizationId: 'org_a',
      permission: 'manage_billing',
    }));
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledWith(expect.objectContaining({
      action: 'manage_billing',
      userId: 'user_admin',
      organizationId: 'org_a',
    }));
    expect(mocks.stripeCustomerUpdate).toHaveBeenCalledWith(
      'cus_existing_for_org_a',
      expect.objectContaining({ metadata: expect.objectContaining({ plan: 'growth' }) }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining('risck:checkout:') }),
    );
    expect(mocks.stripeCustomerCreate).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing_for_org_a',
        line_items: [{ price: 'price_growth', quantity: 1 }],
        metadata: expect.objectContaining({
          billing_flow: 'existing_billing_change',
          step_up_action: 'manage_billing',
        }),
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining('risck:checkout:') }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'checkout_created',
      metadata: expect.objectContaining({
        billingFlow: 'existing_billing_change',
        stepUpRequired: true,
        stepUpAction: 'manage_billing',
        idempotencyProtected: true,
      }),
    }));
  });
});
