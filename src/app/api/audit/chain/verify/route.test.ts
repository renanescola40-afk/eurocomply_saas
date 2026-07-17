import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertPlanAtLeast: vi.fn(),
  upgradeRequiredResponse: vi.fn(),
  getCurrentUser: vi.fn(),
  buildAuditRequestContextFromRequest: vi.fn(() => ({ ipAddress: '203.0.113.10', userAgent: 'Vitest' })),
  createAuditEvent: vi.fn(),
  listAuditChainEventsForVerification: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  assertOrganizationPermission: vi.fn(),
  permissionDeniedResponse: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  getClientIpFromRequest: vi.fn(() => '203.0.113.10'),
  getUserAgentFromRequest: vi.fn(() => 'Vitest'),
  verifyAuditChain: vi.fn(),
  requireStepUpForRequest: vi.fn(),
}));

vi.mock('@/server/billing/entitlements', () => ({
  assertPlanAtLeast: mocks.assertPlanAtLeast,
}));

vi.mock('@/server/billing/upgrade-response', () => ({
  upgradeRequiredResponse: mocks.upgradeRequiredResponse,
}));

vi.mock('@/server/queries/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/server/queries/audit-chain-events', () => ({
  listAuditChainEventsForVerification: mocks.listAuditChainEventsForVerification,
}));

vi.mock('@/server/queries/audit-events', () => ({
  buildAuditRequestContextFromRequest: mocks.buildAuditRequestContextFromRequest,
  createAuditEvent: mocks.createAuditEvent,
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/security/rbac', () => ({
  assertOrganizationPermission: mocks.assertOrganizationPermission,
  permissionDeniedResponse: mocks.permissionDeniedResponse,
}));

vi.mock('@/server/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
  getClientIpFromRequest: mocks.getClientIpFromRequest,
  getUserAgentFromRequest: mocks.getUserAgentFromRequest,
}));

vi.mock('@/server/security/audit-chain', () => ({
  verifyAuditChain: mocks.verifyAuditChain,
}));

vi.mock('@/server/security/step-up', () => ({
  requireStepUpForRequest: mocks.requireStepUpForRequest,
}));

import {
  DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT,
  GET,
  MAX_AUDIT_CHAIN_VERIFY_LIMIT,
  parseAuditChainVerifyLimit,
} from './route';

describe('audit chain verification request contract', () => {
  const baseUrl = 'https://app.example.test/api/audit/chain/verify';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_123' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_123', name: 'Acme', slug: 'acme' });
    mocks.assertOrganizationPermission.mockResolvedValue({ ok: true, status: 200, role: 'admin', permission: 'read_audit' });
    mocks.assertPlanAtLeast.mockResolvedValue({ ok: true, entitlements: { plan: 'business' } });
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: {
        action: 'audit_chain_verify',
        verifiedAt: '2026-06-21T10:00:00.000Z',
      },
    });
    mocks.listAuditChainEventsForVerification.mockResolvedValue([
      {
        id: 'evt_001',
        organization_id: 'org_123',
        actor_user_id: 'user_123',
        action: 'document.upload',
        entity_type: 'document',
        entity_id: 'doc_123',
        metadata: { source: 'test' },
        created_at: '2026-06-21T09:00:00.000Z',
        previous_hash: null,
        event_hash: 'hash-1',
        hash_signature: 'sig-1',
      },
    ]);
    mocks.verifyAuditChain.mockReturnValue({ ok: true, checked: 1, lastHash: 'hash-1', failures: [], expectedPreviousHash: null });
    mocks.createAuditEvent.mockResolvedValue({ persisted: true, transactional: true, eventHash: 'hash-verify' });
    mocks.permissionDeniedResponse.mockReturnValue(Response.json({ error: 'permission_denied' }, { status: 403 }));
    mocks.upgradeRequiredResponse.mockReturnValue(Response.json({ error: 'upgrade_required' }, { status: 402 }));
  });

  it('uses the default limit when none is provided', () => {
    expect(parseAuditChainVerifyLimit(baseUrl)).toEqual({
      ok: true,
      limit: DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT,
    });
  });

  it('accepts integer limits inside the allowed range', () => {
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=1`)).toEqual({ ok: true, limit: 1 });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=${MAX_AUDIT_CHAIN_VERIFY_LIMIT}`)).toEqual({
      ok: true,
      limit: MAX_AUDIT_CHAIN_VERIFY_LIMIT,
    });
  });

  it('rejects non-integer and ambiguous limits instead of clamping silently', () => {
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=abc`)).toEqual({ ok: false, error: 'invalid_limit' });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=1.5`)).toEqual({ ok: false, error: 'invalid_limit' });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=-1`)).toEqual({ ok: false, error: 'invalid_limit' });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=`)).toEqual({ ok: false, error: 'invalid_limit' });
  });

  it('rejects out-of-range limits', () => {
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=0`)).toEqual({ ok: false, error: 'invalid_limit' });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=${MAX_AUDIT_CHAIN_VERIFY_LIMIT + 1}`)).toEqual({
      ok: false,
      error: 'invalid_limit',
    });
  });

  it('rejects verification before step-up when RBAC is missing', async () => {
    mocks.assertOrganizationPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'insufficient_role_permission',
      permission: 'read_audit',
    });

    const response = await GET(new Request(`${baseUrl}?limit=10`));

    expect(response.status).toBe(403);
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.verifyAuditChain).not.toHaveBeenCalled();
  });

  it('rejects verification without a valid step-up token', async () => {
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: false,
      assessment: {
        action: 'audit_chain_verify',
        reason: 'missing_verification',
        verifiedAt: null,
        expiresAt: null,
      },
      response: Response.json({ error: 'step_up_required' }, { status: 403 }),
    });

    const response = await GET(new Request(`${baseUrl}?limit=10`));

    expect(response.status).toBe(403);
    expect(mocks.verifyAuditChain).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'audit_chain.verified' }));
  });

  it('fails closed when audit chain events cannot be loaded', async () => {
    mocks.listAuditChainEventsForVerification.mockRejectedValue(new Error('audit_chain_events_unavailable'));

    await expect(GET(new Request(`${baseUrl}?limit=10`))).rejects.toThrow('audit_chain_events_unavailable');
    expect(mocks.verifyAuditChain).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'audit_chain.verified' }));
  });

  it('verifies the chain only after RBAC and signed step-up', async () => {
    const request = new Request(`${baseUrl}?limit=10`, { headers: { 'x-eurocomply-step-up-token': 'token' } });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.buildAuditRequestContextFromRequest).toHaveBeenCalledWith(request);
    expect(mocks.requireStepUpForRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'audit_chain_verify',
        userId: 'user_123',
        organizationId: 'org_123',
      }),
    );
    expect(mocks.listAuditChainEventsForVerification).toHaveBeenCalledWith('org_123', 11);
    expect(mocks.verifyAuditChain).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'evt_001', organizationId: 'org_123', eventHash: 'hash-1' })],
      { expectedPreviousHash: null },
    );
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_123',
        actorUserId: 'user_123',
        action: 'audit_chain.verified',
        entityType: 'audit_chain',
        requestContext: { ipAddress: '203.0.113.10', userAgent: 'Vitest' },
        metadata: expect.objectContaining({
          ok: true,
          chainedEventsChecked: 1,
          stepUpAction: 'audit_chain_verify',
        }),
      }),
    );
    expect(body.stepUpVerified).toBe(true);
    expect(body.verificationAuditEvent).toEqual(expect.objectContaining({ persisted: true, transactional: true }));
  });
});