import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sanitizeDocumentDownloadFileName: vi.fn((filename: string) => filename),
  reportError: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
  assertPlanAtLeast: vi.fn(),
  upgradeRequiredResponse: vi.fn(),
  buildAuditRequestContextFromRequest: vi.fn(() => ({ ipAddress: '203.0.113.10', userAgent: 'Vitest' })),
  createAuditEvent: vi.fn(),
  buildAuditEvidencePack: vi.fn(),
  requireOrganizationContext: vi.fn(),
  guardErrorResponse: vi.fn(),
  buildEvidencePackIntegrity: vi.fn(),
  assertOrganizationPermission: vi.fn(),
  permissionDeniedResponse: vi.fn(),
  publicStepUpSummary: vi.fn(),
  requireStepUpForRequest: vi.fn(),
}));

vi.mock('@/lib/documents/upload', () => ({
  sanitizeDocumentDownloadFileName: mocks.sanitizeDocumentDownloadFileName,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: mocks.rateLimitResponse,
}));

vi.mock('@/server/billing/entitlements', () => ({
  assertPlanAtLeast: mocks.assertPlanAtLeast,
}));

vi.mock('@/server/billing/upgrade-response', () => ({
  upgradeRequiredResponse: mocks.upgradeRequiredResponse,
}));

vi.mock('@/server/queries/audit-events', () => ({
  buildAuditRequestContextFromRequest: mocks.buildAuditRequestContextFromRequest,
  createAuditEvent: mocks.createAuditEvent,
}));

vi.mock('@/server/queries/audit-evidence-pack', () => ({
  buildAuditEvidencePack: mocks.buildAuditEvidencePack,
}));

vi.mock('@/server/security/guards', () => ({
  requireOrganizationContext: mocks.requireOrganizationContext,
  guardErrorResponse: mocks.guardErrorResponse,
}));

vi.mock('@/server/security/no-store', () => ({
  noStoreDownload: (body: BodyInit, init?: ResponseInit) => new Response(body, init),
  noStoreJson: (body: unknown, init?: ResponseInit) => Response.json(body, init),
}));

vi.mock('@/server/security/evidence-pack-integrity', () => ({
  buildEvidencePackIntegrity: mocks.buildEvidencePackIntegrity,
}));

vi.mock('@/server/security/rbac', () => ({
  assertOrganizationPermission: mocks.assertOrganizationPermission,
  permissionDeniedResponse: mocks.permissionDeniedResponse,
}));

vi.mock('@/server/security/step-up', () => ({
  publicStepUpSummary: mocks.publicStepUpSummary,
  requireStepUpForRequest: mocks.requireStepUpForRequest,
}));

import { GET } from './route';

function basePack() {
  return {
    summary: {
      score: 98,
      status: 'ready',
      documents: 2,
      vendors: 3,
      risks: 1,
      aiSystems: 1,
      aiIncidents: 0,
    },
  };
}

describe('audit evidence pack export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOrganizationContext.mockResolvedValue({
      user: { id: 'user_123' },
      organization: { id: 'org_123', name: 'Acme Corp', slug: 'acme' },
      organizationId: 'org_123',
      role: 'admin',
    });
    mocks.assertOrganizationPermission.mockResolvedValue({ ok: true, status: 200, role: 'admin', permission: 'export_data' });
    mocks.assertPlanAtLeast.mockResolvedValue({ ok: true, entitlements: { plan: 'business' } });
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: {
        action: 'audit_chain_export',
        verifiedAt: '2026-06-21T10:00:00.000Z',
      },
    });
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.buildAuditEvidencePack.mockResolvedValue(basePack());
    mocks.buildEvidencePackIntegrity.mockReturnValue({
      schemaVersion: '2026-06-10',
      algorithm: 'sha256',
      payloadHash: 'payload-hash',
      signed: true,
      hmacAlgorithm: 'hmac-sha256',
      signature: 'signature',
      generatedAt: '2026-06-21T10:01:00.000Z',
    });
    mocks.publicStepUpSummary.mockReturnValue({ verified: true });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true, transactional: true, eventHash: 'hash-export' });
    mocks.permissionDeniedResponse.mockReturnValue(Response.json({ error: 'permission_denied' }, { status: 403 }));
    mocks.upgradeRequiredResponse.mockReturnValue(Response.json({ error: 'upgrade_required' }, { status: 402 }));
    mocks.rateLimitResponse.mockReturnValue(Response.json({ error: 'rate_limited' }, { status: 429 }));
  });

  it('returns a signed export only after RBAC and step-up', async () => {
    const request = new Request('https://app.example.test/api/audit/evidence-pack', { headers: { 'x-eurocomply-step-up-token': 'token' } });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('eurocomply-audit-evidence-pack-acme');
    expect(body.integrity).toEqual(expect.objectContaining({ signed: true, signature: 'signature' }));
    expect(body.stepUp).toEqual({ verified: true });
    expect(mocks.buildAuditRequestContextFromRequest).toHaveBeenCalledWith(request);
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'audit_chain_export',
        userId: 'user_123',
        organizationId: 'org_123',
      }),
    );
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_123',
        actorUserId: 'user_123',
        action: 'audit_chain.evidence_exported',
        entityType: 'audit_evidence_pack',
        requestContext: { ipAddress: '203.0.113.10', userAgent: 'Vitest' },
        metadata: expect.objectContaining({ payloadHash: 'payload-hash', signed: true, stepUpAction: 'audit_chain_export' }),
      }),
    );
  });

  it('rejects export when RBAC is missing', async () => {
    mocks.assertOrganizationPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'insufficient_role_permission',
      permission: 'export_data',
    });

    const response = await GET(new Request('https://app.example.test/api/audit/evidence-pack'));

    expect(response.status).toBe(403);
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.buildAuditEvidencePack).not.toHaveBeenCalled();
  });

  it('fails closed when the evidence export cannot be signed', async () => {
    mocks.buildEvidencePackIntegrity.mockReturnValue({
      schemaVersion: '2026-06-10',
      algorithm: 'sha256',
      payloadHash: 'payload-hash',
      signed: false,
      generatedAt: '2026-06-21T10:01:00.000Z',
    });

    const response = await GET(new Request('https://app.example.test/api/audit/evidence-pack'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'audit_evidence_pack_signing_unavailable' });
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'security.failure',
        entityType: 'audit_evidence_pack',
        requestContext: { ipAddress: '203.0.113.10', userAgent: 'Vitest' },
        metadata: expect.objectContaining({ reason: 'audit_evidence_pack_signing_unavailable' }),
      }),
    );
  });
});
