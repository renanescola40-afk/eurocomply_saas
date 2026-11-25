import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('isolated QA signed own-policy reader', () => {
  const qaUrl = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
  const otherOrg = '22222222-2222-4222-8222-222222222222';
  const row = { organization_id: organizationId, require_mfa_for_all_users: true };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', qaUrl);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('VERCEL_ENV', 'preview');
  });

  afterEach(() => vi.unstubAllEnvs());

  function signedPolicy(data: unknown, options: {
    level?: string;
    error?: Error;
    identity?: unknown;
    identityError?: Error;
    mfaError?: Error;
  } = {}) {
    const getUser = vi.fn(async () => ({
      data: { user: options.identity === undefined ? { id: organizationId, is_anonymous: false } : options.identity },
      error: options.identityError ?? null,
    }));
    const rpc = vi.fn(async () => ({ data, error: options.error ?? null }));
    const getAuthenticatorAssuranceLevel = vi.fn(async () => ({
      data: { currentLevel: options.level ?? 'aal2' }, error: options.mfaError ?? null,
    }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser, mfa: { getAuthenticatorAssuranceLevel } },
      rpc,
    });
    return { getUser, rpc, getAuthenticatorAssuranceLevel };
  }

  it('reads only the existing no-argument signed RPC and requires AAL2', async () => {
    const client = signedPolicy([row], { level: 'aal1' });
    await expect(requireTenantMfaForOrganization(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_required', status: 403 });
    expect(client.getUser).toHaveBeenCalledOnce();
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('get_my_mfa_bootstrap_context');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('recognizes verified AAL2 for a valid own-organization policy', async () => {
    signedPolicy([row]);
    await expect(requireTenantMfaForOrganization(organizationId))
      .resolves.toMatchObject({ required: true, satisfied: true, assuranceLevel: 'aal2' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it.each([
    ['no matching organization', [{ ...row, organization_id: otherOrg }]],
    ['empty result', []],
    ['missing boolean', [{ organization_id: organizationId }]],
    ['unexpected fields', [{ ...row, role: 'owner' }]],
    ['null policy', [{ ...row, require_mfa_for_all_users: null }]],
    ['duplicate organization', [row, row]],
    ['case-insensitive duplicate organization', [
      { ...row, organization_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      { ...row, organization_id: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA' },
    ]],
    ['invalid organization UUID', [{ ...row, organization_id: 'fake' }]],
    ['null row', [null]],
    ['unbounded result', Array(21).fill(row)],
    ['invalid response shape', { ...row }],
  ])('fails closed on %s', async (_label, rows) => {
    const client = signedPolicy(rows);
    await expect(getTenantMfaSessionState(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_check_failed', status: 503 });
    expect(client.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('honors an explicitly verified default-off policy, not an absent policy', async () => {
    const client = signedPolicy([{ ...row, require_mfa_for_all_users: false }]);
    await expect(getTenantMfaSessionState(organizationId))
      .resolves.toEqual({ required: false, satisfied: true, assuranceLevel: null });
    expect(client.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('rejects invalid organization before provider calls', async () => {
    const client = signedPolicy([row]);
    await expect(getTenantMfaSessionState('invalid'))
      .rejects.toMatchObject({ code: 'tenant_mfa_check_failed', status: 503 });
    expect(client.getUser).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('fails closed when signed identity lookup fails', async () => {
    const client = signedPolicy([row], { identityError: new Error('provider unavailable') });
    await expect(getTenantMfaSessionState(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_check_failed', status: 503 });
    expect(client.rpc).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('fails closed when the assurance lookup fails', async () => {
    signedPolicy([row], { mfaError: new Error('provider unavailable') });
    await expect(getTenantMfaSessionState(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_check_failed', status: 503 });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('never substitutes admin access for an absent or denied RPC', async () => {
    signedPolicy(null, { error: new Error('provider unavailable') });
    await expect(getTenantMfaSessionState(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_check_failed', status: 503 });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it.each([null, { id: organizationId, is_anonymous: true }])('rejects unauthenticated or anonymous identity', async (identity) => {
    const client = signedPolicy([row], { identity });
    await expect(getTenantMfaSessionState(organizationId))
      .rejects.toMatchObject({ code: 'tenant_mfa_check_failed', status: 503 });
    expect(client.rpc).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('does not use the QA reader outside the isolated project', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://other.invalid');
    policyResult({ require_mfa_for_all_users: false });
    await expect(getTenantMfaSessionState(organizationId))
      .resolves.toMatchObject({ required: false });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('preserves the existing configured server reader', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-placeholder');
    policyResult({ require_mfa_for_all_users: false });
    await expect(getTenantMfaSessionState(organizationId))
      .resolves.toMatchObject({ required: false });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('does not use the QA reader in a production runtime', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    policyResult({ require_mfa_for_all_users: false });
    await expect(getTenantMfaSessionState(organizationId))
      .resolves.toMatchObject({ required: false });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
