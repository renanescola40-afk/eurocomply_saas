import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { canAccessFeature } from '../../src/lib/billing/feature-gates';

const SUBSCRIPTION_QUERY = new URL('../../src/server/queries/subscription.ts', import.meta.url);
const ENTITLEMENTS = new URL('../../src/server/billing/entitlements.ts', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const MIDDLEWARE = new URL('../../src/middleware.ts', import.meta.url);
const CHECKOUT_INTENT = new URL('../../src/app/api/billing/checkout-intent/route.ts', import.meta.url);
const RBAC = new URL('../../src/server/security/rbac.ts', import.meta.url);
const FRIA_ROUTE = new URL('../../src/app/api/ai-governance/fria/route.ts', import.meta.url);
const ANNEX_IV_ROUTE = new URL('../../src/app/api/ai-governance/annex-iv/route.ts', import.meta.url);
const QMS_ROUTE = new URL('../../src/app/api/ai-governance/qms/route.ts', import.meta.url);
const REGULATORY_CONTROL_TOWER_ROUTE = new URL('../../src/app/api/ai-governance/regulatory-control-tower/route.ts', import.meta.url);

describe('billing commercial authority boundary', () => {
  it('keeps catalog plan labels separate from durable paid authority', async () => {
    const source = await readFile(SUBSCRIPTION_QUERY, 'utf8');

    expect(source).toContain('export async function getOrganizationBillingAuthority');
    expect(source).toContain("return { plan: 'starter', licensed: false, source: 'none' };");
    expect(source).toContain("if (!authority.licensed || !isPlanAtLeast(authority.plan, minimumPlan))");
    expect(source).toContain("throw new Error(SUBSCRIPTION_PLAN_UNAVAILABLE);");
    expect(source).not.toContain("normalized === 'free' ? 'starter'");
  });

  it('zeros paid entitlements when no authoritative subscription or contract exists', async () => {
    const source = await readFile(ENTITLEMENTS, 'utf8');
    const unlicensed = source.slice(
      source.indexOf('const UNLICENSED_ENTITLEMENTS'),
      source.indexOf('export function formatLimit'),
    );

    expect(unlicensed).toContain('maxDocuments: 0');
    expect(unlicensed).toContain('maxUsers: 0');
    expect(unlicensed).toContain('auditLog: false');
    expect(unlicensed).toContain('employeeInvites: false');
    expect(unlicensed).toContain('csvExports: false');
    expect(source).toContain('if (!authority.licensed)');
    expect(source).toContain("error: 'subscription_required'");
  });

  it('never allows plan rank, add-ons or flags to override licensed=false', () => {
    expect(canAccessFeature('ai_inventory', { plan: 'starter', licensed: false })).toBe(false);
    expect(canAccessFeature('regulatory_monitoring', {
      plan: 'starter',
      licensed: false,
      activeAddOns: ['regulatory-monitoring-pro'],
    })).toBe(false);
    expect(canAccessFeature('ai_inventory', { plan: 'starter', licensed: true })).toBe(true);
  });

  it('gates dashboard product surfaces through the canonical guard while retaining billing recovery routes', async () => {
    const source = await readFile(DASHBOARD_LAYOUT, 'utf8');

    expect(source).toContain('classifyLocalizedCommercialRoute');
    expect(source).toContain("commercialRouteClass === 'billing_recovery'");
    expect(source).toContain('requireLicensedCommercialPageAccess');
    expect(source).toContain('selectedPlan={authority.plan}');
  });

  it('strips the historical premium query override before product rendering', async () => {
    const source = await readFile(MIDDLEWARE, 'utf8');

    expect(source).toContain("const PREMIUM_NEWS_PATH = '/dashboard/organizations/reports-governance/news';");
    expect(source).toContain("safeUrl.searchParams.delete('premium');");
    expect(source).toContain("requestHeaders.set(INTERNAL_PATHNAME_HEADER, req.nextUrl.pathname);");
  });

  it('keeps unlicensed organizations checkout eligible and sales-led plans out of self-serve', async () => {
    const source = await readFile(CHECKOUT_INTENT, 'utf8');

    expect(source).toContain("starter: 'starter'");
    expect(source).toContain('const alreadyOnPlan = entitlements.licensed &&');
    expect(source).toContain('const priceId = plan.salesLed ? undefined : getStripePriceId(plan);');
    expect(source).toContain("? 'contact_sales'");
    expect(source).toContain('checkoutReady: !plan.salesLed');
  });

  it('requires durable commercial authority on direct paid product API permissions', async () => {
    const source = await readFile(RBAC, 'utf8');
    const commercialPermissions = source.slice(
      source.indexOf('const COMMERCIAL_PRODUCT_PERMISSIONS'),
      source.indexOf('const MINIMUM_PLAN_BY_PERMISSION'),
    );

    expect(commercialPermissions).toContain("'manage_ai_governance'");
    expect(commercialPermissions).toContain("'read_ai_governance'");
    expect(commercialPermissions).toContain("'manage_ai_incidents'");
    expect(commercialPermissions).toContain("'read_ai_incidents'");
    expect(commercialPermissions).toContain("'manage_vendors'");
    expect(commercialPermissions).toContain("'manage_risks'");
    expect(commercialPermissions).toContain("'manage_documents'");
    expect(commercialPermissions).toContain("'export_data'");
    expect(commercialPermissions).not.toContain("'manage_billing'");
    expect(source).toContain("await import('@/server/queries/subscription')");
    expect(source).toContain('getOrganizationBillingAuthority(organizationId)');
    expect(source).toContain('if (!authority.licensed)');
    expect(source).toContain("error: 'subscription_required'");
    expect(source).toContain("error: 'billing_authority_unavailable'");
    expect(source).toContain('if (commercialAuthorityDenied) return commercialAuthorityDenied;');
  });

  it('enforces catalog plan floors on vendor and risk permissions', async () => {
    const source = await readFile(RBAC, 'utf8');
    const planMap = source.slice(
      source.indexOf('const MINIMUM_PLAN_BY_PERMISSION'),
      source.indexOf('function isSupabaseUserId'),
    );

    expect(planMap).toContain("manage_vendors: 'professional'");
    expect(planMap).toContain("read_vendors: 'professional'");
    expect(planMap).toContain("manage_risks: 'professional'");
    expect(planMap).toContain("read_risks: 'professional'");
    expect(source).toContain('minimumPlan ?? MINIMUM_PLAN_BY_PERMISSION[permission]');
    expect(source).toContain('!isPlanAtLeast(authority.plan, requiredPlan)');
    expect(source).toContain("error: 'upgrade_required'");
  });

  it('requires Professional for FRIA, Annex IV and regulatory monitoring APIs', async () => {
    const [fria, annexIv, controlTower] = await Promise.all([
      readFile(FRIA_ROUTE, 'utf8'),
      readFile(ANNEX_IV_ROUTE, 'utf8'),
      readFile(REGULATORY_CONTROL_TOWER_ROUTE, 'utf8'),
    ]);

    expect((fria.match(/minimumPlan: 'professional'/g) ?? [])).toHaveLength(2);
    expect((annexIv.match(/minimumPlan: 'professional'/g) ?? [])).toHaveLength(2);
    expect((controlTower.match(/minimumPlan: 'professional'/g) ?? [])).toHaveLength(1);
  });

  it('requires Business for QMS APIs', async () => {
    const source = await readFile(QMS_ROUTE, 'utf8');
    expect((source.match(/minimumPlan:'business'/g) ?? [])).toHaveLength(2);
  });
});
