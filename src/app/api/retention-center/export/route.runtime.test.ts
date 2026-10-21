import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  requirePermission: vi.fn(),
  assertPlanAtLeast: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  createAuditEvent: vi.fn(),
  reportError: vi.fn(),
  secureApiError: vi.fn(),
}));

vi.mock('@/lib/documents/upload', () => ({
  sanitizeDocumentDownloadFileName: (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_'),
}));
vi.mock('@/lib/observability/report-error', () => ({ reportError: mocks.reportError }));
vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));
vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: () => Response.json({ error: 'rate_limited' }, { status: 429 }),
}));
vi.mock('@/server/billing/entitlements', () => ({ assertPlanAtLeast: mocks.assertPlanAtLeast }));
vi.mock('@/server/billing/upgrade-response', () => ({
  upgradeRequiredResponse: () => Response.json({ error: 'upgrade_required' }, { status: 402 }),
}));
vi.mock('@/server/queries/audit-events', () => ({ createAuditEvent: mocks.createAuditEvent }));
vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));
vi.mock('@/server/security/api-guards', () => {
  class ApiSecurityError extends Error {
    code: string;
    status: number;
    constructor({ code, message, status }: { code: string; message: string; status: number }) {
      super(message);
      this.name = 'ApiSecurityError';
      this.code = code;
      this.status = status;
    }
  }
  return {
    ApiSecurityError,
    requireApiUser: mocks.requireApiUser,
    requirePermission: mocks.requirePermission,
    secureApiError: mocks.secureApiError,
  };
});
vi.mock('@/server/security/step-up', () => ({
  requireStepUpForRequest: mocks.requireStepUpForRequest,
  publicStepUpSummary: () => ({ action: 'export_data', verified: true }),
}));

