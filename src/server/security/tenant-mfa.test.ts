import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: vi.fn(),
}));

import { getTenantMfaSessionState, requireTenantMfaForOrganization } from './tenant-mfa';

const organizationId = '11111111-1111-4111-8111-111111111111';

function policyResult(data: { require_mfa_for_all_users: boolean } | null, error: Error | null = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data, error })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });
}

function assurance(level: 'aal1' | 'aal2') {
  mocks.createServerSupabaseClient.mockResolvedValue({
    auth: { mfa: { getAuthenticatorAssuranceLevel: vi.fn(async () => ({
      data: { currentLevel: level }, error: null,
    })) } },
  });
}

describe('tenant MFA policy authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies access if an organization has no security policy row', async () => {
    policyResult(null);
    await expect(requireTenantMfaForOrganization(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_check_failed', status: 503 });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('allows a configured default-off policy without an MFA lookup', async () => {
    policyResult({ require_mfa_for_all_users: false });
    await expect(getTenantMfaSessionState(organizationId)).resolves.toEqual({
      required: false, satisfied: true, assuranceLevel: null,
    });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('requires AAL2 for a configured mandatory policy', async () => {
    policyResult({ require_mfa_for_all_users: true });
    assurance('aal1');
    await expect(requireTenantMfaForOrganization(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_required', status: 403 });

    assurance('aal2');
    await expect(requireTenantMfaForOrganization(organizationId)).resolves.toMatchObject({
      required: true, satisfied: true, assuranceLevel: 'aal2',
    });
  });

  it('denies access when the security policy lookup fails', async () => {
    policyResult(null, new Error('provider unavailable'));
    await expect(requireTenantMfaForOrganization(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_check_failed', status: 503 });
  });
});
