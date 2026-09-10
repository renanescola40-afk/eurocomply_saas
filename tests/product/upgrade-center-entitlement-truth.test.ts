import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('upgrade center entitlement truth', () => {
  it('renders the canonical billing catalog and real organization add-on state', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(page).toContain('BILLING_ADD_ONS');
    expect(page).toContain('listActiveOrganizationAddOnSelections');
    expect(page).toContain('getOrganizationEntitlements');
    expect(page).toContain("normalizePlan(entitlements.plan)");
    expect(page).toContain("roleHasPermission(role, 'manage_billing')");
    expect(page).toContain("export const fetchCache = 'force-no-store'");
  });

  it('removes browser/demo commercial authority and unsupported credit-store merchandising', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(page).not.toContain('NEXT_PUBLIC_ENABLE_ENTERPRISE_DEMO');
    expect(page).not.toContain('Enterprise demo');
    expect(page).not.toContain('CREDIT_PACKS');
    expect(page).not.toContain('demo ===');
  });

  it('uses the protected subscription lifecycle instead of a fake add-on checkout', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');
    const billingButton = read('src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx');

    expect(page).not.toMatch(/api\/billing\/checkout[^'"`]*add-?on/i);
    expect(page).toContain('action="replace_add_ons"');
    expect(billingButton).toContain("fetch('/api/billing/subscription'");
    expect(billingButton).toContain("action: 'replace_add_ons'");
    expect(billingButton).toContain('preserveExistingAddOns: true');
    expect(billingButton).toContain('Idempotency-Key');
    expect(billingButton).toContain("json.error === 'step_up_required'");
  });

  it('routes locked capability UX through the organization Upgrade Center first', () => {
    const card = read('src/components/billing/upgrade-required-card.tsx');

    expect(card).toContain('/dashboard/organizations/add-ons');
    expect(card).toContain('addOnSlug');
    expect(card).toContain('encodeURIComponent(addOnSlug)');
    expect(card).toContain('/pricing');
    expect(card).toContain('Access changes only after billing confirms the entitlement.');
  });

  it('renders preview catalog prices without a purchase CTA', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');
    const catalog = read('src/lib/billing/add-ons.ts');

    expect(catalog).toContain("options.status ?? 'private_preview'");
    expect(page).toContain("status === 'preview'");
    expect(page).toContain('€{addOn.priceMonthly}');
    expect(page).toContain('status === \'available\' && canManageBilling');
    expect(page).not.toMatch(/status === 'preview'[\s\S]{0,350}action="replace_add_ons"/);
  });

  it('keeps feature add-on slugs bounded by canonical commercial eligibility', () => {
    const featureGates = read('src/lib/billing/feature-gates.ts');
    const organizationAddOns = read('src/server/billing/addons.ts');

    expect(featureGates).toContain('isAddOnAvailableForPlan(addOn, context.plan)');
    expect(featureGates).toContain('A persisted/client-supplied slug is never enough by itself.');
    expect(organizationAddOns).toContain('isBillingAddOnCommerciallyActive(catalogAddOn)');
  });

  it('uses Stripe provider items rather than database rows to preserve existing purchases', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');
    const route = read('src/app/api/billing/subscription/route.ts');
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');

    expect(page).toContain('addOns={[{ slug: addOn.slug, quantity: 1 }]}');
    expect(page).not.toContain("[...activeAddOnSelections, { slug: addOn.slug, quantity: 1 }]");
    expect(route).toContain('preserveExistingAddOns: z.boolean().optional()');
    expect(lifecycle).toContain('getProviderAddOnSelections(subscription, baseItemId)');
    expect(lifecycle).toContain('mergeProviderAddOnSelections(subscription, baseItem.id, input.addOns, targetPlan)');
  });

  it('keeps the purchase CTA interval-neutral while showing both catalog prices', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(page).toContain('€{addOn.priceMonthly}');
    expect(page).toContain('€{addOn.priceAnnual}');
    expect(page).toContain('{commerce.add(addOn.name)}');
    expect(page).not.toContain('{commerce.add(addOn.name, addOn.priceMonthly)}');
  });

  it('localizes the Upgrade Center chrome across every configured product language', () => {
    const copy = read('src/lib/i18n/add-ons-copy.ts');
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    for (const locale of ['en', 'pt', 'es', 'fr', 'it', 'de']) {
      expect(copy).toContain(`${locale}: {`);
    }
    expect(copy).toContain('billingAuthorityBody');
    expect(copy).toContain('contactBillingAdmin');
    expect(copy).toContain('categories:');
    expect(page).toContain('function commerceCopy(locale: string)');
  });
});
