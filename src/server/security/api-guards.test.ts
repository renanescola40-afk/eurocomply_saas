/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getOrganizationMembership: vi.fn(),
  assertOrganizationPermission: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  buildRateLimitSubjectFromRequest: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/server/security/rbac', async () => {
  const actual = await vi.importActual<typeof import('@/server/security/rbac')>('@/server/security/rbac');
  return {
    ...actual,
    getOrganizationMembership: mocks.getOrganizationMembership,
    assertOrganizationPermission: mocks.assertOrganizationPermission,
  };
});

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
  buildRateLimitSubjectFromRequest: mocks.buildRateLimitSubjectFromRequest,
  getRateLimitHeaders: () => ({
    'Retry-After': '60',
    'X-RateLimit-Limit': '1',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(Date.now() + 60_000),
  }),
}));

import {
  assertApiResourceOrganization,
  parseJsonBodyWithZod,
  requireApiUser,
  requireOrganizationAccess,
  requirePermission,
  requireTrustedMutation,
  secureApiError,
} from './api-guards';

describe('central API security guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.eurocomply.test');
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_a' });
    mocks.getOrganizationMembership.mockResolvedValue({ membership: { organization_id: 'org_a', role: 'admin' }, error: null });
    mocks.assertOrganizationPermission.mockResolvedValue({
      ok: true,
      status: 200,
      role: 'admin',
      rawRole: 'admin',
      permission: 'manage_team',
    });
    mocks.buildRateLimitSubjectFromRequest.mockImplementation((_request: Request, subject = {}) => ({
      userId: subject.userId ?? null,
      organizationId: subject.organizationId ?? null,
      ip: '203.0.113.10',
      userAgent: 'vitest',
      action: subject.action ?? 'trusted_mutation',
      route: subject.route ?? '/api/test',
    }));
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 });
  });

  it('blocks requests without login', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(requireApiUser()).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
  });

  it('blocks requests without organizationId', async () => {
    await expect(requireOrganizationAccess({ userId: 'user_a', organizationId: '' })).rejects.toMatchObject({
      code: 'invalid_organization',
      status: 400,
    });
  });

  it('blocks users without membership in the requested tenant', async () => {
    mocks.getOrganizationMembership.mockResolvedValue({ membership: null, error: null });

    await expect(requireOrganizationAccess({ userId: 'user_a', organizationId: 'org_b' })).rejects.toMatchObject({
      code: 'organization_membership_required',
      status: 403,
    });
  });

  it('blocks viewer users from admin actions', async () => {
    mocks.assertOrganizationPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'insufficient_role_permission',
      message: 'Your organization role does not allow this action.',
      role: 'viewer',
      rawRole: 'viewer',
      permission: 'manage_team',
    });

    await expect(
      requirePermission({ userId: 'user_a', organizationId: 'org_a', permission: 'manage_team' }),
    ).rejects.toMatchObject({ code: 'permission_denied', status: 403 });
  });

  it('blocks tenant A users from tenant B resources', () => {
    expect(() => assertApiResourceOrganization('org_b', 'org_a')).toThrow(/Resource does not belong/);
  });

  it('sanitizes invalid request bodies', async () => {
    let thrown: unknown;
    try {
      z.object({ action: z.enum(['approve']) }).parse({ action: 'delete' });
    } catch (error) {
      thrown = error;
    }

    const response = secureApiError(thrown);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'invalid_request', requestId: expect.any(String) });
  });

  it('sanitizes oversized bounded JSON requests without leaking parser details', async () => {
    const request = new Request('https://app.eurocomply.test/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '64',
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    let thrown: unknown;
    try {
      await parseJsonBodyWithZod(request, {
        schema: z.object({ action: z.literal('approve') }),
        maxBytes: 4,
      });
    } catch (error) {
      thrown = error;
    }

    const response = secureApiError(thrown);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'invalid_request', requestId: expect.any(String) });
    expect(JSON.stringify(body)).not.toMatch(/too large|content-length|stack/i);
  });

  it('blocks missing Origin in production mutations', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');

    const response = await requireTrustedMutation(new Request('https://app.eurocomply.test/api/team', { method: 'POST' }));
    const body = await response?.json();

    expect(response?.status).toBe(403);
    expect(body).toEqual({ error: 'untrusted_origin', reason: 'missing_origin' });
  });

  it('blocks untrusted Origin in mutations', async () => {
    const response = await requireTrustedMutation(
      new Request('https://app.eurocomply.test/api/team', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      }),
    );
    const body = await response?.json();

    expect(response?.status).toBe(403);
    expect(body).toEqual({ error: 'untrusted_origin', reason: 'untrusted_origin' });
  });

  it('blocks mutations when the rate limit is exceeded', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({
      allowed: false,
      limit: 1,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      category: 'general-api',
      policy: 'general-api',
      highRisk: false,
      failureMode: 'fail-open',
      audit: false,
      key: 'test-rate-limit-key',
      userId: 'user_a',
      organizationId: 'org_a',
      route: '/api/team',
      action: 'manage_team',
    });

    const response = await requireTrustedMutation(
      new Request('https://app.eurocomply.test/api/team', {
        method: 'POST',
        headers: { origin: 'https://app.eurocomply.test' },
      }),
      {
        rateLimit: {
          key: 'team:test',
          limit: 1,
          windowMs: 60_000,
          userId: 'user_a',
          organizationId: 'org_a',
          route: '/api/team',
          action: 'manage_team',
        },
      },
    );
    const body = await response?.json();

    expect(response?.status).toBe(429);
    expect(response?.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'Too many requests' });
  });

  it('does not leak internal error details', async () => {
    const response = secureApiError(new Error('database password leaked'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'internal_server_error', requestId: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain('database password leaked');
  });
});
