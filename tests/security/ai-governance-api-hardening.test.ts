/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  assertOrganizationPermission: vi.fn(),
  assertTrustedOrigin: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  createAiSystem: vi.fn(),
  listAiSystems: vi.fn(),
  createAuditEvent: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/server/queries/organizations', () => ({ getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser }));
vi.mock('@/server/security/origin-guard', () => ({ assertTrustedOrigin: mocks.assertTrustedOrigin }));
vi.mock('@/server/security/rbac', () => ({
  assertOrganizationPermission: mocks.assertOrganizationPermission,
  permissionDeniedResponse: (permission: { error?: string; status?: number }) =>
    new Response(JSON.stringify({ error: permission.error ?? 'permission_denied' }), {
      status: permission.status ?? 403,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }),
}));
vi.mock('@/lib/security/rate-limit', () => ({ checkDistributedRateLimit: mocks.checkDistributedRateLimit }));
vi.mock('@/server/queries/ai-systems', () => ({
  createAiSystem: mocks.createAiSystem,
  listAiSystems: mocks.listAiSystems,
}));
vi.mock('@/server/queries/audit-events', () => ({ createAuditEvent: mocks.createAuditEvent }));

import { POST } from '../../src/app/api/ai-systems/route';

function buildRequest(body: unknown) {
  return new Request('https://app.eurocomply.test/api/ai-systems', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://app.eurocomply.test' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Support copilot',
  useCase: 'Drafts support replies for review by employees.',
  role: 'deployer',
};

describe('AI systems API hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_admin' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a', name: 'Org A' });
    mocks.assertOrganizationPermission.mockResolvedValue({ ok: true, role: 'admin' });
    mocks.assertTrustedOrigin.mockReturnValue(null);
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true, remaining: 19, resetAt: Date.now() + 60000 });
    mocks.createAiSystem.mockResolvedValue({ id: 'system_a', risk_level: 'limited', lifecycle_status: 'active', risk_domain: 'general' });
    mocks.listAiSystems.mockResolvedValue([]);
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
  });

  it('returns 401 for users without login before organization lookup', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mocks.getCurrentOrganizationForUser).not.toHaveBeenCalled();
    expect(mocks.createAiSystem).not.toHaveBeenCalled();
  });

  it('returns 403 when the user has no organization', async () => {
    mocks.getCurrentOrganizationForUser.mockResolvedValue(null);

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'organization_required' });
    expect(mocks.assertOrganizationPermission).not.toHaveBeenCalled();
  });

  it('blocks viewer role before rate limit and mutation', async () => {
    mocks.assertOrganizationPermission.mockResolvedValue({ ok: false, error: 'permission_denied', status: 403 });

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'permission_denied' });
    expect(mocks.checkDistributedRateLimit).not.toHaveBeenCalled();
    expect(mocks.createAiSystem).not.toHaveBeenCalled();
  });

  it('blocks requests rejected by trusted origin guard', async () => {
    mocks.assertTrustedOrigin.mockReturnValue(new Response(JSON.stringify({ error: 'invalid_origin' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }));

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'invalid_origin' });
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('rate_limit_exceeded');
    expect(mocks.createAiSystem).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid body without creating data', async () => {
    const response = await POST(buildRequest({ name: 'x', useCase: 'short' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_request' });
    expect(mocks.createAiSystem).not.toHaveBeenCalled();
  });
});
