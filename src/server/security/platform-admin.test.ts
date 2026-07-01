import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
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
  });

  it('fails closed when the lookup fails', async () => {
    mockPlatformAdminRow(null, new Error('database unavailable'));

    await expect(requirePlatformAdmin('00000000-0000-4000-8000-000000000004')).rejects.toMatchObject({
      code: 'platform_admin_check_failed',
      status: 503,
    } satisfies Partial<PlatformAdminError>);
  });
});
