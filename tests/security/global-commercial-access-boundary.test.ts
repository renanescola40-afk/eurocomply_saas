import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  classifyLocalizedCommercialRoute,
  requiresCommercialLicense,
} from '../../src/lib/security/commercial-route-policy';

const LOCALE_LAYOUT = new URL('../../src/app/[locale]/layout.tsx', import.meta.url);
const HOME_PAGE = new URL('../../src/app/[locale]/page.tsx', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const ONBOARDING_PAGE = new URL('../../src/app/[locale]/onboarding/page.tsx', import.meta.url);
const COMMERCIAL_ACCESS = new URL('../../src/server/security/commercial-access.ts', import.meta.url);

const KNOWN_LICENSED_PRODUCT_ROUTES = [
  '/pt/dashboard/organizations',
  '/pt/ai-systems',
  '/pt/ai-incidents',
  '/pt/aprovacoes',
  '/pt/audit-pack',
  '/pt/raci',
  '/pt/auditoria',
  '/pt/calendario-compliance',
  '/pt/settings/organization',
  '/pt/security-center',
  '/pt/retention-center',
  '/pt/continuity-center',
  '/pt/vendor-assurance',
  '/pt/vendor-create',
  '/pt/document-generator',
  '/pt/security-questionnaire',
  '/pt/enterprise-readiness',
  '/pt/policy-pack',
  '/pt/ai-questionnaire',
  '/pt/notificacoes',
  '/pt/risck-comply-home',
] as const;

describe('global commercial access boundary', () => {
  it('keeps public, account, billing recovery and privileged control-plane surfaces explicit', () => {
    expect(classifyLocalizedCommercialRoute('/pt/pricing', 'pt')).toBe('public');
    expect(classifyLocalizedCommercialRoute('/pt/checkout', 'pt')).toBe('public');
    expect(classifyLocalizedCommercialRoute('/pt/cookie-policy', 'pt')).toBe('public');
    expect(classifyLocalizedCommercialRoute('/pt/acceptable-use', 'pt')).toBe('public');
    expect(classifyLocalizedCommercialRoute('/pt/transfers', 'pt')).toBe('public');
    expect(classifyLocalizedCommercialRoute('/pt/checkout/complete', 'pt')).toBe('billing_recovery');
    expect(classifyLocalizedCommercialRoute('/pt/billing', 'pt')).toBe('billing_recovery');
    expect(classifyLocalizedCommercialRoute('/pt/dashboard/billing', 'pt')).toBe('billing_recovery');
    expect(classifyLocalizedCommercialRoute('/pt/dashboard/organizations/billing/payment-method', 'pt')).toBe('billing_recovery');
    expect(classifyLocalizedCommercialRoute('/pt/onboarding', 'pt')).toBe('auth_only');
    expect(classifyLocalizedCommercialRoute('/pt/profile', 'pt')).toBe('auth_only');
    expect(classifyLocalizedCommercialRoute('/pt/invite/example-token', 'pt')).toBe('auth_only');
    expect(classifyLocalizedCommercialRoute('/pt/admin', 'pt')).toBe('privileged_control_plane');
    expect(classifyLocalizedCommercialRoute('/pt/platform/api-keys', 'pt')).toBe('privileged_control_plane');
  });

  it('closes every known legacy top-level paid product bypass', () => {
    for (const route of KNOWN_LICENSED_PRODUCT_ROUTES) {
      expect(classifyLocalizedCommercialRoute(route, 'pt'), route).toBe('licensed_product');
      expect(requiresCommercialLicense(route, 'pt'), route).toBe(true);
    }
  });

  it('fails closed for unknown future private routes and missing trusted pathname context', () => {
    expect(classifyLocalizedCommercialRoute('/pt/future-enterprise-feature', 'pt')).toBe('licensed_product');
    expect(classifyLocalizedCommercialRoute('/pt/future-enterprise-feature/deep-link', 'pt')).toBe('licensed_product');
    expect(classifyLocalizedCommercialRoute('', 'pt')).toBe('licensed_product');
  });

  it('keeps the public landing request-aware so force-static cannot blank the trusted pathname header', async () => {
    const source = await readFile(HOME_PAGE, 'utf8');

    expect(source).not.toContain("dynamic = 'force-static'");
    expect(source).toContain('export const revalidate = 300;');
  });

  it('enforces paid authority from a request-time shared locale server layout before product pages render', async () => {
    const source = await readFile(LOCALE_LAYOUT, 'utf8');

    expect(source).toContain("export const dynamic = 'force-dynamic'");
    expect(source).toContain('INTERNAL_PATHNAME_HEADER');
    expect(source).toContain('classifyLocalizedCommercialRoute(pathname, safeLocale)');
    expect(source).toContain("commercialRouteClass === 'licensed_product'");
    expect(source).toContain('requireLicensedCommercialPageAccess');
  });

  it('resolves authentication, organization membership and billing authority in one fail-closed server guard', async () => {
    const source = await readFile(COMMERCIAL_ACCESS, 'utf8');

    expect(source).toContain('getCurrentUser()');
    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain('getOrganizationBillingAuthority(organization.id)');
    expect(source).toContain('if (!authority.licensed)');
    expect(source).toContain("status: 'subscription_required'");
    expect(source).toContain("status: 'commercial_authority_unavailable'");
    expect(source).toContain("redirect(`/${input.locale}/pricing?billing=subscription_required`)");
    expect(source).toContain("redirect(`/${input.locale}/pricing?billing=billing_authority_unavailable`)");
    expect(source).toContain('resolveCommercialProductAccess = cache(async');
  });

  it('uses the same canonical guard inside the dashboard while preserving recovery access', async () => {
    const source = await readFile(DASHBOARD_LAYOUT, 'utf8');

    expect(source).toContain('requireLicensedCommercialPageAccess');
    expect(source).toContain("commercialRouteClass === 'billing_recovery'");
    expect(source).toContain('selectedPlan={authority.plan}');
    expect(source).not.toContain('getOrganizationBillingAuthority');
  });

  it('keeps new unpaid accounts in purchase context and never loads operational onboarding before licensed=true', async () => {
    const source = await readFile(ONBOARDING_PAGE, 'utf8');
    const organizationResolution = source.indexOf('const organization = await getCurrentOrganizationForUser(user.id);');
    const purchaseBoundary = source.indexOf('if (!organization) {');
    const operationalStateLoad = source.indexOf('const initialState = await getOnboardingActivationState(user.id);');

    expect(organizationResolution).toBeGreaterThan(-1);
    expect(purchaseBoundary).toBeGreaterThan(organizationResolution);
    expect(operationalStateLoad).toBeGreaterThan(purchaseBoundary);
    expect(source).toContain('createPurchaseContext');
    expect(source).toContain('await createOrganization({');
    expect(source).toContain('redirect(getBillingRecoveryPath(safeLocale, selectedPlan.id));');
    expect(source).toContain('await requireLicensedOnboardingPageAccess({');
    expect(source).toContain('if (!authority.licensed)');
    expect(source).toContain('Creating an account does not unlock any paid functionality.');
  });
});
