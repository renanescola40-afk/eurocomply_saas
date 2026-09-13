import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('add-on purchase payment authority', () => {
  it('routes an eligible add-on through review before provider mutation', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');
    const button = read('src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx');
    const review = read('src/app/[locale]/dashboard/organizations/add-ons/checkout/page.tsx');

    expect(page).toContain('{commerce.add(addOn.name)}');
    expect(button).toContain('/dashboard/organizations/add-ons/checkout');
    expect(button).toContain("preserveExistingAddOns !== false");
    expect(review).toContain('getAddOnPurchasePreview');
    expect(review).toContain('amountDueNowCents');
    expect(review).toContain('taxCents');
    expect(review).toContain('recurringMonthlyCents');
  });

  it('accepts only bounded business intent from the browser', () => {
    const route = read('src/app/api/billing/add-ons/purchase/route.ts');
    const client = read('src/app/[locale]/dashboard/organizations/add-ons/checkout/add-on-purchase-client.tsx');

    expect(route).toContain('addOnSlug: z.string().trim().min(1).max(80)');
    expect(route).toContain('quantity: z.number().int().min(1).max(10_000).optional()');
    expect(route).toContain('}).strict()');
    expect(client).toContain('JSON.stringify({ addOnSlug, quantity })');
    expect(client).not.toMatch(/JSON\.stringify\([^)]*(price|amount|customer|subscription|organization)/i);
  });

  it('uses the existing subscription with payment-gated pending updates', () => {
    const purchase = read('src/server/billing/add-on-purchase.ts');

    expect(purchase).toContain('context.stripe.subscriptions.update(');
    expect(purchase).toContain("payment_behavior: 'pending_if_incomplete'");
    expect(purchase).toContain("proration_behavior: 'always_invoice'");
    expect(purchase).toContain("context.subscription.collection_method !== 'charge_automatically'");
    expect(purchase).not.toContain('subscriptions.create(');
    expect(purchase).not.toContain('checkout.sessions.create(');
  });

  it('does not grant entitlement from the purchase request or browser', () => {
    const purchase = read('src/server/billing/add-on-purchase.ts');
    const route = read('src/app/api/billing/add-ons/purchase/route.ts');
    const client = read('src/app/[locale]/dashboard/organizations/add-ons/checkout/add-on-purchase-client.tsx');

    expect(route).toContain('entitlementGranted: false');
    expect(purchase).toContain('browserEntitlementGranted: false');
    expect(purchase).not.toMatch(/organization_add_ons['"]\)\.upsert/);
    expect(client).toContain('/api/billing/add-ons/status?');
    expect(client).toContain('json.active === true');
  });

  it('keeps signed paid-invoice reconciliation as activation authority', () => {
    const reconciliation = read('src/server/billing/add-on-reconciliation.ts');

    expect(reconciliation).toContain("event.type === 'invoice.paid'");
    expect(reconciliation).toContain('paidInvoiceSubscriptionItemIds(invoice.id)');
    expect(reconciliation).toContain('paidSubscriptionItemIds?.has(item.id)');
    expect(reconciliation).toContain("payment_confirmed: event.type === 'invoice.paid' && paidByCurrentInvoice");
    expect(reconciliation).toContain("if (!paidByCurrentInvoice)");
  });

  it('requires billing authorization, trusted mutation, idempotency, step-up and release gate', () => {
    const route = read('src/app/api/billing/add-ons/purchase/route.ts');

    expect(route).toContain("permission: 'manage_billing'");
    expect(route).toContain('requireTrustedMutation(request');
    expect(route).toContain("policy: 'billing-checkout'");
    expect(route).toContain('readBillingIdempotencyKey(request');
    expect(route).toContain("action: 'manage_billing'");
    expect(route).toContain('isAddOnCheckoutEnabled()');
    expect(route).toContain("error: 'add_on_checkout_not_enabled'");
  });

  it('uses the Stripe hosted invoice flow and validates invoice status against tenant billing authority', () => {
    const purchase = read('src/server/billing/add-on-purchase.ts');
    const client = read('src/app/[locale]/dashboard/organizations/add-ons/checkout/add-on-purchase-client.tsx');
    const status = read('src/app/api/billing/add-ons/status/route.ts');

    expect(purchase).toContain('hosted_invoice_url');
    expect(purchase).toContain('invoiceSubscriptionId(invoice) !== binding.stripe_subscription_id');
    expect(purchase).toContain('stripeObjectId(invoice.customer) !== binding.stripe_customer_id');
    expect(client).toContain('hostedInvoiceUrl');
    expect(client).toContain('query.set(\'invoice\', providerInvoiceId)');
    expect(client).toContain('target="_blank"');
    expect(client).toContain('window.setInterval');
    expect(status).toContain('getOrganizationAddOnPurchaseStatus');
    expect(status).toContain('parsedInvoice.data');
    expect(status).toContain('noStoreJson(result)');
  });

  it('keeps preview products visibly coming soon without a purchase path', () => {
    const catalog = read('src/lib/billing/add-ons.ts');
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(catalog).toContain("addOn('api-pack'");
    expect(catalog).toContain("addOn('white-label'");
    expect(catalog).toContain("addOn('extra-user'");
    expect(page).toContain("comingSoon: 'Disponível em breve'");
    expect(page).toContain("status === 'preview'");
    expect(page).toContain('commerce.comingSoon');
  });
});
