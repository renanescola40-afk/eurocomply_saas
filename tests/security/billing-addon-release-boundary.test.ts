import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('add-on release boundary integration', () => {
  it('keeps the Upgrade Center catalog-only until the server release gate is open', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(page).toContain("import { isAddOnCheckoutEnabled } from '@/server/billing/add-on-release'");
    expect(page).toContain('const addOnCheckoutEnabled = isAddOnCheckoutEnabled()');
    expect(page).toContain("status === 'available' && canManageBilling && addOnCheckoutEnabled");
    expect(page).toContain("status === 'available' && canManageBilling && !addOnCheckoutEnabled");
  });

  it('blocks direct add-on subscription mutation before Stripe when release is closed', () => {
    const route = read('src/app/api/billing/subscription/route.ts');

    expect(route).toContain("parsed.data.action === 'replace_add_ons' && !isAddOnCheckoutEnabled()");
    expect(route).toContain("error: 'add_on_checkout_not_enabled'");
    expect(route.indexOf("error: 'add_on_checkout_not_enabled'")).toBeLessThan(route.indexOf('getLiveSubscriptionBinding(organization.id)'));
    expect(route.indexOf("error: 'add_on_checkout_not_enabled'")).toBeLessThan(route.indexOf('mutateSubscriptionLifecycle({'));
  });

  it('requires explicit base billing, owner approval and exact deployed SHA', () => {
    const release = read('src/server/billing/add-on-release.ts');

    expect(release).toContain("environment.ADDON_CHECKOUT_ENABLED === 'true'");
    expect(release).toContain("environment.ADDON_BASE_BILLING_RUNTIME_ACCEPTED === 'true'");
    expect(release).toContain("environment.OWNER_ENABLEMENT_AUTHORIZED === 'true'");
    expect(release).toContain('environment.ADDON_ACCEPTED_PRODUCTION_SHA');
    expect(release).toContain('runtime.commitSha === acceptedProductionSha');
  });
});
