import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createServerGeneratedDocument, uploadDocument } from './documents';

const mocks = vi.hoisted(() => ({
  assertCurrentUserCan: vi.fn(),
  assertDocumentQuota: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  logAuditEvent: vi.fn(),
  reportError: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('@/server/auth/permissions', () => ({
  assertCurrentUserCan: mocks.assertCurrentUserCan,
}));

vi.mock('@/server/billing/entitlements', () => ({
  assertDocumentQuota: mocks.assertDocumentQuota,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/actions/audit', () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const STORAGE_PATH = `${ORGANIZATION_ID}/${USER_ID}/template.md`;

function serverGeneratedInput() {
  return {
    organizationId: ORGANIZATION_ID,
    name: 'Generated policy',
    category: 'policy',
    storagePath: STORAGE_PATH,
    mimeType: 'text/markdown',
    sizeBytes: 128,
    expiresAt: null,
    metadata: { source: 'template', serverGenerated: true },
  };
}

function documentQuery() {
  const query: any = {};
  query.insert = vi.fn(() => query);
  query.select = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue({
    data: {
      id: '33333333-3333-4333-8333-333333333333',
      organization_id: ORGANIZATION_ID,
      uploaded_by: USER_ID,
      name: 'Generated policy',
      storage_path: STORAGE_PATH,
    },
    error: null,
  });
  query.delete = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS;
  delete process.env.MALWARE_SCANNER_PROVIDER;

  mocks.requireCurrentUser.mockResolvedValue({ id: USER_ID });
  mocks.assertCurrentUserCan.mockResolvedValue('owner');
  mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
  mocks.assertDocumentQuota.mockResolvedValue({
    ok: true,
    entitlements: { plan: 'enterprise', maxDocuments: Number.POSITIVE_INFINITY },
    currentCount: 0,
  });
  mocks.logAuditEvent.mockResolvedValue({ persisted: true });
});

describe('document server action mutation controls', () => {
  it('fails closed before persistence when the distributed limiter is unavailable or denies', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({
      allowed: false,
      reason: 'backend_unavailable',
      failureMode: 'fail-closed',
    });

    await expect(createServerGeneratedDocument(serverGeneratedInput())).rejects.toThrow(
      'Too many document requests',
    );

    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        policy: 'upload',
        userId: USER_ID,
        organizationId: ORGANIZATION_ID,
        route: 'server-action:createDocument',
        action: 'document.create',
        failureMode: 'fail-closed',
      }),
    );
    expect(mocks.assertDocumentQuota).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('enforces the server-side document quota before upload validation or storage', async () => {
    mocks.assertDocumentQuota.mockResolvedValue({
      ok: false,
      status: 402,
      error: 'document_quota_exceeded',
      message: 'Document quota exceeded for the starter plan.',
      entitlements: { plan: 'starter', maxDocuments: 40 },
      currentCount: 40,
    });

    const file = new File(['safe bytes'], 'policy.pdf', { type: 'application/pdf' });
    await expect(
      uploadDocument(
        { organizationId: ORGANIZATION_ID, name: 'Policy', category: 'policy', expiresAt: null },
        file,
      ),
    ).rejects.toThrow('Document quota exceeded');

    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        route: 'server-action:uploadDocument',
        action: 'document.upload',
        failureMode: 'fail-closed',
      }),
    );
    expect(mocks.assertDocumentQuota).toHaveBeenCalledWith(ORGANIZATION_ID);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('compensates the exact inserted row when durable audit persistence fails', async () => {
    const query = documentQuery();
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });
    mocks.logAuditEvent.mockResolvedValue({ persisted: false });

    await expect(createServerGeneratedDocument(serverGeneratedInput())).rejects.toThrow(
      'Unable to create document.',
    );

    expect(query.select).toHaveBeenCalledWith(expect.not.stringContaining('*'));
    expect(query.delete).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith('id', '33333333-3333-4333-8333-333333333333');
    expect(query.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
    expect(query.eq).toHaveBeenCalledWith('uploaded_by', USER_ID);
    expect(query.eq).toHaveBeenCalledWith('storage_path', STORAGE_PATH);
  });

  it('also compensates when the audit writer throws', async () => {
    const query = documentQuery();
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });
    mocks.logAuditEvent.mockRejectedValue(new Error('audit backend unavailable'));

    await expect(createServerGeneratedDocument(serverGeneratedInput())).rejects.toThrow(
      'Unable to create document.',
    );

    expect(query.delete).toHaveBeenCalledTimes(1);
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ area: 'document_create_audit' }),
    );
  });
});
