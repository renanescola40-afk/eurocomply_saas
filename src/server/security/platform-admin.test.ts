import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  maybeSingle: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { normalizePlatformAdminRole, requirePlatformAdmin, PlatformAdminError } from './platform-admin';

function mockPlatformAdminRow(data: unknown, error: unknown = null) {
  mocks.maybeSingle.mockResolvedValue({ data, error });

  const eqEnabled = vi.fn(() => ({ maybeSingle: mocks.maybeSingle }));
  const eqUserId = vi.fn(() => ({ eq: eqEnabled }));
  const select = vi.fn(() => ({ eq: eqUserId }));
  const from = vi.fn(() => ({ select }));

  mocks.createAdminClient.mockReturnValue({ from });
}

describe('platform admin guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2' },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { mfa: { getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel } },
    });
  });

  it('normalizes supported roles', () => {
    expect(normalizePlatformAdminRole('owner')).toBe('owner');
    expect(normalizePlatformAdminRole('sales_admin')).toBe('sales_admin');
    expect(normalizePlatformAdminRole('unknown')).toBeNull();
  });

  it('allows enabled sales admins', async () => {
    mockPlatformAdminRow({ user_id: '00000000-0000-4000-8000-000000000001', role: 'sales_admin', enabled: true });

    await expect(requirePlatformAdmin('00000000-0000-4000-8000-000000000001')).resolves.toEqual({
      userId: '00000000-0000-4000-8000-000000000001',
      role: 'sales_admin',
      enabled: true,
    });
  });

  it('denies missing or disabled users', async () => {
    mockPlatformAdminRow(null);

    await expect(requirePlatformAdmin('00000000-0000-4000-8000-000000000002')).rejects.toMatchObject({
      code: 'platform_admin_required',
      status: 403,
    } satisfies Partial<PlatformAdminError>);
  });

  it('denies roles outside the allowed set', async () => {
    mockPlatformAdminRow({ user_id: '00000000-0000-4000-8000-000000000003', role: 'support_admin', enabled: true });

    await expect(requirePlatformAdmin('00000000-0000-4000-8000-000000000003')).rejects.toMatchObject({
      code: 'platform_admin_required',
      status: 403,
    } satisfies Partial<PlatformAdminError>);
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('fails closed when the lookup fails', async () => {
    mockPlatformAdminRow(null, new Error('database unavailable'));

    await expect(requirePlatformAdmin('00000000-0000-4000-8000-000000000004')).rejects.toMatchObject({
      code: 'platform_admin_check_failed',
      status: 503,
    } satisfies Partial<PlatformAdminError>);
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('requires an aal2 session after platform-role authorization succeeds', async () => {
    mockPlatformAdminRow({ user_id: '00000000-0000-4000-8000-000000000005', role: 'owner', enabled: true });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1' },
      error: null,
    });

    await expect(requirePlatformAdmin('00000000-0000-4000-8000-000000000005')).rejects.toMatchObject({
      code: 'platform_admin_mfa_required',
      status: 403,
    } satisfies Partial<PlatformAdminError>);
  });

  it('fails closed when the session assurance level cannot be verified', async () => {
    mockPlatformAdminRow({ user_id: '00000000-0000-4000-8000-000000000006', role: 'sales_admin', enabled: true });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: null,
      error: { message: 'provider unavailable' },
    });

    await expect(requirePlatformAdmin('00000000-0000-4000-8000-000000000006')).rejects.toMatchObject({
      code: 'platform_admin_mfa_check_failed',
      status: 503,
    } satisfies Partial<PlatformAdminError>);
  });

  it('fails closed when the server session client cannot be created', async () => {
    mockPlatformAdminRow({ user_id: '00000000-0000-4000-8000-000000000007', role: 'sales_admin', enabled: true });
    mocks.createServerSupabaseClient.mockRejectedValue(new Error('cookies unavailable'));

    await expect(requirePlatformAdmin('00000000-0000-4000-8000-000000000007')).rejects.toMatchObject({
      code: 'platform_admin_mfa_check_failed',
      status: 503,
    } satisfies Partial<PlatformAdminError>);
  });
});
