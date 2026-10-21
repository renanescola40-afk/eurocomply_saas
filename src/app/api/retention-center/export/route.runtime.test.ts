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
vi.mock('@/server/security/api-guards', () => ({
  requireApiUser: mocks.requireApiUser,
  requirePermission: mocks.requirePermission,
  secureApiError: () => Response.json({ error: 'internal_error' }, { status: 500 }),
}));
vi.mock('@/server/security/step-up', () => ({
  requireStepUpForRequest: mocks.requireStepUpForRequest,
  publicStepUpSummary: () => ({ action: 'export_data', verified: true }),
}));

import { verifyEvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { GET } from './route';

const requestUrl = 'https://www.risckcomply.com/api/retention-center/export';
const organization = { id: 'synthetic-organization', name: 'Disposable QA', slug: 'disposable-qa' };

describe('retention export GET handler (real execution with isolated dependencies)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
