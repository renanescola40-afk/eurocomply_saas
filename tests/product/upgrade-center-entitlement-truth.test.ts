import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('upgrade center entitlement truth', () => {
  it('renders the canonical billing catalog and real organization add-on state', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(page).toContain('BILLING_ADD_ONS');
    expect(page).toContain('listActiveOrganizationAddOns');
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

  it('never presents an unimplemented add-on checkout as a completed purchase path', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');
    const copy = read('src/lib/i18n/add-ons-copy.ts');

    expect(page).not.toMatch(/api\/billing\/checkout[^'"`]*add-?on/i);
    expect(page).toContain('copy.noDirectPurchase');
    expect(copy).toContain('RISCK COMPLY will not show a fake purchase button');
    expect(copy).toContain('A RISCK COMPLY não mostrará um botão de compra falso');
  });

  it('routes locked capability UX through the organization Upgrade Center first', () => {
    const card = read('src/components/billing/upgrade-required-card.tsx');

    expect(card).toContain('/dashboard/organizations/add-ons');
    expect(card).toContain('addOnSlug');
    expect(card).toContain('encodeURIComponent(addOnSlug)');
    expect(card).toContain('/pricing');
    expect(card).toContain('Access changes only after billing confirms the entitlement.');
  });

  it('honors an active advanced-reporting add-on instead of checking only the plan tier', () => {
    const reports = read('src/app/[locale]/dashboard/organizations/reports-governance/page.tsx');

    expect(reports).toContain("canAccessFeature('advanced_reporting'");
    expect(reports).toContain('listActiveOrganizationAddOns');
    expect(reports).toContain('activeAddOns,');
    expect(reports).toContain('addOnSlug="advanced-reporting"');
    expect(reports).not.toContain("isPlanAtLeast(entitlements.plan, 'business')");
  });

  it('localizes the Upgrade Center chrome across every configured product language', () => {
    const copy = read('src/lib/i18n/add-ons-copy.ts');

    for (const locale of ['en', 'pt', 'es', 'fr', 'it', 'de']) {
      expect(copy).toContain(`${locale}: {`);
    }
    expect(copy).toContain('billingAuthorityBody');
    expect(copy).toContain('contactBillingAdmin');
    expect(copy).toContain('categories:');
  });
});
