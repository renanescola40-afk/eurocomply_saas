import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDocument, createServerGeneratedDocument } from '@/server/actions/documents';

const mocks = vi.hoisted(() => ({
  assertCurrentUserCan: vi.fn(),
  assertDocumentQuota: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  createAuditEvent: vi.fn(),
  logAuditEvent: vi.fn(),
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

vi.mock('@/server/queries/audit-events', () => ({
  createAuditEvent: mocks.createAuditEvent,
}));

vi.mock('@/server/actions/audit', () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS;
  delete process.env.MALWARE_SCANNER_PROVIDER;

  mocks.requireCurrentUser.mockResolvedValue({ id: USER_ID });
  mocks.assertCurrentUserCan.mockResolvedValue('owner');
  mocks.assertDocumentQuota.mockResolvedValue({
    ok: true,
    entitlements: { plan: 'enterprise', maxDocuments: Number.POSITIVE_INFINITY },
    currentCount: 0,
  });
  mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
  mocks.createAuditEvent.mockResolvedValue(undefined);
  mocks.logAuditEvent.mockResolvedValue({ persisted: true });
});

describe('enterprise upload scan bypass protection', () => {
  it.each([
    {
      name: 'forged clean scan metadata',
      metadata: {
        scanStatus: 'clean',
        scanRequired: true,
        scanProvider: 'http',
        scanCheckedAt: '2026-07-15T12:00:00.000Z',
        fileHash: 'forged-hash',
        fileSize: 12,
        mimeDetected: 'application/pdf',
      },
    },
    {
      name: 'forged server-generated metadata',
      metadata: {
        source: 'template',
        serverGenerated: true,
      },
    },
  ])('blocks direct document creation with $name', async ({ metadata }) => {
    process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS = 'true';
    process.env.MALWARE_SCANNER_PROVIDER = 'http';

    await expect(
      createDocument({
        organizationId: ORGANIZATION_ID,
        name: 'Bypass attempt',
        category: 'general',
        storagePath: `${ORGANIZATION_ID}/${USER_ID}/bypass.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 12,
        expiresAt: null,
        metadata,
      }),
    ).rejects.toThrow('enterprise upload scanning provenance is not trusted');

    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'upload_blocked',
        organizationId: ORGANIZATION_ID,
        actorUserId: USER_ID,
        metadata: expect.objectContaining({
          reason: 'enterprise_upload_scan_bypass',
          provenance: 'untrusted_metadata',
        }),
      }),
    );
  });

  it('allows the explicit server-generated path used by trusted template code', async () => {
    process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS = 'true';
    process.env.MALWARE_SCANNER_PROVIDER = 'http';

    const query: any = {};
    query.insert = vi.fn(() => query);
    query.select = vi.fn(() => query);
    query.single = vi.fn().mockResolvedValue({ data: { id: 'template-doc' }, error: null });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    await expect(
      createServerGeneratedDocument({
        organizationId: ORGANIZATION_ID,
        name: 'Generated template',
        category: 'policy',
        storagePath: `${ORGANIZATION_ID}/${USER_ID}/template.md`,
        mimeType: 'text/markdown',
        sizeBytes: 1024,
        expiresAt: null,
        metadata: {
          source: 'template',
          serverGenerated: true,
        },
      }),
    ).resolves.toMatchObject({ id: 'template-doc' });

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: ORGANIZATION_ID,
        storage_path: `${ORGANIZATION_ID}/${USER_ID}/template.md`,
      }),
    );
  });
});
