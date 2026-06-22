import { afterEach, describe, expect, it, vi } from 'vitest';

import { verifyTrustedOrigin } from './origin-guard';
import { evaluateEnterpriseAccess } from './enterprise-policy';

describe('enterprise API security policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('blocks unauthenticated users before tenant or RBAC checks', () => {
    const result = evaluateEnterpriseAccess({
      userId: null,
      organizationId: 'org_1',
      role: 'admin',
      requiredPermission: 'manage_team',
      requireTrustedOrigin: true,
      trustedOrigin: true,
    });

    expect(result).toEqual({ ok: false, status: 401, code: 'authentication_required' });
  });

  it('blocks authenticated users without an organization', () => {
    const result = evaluateEnterpriseAccess({
      userId: 'user_1',
      organizationId: null,
      role: 'admin',
      requiredPermission: 'manage_team',
      requireTrustedOrigin: true,
      trustedOrigin: true,
    });

    expect(result).toEqual({ ok: false, status: 403, code: 'organization_required' });
  });

  it('blocks a viewer trying an admin-only action', () => {
    const result = evaluateEnterpriseAccess({
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'viewer',
      requiredPermission: 'manage_team',
      requireTrustedOrigin: true,
      trustedOrigin: true,
    });

    expect(result).toEqual({ ok: false, status: 403, code: 'insufficient_role_permission' });
  });

  it('blocks BOLA/IDOR attempts across organizations', () => {
    const result = evaluateEnterpriseAccess({
      userId: 'user_1',
      organizationId: 'org_1',
      resourceOrganizationId: 'org_2',
      role: 'admin',
      requiredPermission: 'manage_documents',
      requireTrustedOrigin: true,
      trustedOrigin: true,
    });

    expect(result).toEqual({ ok: false, status: 404, code: 'tenant_mismatch' });
  });

  it('blocks mutable production requests without Origin or Referer', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const request = new Request('https://app.eurocomply.test/api/team/invites', {
      method: 'POST',
    });

    const result = verifyTrustedOrigin(request, new Set(['https://app.eurocomply.test']));

    expect(result).toEqual({ ok: false, reason: 'missing_origin', origin: null });
  });

  it('blocks mutable production requests from an invalid Origin', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const request = new Request('https://app.eurocomply.test/api/team/invites', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
      },
    });

    const result = verifyTrustedOrigin(request, new Set(['https://app.eurocomply.test']));

    expect(result).toEqual({ ok: false, reason: 'untrusted_origin', origin: 'https://evil.example' });
  });

  it('allows mutable production requests from a trusted Origin after policy checks pass', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const request = new Request('https://app.eurocomply.test/api/team/invites', {
      method: 'POST',
      headers: {
        Origin: 'https://app.eurocomply.test',
      },
    });

    expect(verifyTrustedOrigin(request, new Set(['https://app.eurocomply.test']))).toEqual({
      ok: true,
      reason: 'trusted_origin',
    });

    expect(
      evaluateEnterpriseAccess({
        userId: 'user_1',
        organizationId: 'org_1',
        role: 'admin',
        requiredPermission: 'manage_team',
        requireTrustedOrigin: true,
        trustedOrigin: true,
      }),
    ).toEqual({ ok: true });
  });
});
