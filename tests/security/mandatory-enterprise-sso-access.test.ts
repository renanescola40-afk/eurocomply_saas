import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  extractTrustedSamlProviderId,
  filterMembershipsByMandatorySso,
} from '../../src/server/security/enterprise-sso-access';

const providerA = '00000000-0000-4000-8000-000000000111';
const providerB = '00000000-0000-4000-8000-000000000222';
const organizationA = '00000000-0000-4000-8000-000000000aaa';
const organizationB = '00000000-0000-4000-8000-000000000bbb';

const memberships = [
  { organization_id: organizationA, role: 'owner' },
  { organization_id: organizationB, role: 'member' },
];

function mandatoryPolicy(organizationId: string, providerId: string | null = providerA) {
  return {
    organization_id: organizationId,
    supabase_provider_id: providerId,
    enforce_sso: true,
    status: 'active',
    protocol: 'saml',
  };
}

describe('mandatory Enterprise SSO tenant access', () => {
  it('extracts only a trusted sso/saml AMR provider UUID', () => {
    expect(extractTrustedSamlProviderId({
      amr: [
        { method: 'password' },
        { method: 'sso/saml', provider: providerA },
      ],
    })).toBe(providerA);
    expect(extractTrustedSamlProviderId({ amr: [{ method: 'password', provider: providerA }] })).toBeNull();
    expect(extractTrustedSamlProviderId({ amr: [{ method: 'sso/saml', provider: 'not-a-uuid' }] })).toBeNull();
    expect(extractTrustedSamlProviderId({ amr: 'sso/saml' })).toBeNull();
  });

  it('preserves tenants that do not enforce SSO', () => {
    expect(filterMembershipsByMandatorySso(memberships, [], null)).toEqual(memberships);
    expect(filterMembershipsByMandatorySso(memberships, [{
      ...mandatoryPolicy(organizationA),
      enforce_sso: false,
    }], null)).toEqual(memberships);
  });

  it('denies password or Google sessions for a tenant with mandatory SSO', () => {
    const result = filterMembershipsByMandatorySso(
      memberships,
      [mandatoryPolicy(organizationA)],
      null,
    );
    expect(result).toEqual([{ organization_id: organizationB, role: 'member' }]);
  });

  it('denies a SAML session bound to the wrong provider', () => {
    const result = filterMembershipsByMandatorySso(
      memberships,
      [mandatoryPolicy(organizationA, providerA)],
      providerB,
    );
    expect(result).toEqual([{ organization_id: organizationB, role: 'member' }]);
  });

  it('allows the exact active SAML provider for the tenant', () => {
    expect(filterMembershipsByMandatorySso(
      memberships,
      [mandatoryPolicy(organizationA, providerA)],
      providerA,
    )).toEqual(memberships);
  });

  it('does not reuse one tenant provider as authority for another tenant', () => {
    const result = filterMembershipsByMandatorySso(
      memberships,
      [
        mandatoryPolicy(organizationA, providerA),
        mandatoryPolicy(organizationB, providerB),
      ],
      providerA,
    );
    expect(result).toEqual([{ organization_id: organizationA, role: 'owner' }]);
  });

  it('fails closed for a mandatory tenant whose active provider binding is malformed', () => {
    const result = filterMembershipsByMandatorySso(
      memberships,
      [mandatoryPolicy(organizationA, null)],
      providerA,
    );
    expect(result).toEqual([{ organization_id: organizationB, role: 'member' }]);
  });

  it('ignores inactive/non-SAML rows because they are not mandatory access policies', () => {
    const result = filterMembershipsByMandatorySso(
      memberships,
      [
        { ...mandatoryPolicy(organizationA), status: 'disabled' },
        { ...mandatoryPolicy(organizationB), protocol: 'oidc' },
      ],
      null,
    );
    expect(result).toEqual(memberships);
  });

  it('queries mandatory policy server-side and allows pre-schema compatibility only after a DB capability proof', () => {
    const source = readFileSync('src/server/security/enterprise-sso-access.ts', 'utf8');

    expect(source).toContain(".from('enterprise_identity_connections')");
    expect(source).toContain(".eq('status', 'active')");
    expect(source).toContain(".eq('protocol', 'saml')");
    expect(source).toContain(".eq('enforce_sso', true)");
    expect(source).toContain("admin.rpc('live_rls_validation_has_column'");
    expect(source).toContain("table_name: 'enterprise_identity_connections'");
    expect(source).toContain("column_name: 'enforce_sso'");
    expect(source).toContain('capability.data === false');
    expect(source).toContain("throw new Error('enterprise_sso_policy_unavailable')");
    expect(source).toContain("typeof auth.getClaims !== 'function'");
    expect(source).toContain('await auth.getClaims()');
    expect(source).not.toContain('isSamlSsoUser');
  });
});
