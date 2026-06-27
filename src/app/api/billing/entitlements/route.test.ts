import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  getOrganizationEntitlements: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/billing/entitlements', () => ({
  getOrganizationEntitlements: mocks.getOrganizationEntitlements,
}));

import { GET } from './route';

function createRequest() {
  return new Request('https://risck-comply.test/api/billing/entitlements');
}

describe('billing entitlements response hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_123' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_123' });
    mocks.getOrganizationEntitlements.mockResolvedValue({
      plan: 'pro',
      maxDocuments: Infinity,
      maxUsers: 25,
      maxFiscalCountries: Number.NaN,
    });
  });

  it('returns no-store unauthorized responses', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'unauthorized' });
  });

  it('returns no-store organization-required responses', async () => {
    mocks.getCurrentOrganizationForUser.mockResolvedValue(null);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'organization_required' });
  });

  it('returns entitlements with no-store and normalized numeric limits', async () => {
    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(body).toMatchObject({
      organizationId: 'org_123',
      entitlements: {
        plan: 'pro',
        maxDocuments: null,
        maxUsers: 25,
        maxFiscalCountries: null,
      },
    });
  });
});
