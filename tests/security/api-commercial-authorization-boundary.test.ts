import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { resolveApiCommercialMinimumPlan } from '../../src/server/security/api-commercial-policy';

const API_GUARDS = new URL('../../src/server/security/api-guards.ts', import.meta.url);
const SECURITY_SETTINGS = new URL('../../src/app/api/security/settings/route.ts', import.meta.url);
const GDPR_DELETE = new URL('../../src/app/api/gdpr/delete-request/route.ts', import.meta.url);
const ONBOARDING = new URL('../../src/server/actions/onboarding.ts', import.meta.url);

describe('API commercial authorization boundary', () => {
  it('requires a durable paid organization license for every manage_team API permission by default', () => {
    expect(resolveApiCommercialMinimumPlan('manage_team')).toBe('starter');
  });

  it('does not accidentally put billing recovery or GDPR/account rights behind a subscription', () => {
    expect(resolveApiCommercialMinimumPlan('manage_billing')).toBeUndefined();
    expect(resolveApiCommercialMinimumPlan('manage_settings')).toBeUndefined();
  });

  it('allows sensitive settings APIs to opt into the same canonical billing authority explicitly', () => {
    expect(resolveApiCommercialMinimumPlan('manage_settings', 'starter')).toBe('starter');
    expect(resolveApiCommercialMinimumPlan('manage_settings', 'business')).toBe('business');
  });

  it('passes the effective API plan floor into canonical RBAC authorization', async () => {
    const source = await readFile(API_GUARDS, 'utf8');

    expect(source).toContain('resolveApiCommercialMinimumPlan(options.permission, options.minimumPlan)');
    expect(source).toContain('assertOrganizationPermission({');
    expect(source).toContain('minimumPlan,');
  });

  it('requires a paid license before mutating organization security settings', async () => {
    const source = await readFile(SECURITY_SETTINGS, 'utf8');

    expect(source).toContain("permission: 'manage_settings'");
    expect(source).toContain("minimumPlan: 'starter'");
    expect(source.indexOf("minimumPlan: 'starter'")).toBeLessThan(source.indexOf('createAdminClient()'));
  });

  it('preserves GDPR deletion as an account right rather than a paid feature', async () => {
    const source = await readFile(GDPR_DELETE, 'utf8');

    expect(source).toContain("permission: 'manage_settings'");
    expect(source).not.toContain("minimumPlan: 'starter'");
  });

  it('keeps only the narrow purchase-context draft pre-payment and gates operational onboarding before product writes', async () => {
    const source = await readFile(ONBOARDING, 'utf8');
    const activation = source.slice(source.indexOf('export async function completeOnboardingActivation'));
    const commercialGuard = activation.indexOf('await requireLicensedOnboardingAuthority(organizationId)');

    expect(source).toContain("assertCurrentUserCan(organizationId, user.id, 'organization:update')");
    expect(commercialGuard).toBeGreaterThanOrEqual(0);
    expect(activation.indexOf("assertCurrentUserCan(organizationId, user.id, 'team:invite')")).toBeGreaterThan(commercialGuard);
    expect(activation.indexOf('const classification = classifyAiSystem')).toBeGreaterThan(commercialGuard);
    expect(activation.indexOf('supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC')).toBeGreaterThan(commercialGuard);
    expect(source).not.toContain('requirePermission({');
  });
});