import { ApiSecurityError } from '@/server/security/api-guards';
import { verifyEvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { GET } from './route';

const requestUrl = 'https://www.risckcomply.com/api/retention-center/export';
const organization = { id: 'synthetic-organization', name: 'Disposable QA', slug: 'disposable-qa' };

describe('retention export GET handler (real execution with isolated dependencies)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.secureApiError.mockImplementation((error: unknown) =>
      error instanceof ApiSecurityError
        ? Response.json({ error: error.code }, { status: error.status })
        : Response.json({ error: 'internal_error' }, { status: 500 }));

    mocks.requireApiUser.mockResolvedValue({ id: 'synthetic-owner' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue(organization);
    mocks.requirePermission.mockResolvedValue({ role: 'owner' });
    mocks.assertPlanAtLeast.mockResolvedValue({ ok: true, entitlements: { plan: 'business' } });
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: { action: 'export_data', verifiedAt: '2026-10-21T09:00:00.000Z' },
    });
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
  });

  it('returns an unauthenticated 401 without application-error telemetry or export work', async () => {
    mocks.requireApiUser.mockRejectedValueOnce(new ApiSecurityError({
      code: 'unauthorized', status: 401, message: 'Authentication required.',
    }));
    const response = await GET(new Request(requestUrl));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthorized' });
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.reportError).not.toHaveBeenCalled();
    expect(mocks.getCurrentOrganizationForUser).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('keeps a real permission denial observable and stops before plan, MFA or audit', async () => {
    const error = new ApiSecurityError({
      code: 'permission_denied', status: 403, message: 'Permission denied.',
    });
    mocks.requirePermission.mockRejectedValueOnce(error);
    const response = await GET(new Request(requestUrl));
    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.reportError).toHaveBeenCalledWith(error, expect.any(Object));
    expect(mocks.assertPlanAtLeast).not.toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('keeps an unavailable security control observable and refuses the export', async () => {
    const error = new ApiSecurityError({
      code: 'security_control_unavailable', status: 503, message: 'Security unavailable.',
    });
    mocks.requirePermission.mockRejectedValueOnce(error);
    const response = await GET(new Request(requestUrl));
    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.reportError).toHaveBeenCalledWith(error, expect.any(Object));
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('does not suppress unexpected errors with spoofed unauthorized fields', async () => {
    const error = Object.assign(new Error('unexpected failure'), { code: 'unauthorized', status: 401 });
    mocks.requireApiUser.mockRejectedValueOnce(error);
    const response = await GET(new Request(requestUrl));
    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.reportError).toHaveBeenCalledWith(error, expect.any(Object));
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('rejects a user without an organization before export or audit', async () => {
    mocks.getCurrentOrganizationForUser.mockResolvedValueOnce(null);

    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'organization_required' });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('rejects missing step-up verification without exporting or appending an audit event', async () => {
    mocks.requireStepUpForRequest.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: 'step_up_required' }, { status: 403 }),
    });

    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.checkDistributedRateLimit).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('enforces the rate limit before generating an export or audit entry', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValueOnce({ allowed: false });

    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(429);
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('blocks a below-business plan before step-up, export, or audit', async () => {
    mocks.assertPlanAtLeast.mockResolvedValueOnce({
      ok: false,
      status: 402,
      error: 'subscription_required',
      message: 'Business plan required',
      entitlements: { plan: 'starter' },
    });

    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ error: 'upgrade_required' });
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.checkDistributedRateLimit).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalled();
  });

  it('does not export data if the audit writer throws unexpectedly', async () => {
    mocks.createAuditEvent.mockRejectedValueOnce(new Error('isolated audit writer unavailable'));

    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal_error' });
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(mocks.createAuditEvent).toHaveBeenCalledTimes(1);
    expect(mocks.reportError).toHaveBeenCalled();
  });

  it('fails closed with 503 and never sends export data when the audit event is not durable', async () => {
    mocks.createAuditEvent.mockResolvedValueOnce({ persisted: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const response = await GET(new Request(requestUrl));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'retention_policy_export_audit_unavailable' });
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(response.headers.get('Content-Disposition')).toBeNull();
      expect(mocks.createAuditEvent).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith('[retention-center] export_audit_unavailable');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('calls permission, business plan, MFA, rate limit and durable audit in the required order', async () => {
    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith({
      userId: 'synthetic-owner',
      organizationId: organization.id,
      permission: 'export_data',
    });
    expect(mocks.assertPlanAtLeast).toHaveBeenCalledWith(organization.id, 'business');
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledWith(expect.objectContaining({
      action: 'export_data',
      userId: 'synthetic-owner',
      organizationId: organization.id,
    }));
    const ordered = [
      mocks.requireApiUser.mock.invocationCallOrder[0],
      mocks.getCurrentOrganizationForUser.mock.invocationCallOrder[0],
      mocks.requirePermission.mock.invocationCallOrder[0],
      mocks.assertPlanAtLeast.mock.invocationCallOrder[0],
      mocks.requireStepUpForRequest.mock.invocationCallOrder[0],
      mocks.checkDistributedRateLimit.mock.invocationCallOrder[0],
      mocks.createAuditEvent.mock.invocationCallOrder[0],
    ];
    expect(ordered.every((n) => typeof n === 'number')).toBe(true);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
  });

  it('returns an integrity-verifiable, no-store JSON download only after audit persistence', async () => {
    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('attachment;');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

    const body = await response.json();
    expect(body.exportType).toBe('risckcomply.retention_policy_review_export');
    expect(body.payload.generatedBy.userId).toBe('synthetic-owner');
    expect(body.payload.organization.id).toBe(organization.id);
    expect(body.payload.legalStatus).toBe('draft_review_required');

    const verification = verifyEvidencePackIntegrity({
      payload: body.payload,
      integrity: body.integrity,
    });
    expect(verification.validHash).toBe(true);

    expect(mocks.createAuditEvent).toHaveBeenCalledTimes(1);
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: organization.id,
      actorUserId: 'synthetic-owner',
      action: 'retention_policy.exported',
      metadata: expect.objectContaining({ payloadHash: body.integrity.payloadHash }),
    }));
  });
});
