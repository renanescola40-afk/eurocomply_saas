import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  extractSupabaseSsoProviderId,
  isSamlSsoUser,
} from '../../src/server/enterprise/sso';

const bindingMigration = readFileSync(
  'supabase/migrations/20260721213000_enterprise_sso_binding.sql',
  'utf8',
);
const configurationMigration = readFileSync(
  'supabase/migrations/20260721213500_enterprise_sso_configuration.sql',
  'utf8',
);
const productionReconciliationMigration = readFileSync(
  'supabase/migrations/20260902083000_reconcile_enterprise_sso_production_runtime.sql',
  'utf8',
);
const callback = readFileSync('src/app/auth/callback/route.ts', 'utf8');
const login = readFileSync('src/components/auth/enterprise-sso-login.tsx', 'utf8');
const platformRoute = readFileSync(
  'src/app/api/platform/organizations/[organizationId]/sso-connections/route.ts',
  'utf8',
);

describe('enterprise SAML SSO contracts', () => {
  it('extracts only the Supabase SAML provider UUID from AMR claims', () => {
    const providerId = '00000000-0000-4000-8000-000000000123';
    expect(extractSupabaseSsoProviderId({
      amr: [
        { method: 'password', provider: 'not-a-provider' },
        { method: 'sso/saml', provider: providerId },
      ],
    })).toBe(providerId);
    expect(extractSupabaseSsoProviderId({
      amr: [{ method: 'sso/saml', provider: 'not-a-uuid' }],
    })).toBeNull();
  });

  it('identifies SAML users only from trusted auth metadata', () => {
    expect(isSamlSsoUser({ app_metadata: { provider: 'sso:saml' } })).toBe(true);
    expect(isSamlSsoUser({ identities: [{ provider: 'sso:saml' }] })).toBe(true);
    expect(isSamlSsoUser({ app_metadata: { provider: 'google' } })).toBe(false);
  });

  it('requires provider UUID, verified domain, active contract and SSO entitlement', () => {
    expect(bindingMigration).toContain('connection.supabase_provider_id = p_supabase_provider_id');
    expect(bindingMigration).toContain("lower(coalesce(connection.verified_domain, '')) = v_domain");
    expect(bindingMigration).toContain("connection.status = 'active'");
    expect(bindingMigration).toContain("v_snapshot.contract_status is distinct from 'active'");
    expect(bindingMigration).toContain('v_snapshot.sso_enabled is distinct from true');
  });

  it('configures one active provider/domain binding with audit', () => {
    expect(configurationMigration).toContain('create or replace function public.upsert_enterprise_sso_connection_atomic');
    expect(configurationMigration).toContain('conflicting.supabase_provider_id = p_supabase_provider_id');
    expect(configurationMigration).toContain("lower(coalesce(conflicting.verified_domain, '')) = v_domain");
    expect(configurationMigration).toContain("'enterprise.sso_connection_configured'");
    expect(configurationMigration).toContain('v_snapshot.sso_enabled is distinct from true');
  });

  it('reconciles the live SSO schema against the current contract tables without legacy helpers', () => {
    expect(productionReconciliationMigration).toContain('add column if not exists supabase_provider_id uuid');
    expect(productionReconciliationMigration).toContain('add column if not exists default_role text');
    expect(productionReconciliationMigration).toContain('create or replace function public.resolve_enterprise_sso_binding');
    expect(productionReconciliationMigration).toContain('create or replace function public.record_enterprise_sso_login');
    expect(productionReconciliationMigration).toContain('create or replace function public.upsert_enterprise_sso_connection_atomic');
    expect(productionReconciliationMigration).toContain('join public.organization_entitlements entitlement');
    expect(productionReconciliationMigration).toContain("contract.contract_mode = 'negotiated'");
    expect(productionReconciliationMigration).toContain("contract.status = 'active'");
    expect(productionReconciliationMigration).toContain('entitlement.sso_enabled = true');
    expect(productionReconciliationMigration).not.toContain('resolve_organization_entitlements_v3');
    expect(productionReconciliationMigration).toContain('to service_role;');
  });

  it('provisions the SAML session before redirect and signs out on failure', () => {
    expect(callback).toContain('const providerId = extractSupabaseSsoProviderId');
    expect(callback).toContain('if (providerId) {');
    expect(callback).toContain('await provisionEnterpriseSsoSession({');
    expect(callback).toContain('await supabase.auth.signOut().catch');
    expect(callback.indexOf('await provisionEnterpriseSsoSession({')).toBeLessThan(
      callback.lastIndexOf('NextResponse.redirect'),
    );
  });

  it('starts SSO by domain through Supabase and keeps the callback same-origin', () => {
    expect(login).toContain('supabase.auth.signInWithSSO({');
    expect(login).toContain('domain,');
    expect(login).toContain("new URL('/auth/callback', window.location.origin)");
    expect(login).not.toContain('providerId:');
  });

  it('protects SAML configuration with platform security capability and bounded input', () => {
    expect(platformRoute).toContain("requirePlatformCapability(user.id, 'security')");
    expect(platformRoute).toContain('requireTrustedMutation(request');
    expect(platformRoute).toContain("failureMode: 'fail-closed'");
    expect(platformRoute).toContain('readBoundedJsonRequest(request');
    expect(platformRoute).toContain("'upsert_enterprise_sso_connection_atomic'");
  });
});
