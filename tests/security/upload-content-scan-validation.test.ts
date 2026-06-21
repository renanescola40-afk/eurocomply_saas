import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isDocumentStoragePathInOrganization, validateDocumentFile } from '@/lib/documents/upload';
import { createDocumentSignedDownloadUrl } from '@/server/actions/document-downloads';
import { uploadDocument } from '@/server/actions/documents';
import { validateUploadFileSecurity } from '@/server/security/file-signature';
import { scanUploadForMalware, shouldBlockUploadForMalwareScan } from '@/server/security/malware-scan';
import {
  SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS,
  isSignedUrlExpired,
  validateUploadSecurityFile,
} from '@/server/security/upload-security';

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  getUserOrganizationMemberships: vi.fn(),
  assertCurrentUserCan: vi.fn(),
  createAdminClient: vi.fn(),
  reportError: vi.fn(),
  logAuditEvent: vi.fn(),
  createAuditEvent: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock('@/server/queries/current-organization', () => ({ getUserOrganizationMemberships: mocks.getUserOrganizationMemberships }));
vi.mock('@/server/auth/permissions', () => ({ assertCurrentUserCan: mocks.assertCurrentUserCan }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/lib/observability/report-error', () => ({ reportError: mocks.reportError }));
vi.mock('@/server/actions/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('@/server/queries/audit-events', () => ({ createAuditEvent: mocks.createAuditEvent }));

const ENTERPRISE_ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const ENTERPRISE_USER_ID = '22222222-2222-4222-8222-222222222222';
const PDF_BYTES = '%PDF-1.7\nbody';

function pdfFile(name = 'policy.pdf') {
  return new File([PDF_BYTES], name, { type: 'application/pdf' });
}

function setHttpScannerEnv() {
  process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS = 'true';
  process.env.MALWARE_SCANNER_PROVIDER = 'http';
  process.env.MALWARE_SCANNER_ENDPOINT = 'https://scanner.example/scan';
  process.env.MALWARE_SCANNER_ALLOWED_HOSTS = 'scanner.example';
}

function setupSupabaseUploadDocument(document = { id: 'doc-clean', name: 'Policy', category: 'general' }) {
  const query: any = {};
  query.insert = vi.fn(() => query);
  query.select = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue({ data: document, error: null });

  const upload = vi.fn().mockResolvedValue({ data: { path: `${ENTERPRISE_ORGANIZATION_ID}/${ENTERPRISE_USER_ID}/policy.pdf` }, error: null });
  const remove = vi.fn().mockResolvedValue({ data: null, error: null });
  const storageFrom = vi.fn(() => ({ upload, remove }));
  const from = vi.fn(() => query);

  mocks.createAdminClient.mockReturnValue({ from, storage: { from: storageFrom } });

  return { query, upload };
}

function setupSupabaseDocument(document: { id: string; name: string; storage_path: string; organization_id: string } | null) {
  const query: any = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue({ data: document, error: null });

  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/document' }, error: null });
  const storageFrom = vi.fn(() => ({ createSignedUrl }));
  const from = vi.fn(() => query);

  mocks.createAdminClient.mockReturnValue({ from, storage: { from: storageFrom } });

  return { createSignedUrl, query };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS;
  delete process.env.MALWARE_SCANNER_PROVIDER;
  delete process.env.MALWARE_SCANNER_ENDPOINT;
  delete process.env.MALWARE_SCANNER_URL;
  delete process.env.MALWARE_SCANNER_API_KEY;
  delete process.env.MALWARE_SCANNER_ALLOWED_HOSTS;

  mocks.requireCurrentUser.mockResolvedValue({ id: 'user-a' });
  mocks.getUserOrganizationMemberships.mockResolvedValue([{ organization_id: 'org-a' }]);
  mocks.assertCurrentUserCan.mockResolvedValue('member');
  mocks.logAuditEvent.mockResolvedValue(undefined);
  mocks.createAuditEvent.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('upload and document malware scan security', () => {
  it('validates extension, declared MIME and magic number', async () => {
    const file = pdfFile();

    expect(validateDocumentFile(file)).toBeNull();
    expect(
      validateUploadFileSecurity({
        fileName: file.name,
        claimedMimeType: file.type,
        sizeBytes: file.size,
        bytes: Buffer.from(PDF_BYTES),
        maxBytes: 10 * 1024 * 1024,
      }),
    ).toMatchObject({ ok: true, mimeType: 'application/pdf', extension: 'pdf' });
    await expect(validateUploadSecurityFile(file)).resolves.toMatchObject({
      ok: true,
      fileHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      mimeDetected: 'application/pdf',
    });
  });

  it('persists upload only after a clean scanner verdict', async () => {
    setHttpScannerEnv();
    const supabase = setupSupabaseUploadDocument();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ status: 'clean', reason: 'ok' })),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      uploadDocument(
        { organizationId: ENTERPRISE_ORGANIZATION_ID, name: 'Policy', category: 'general', expiresAt: null },
        pdfFile(),
        ENTERPRISE_USER_ID,
      ),
    ).resolves.toMatchObject({ id: 'doc-clean' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(supabase.upload).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(supabase.upload.mock.invocationCallOrder[0]);
    expect(supabase.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ scan_status: 'clean', scan_provider: 'http', scan_required: true, mime_detected: 'application/pdf' }),
    );
  });

  it('fails closed when the scanner is unavailable', async () => {
    process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS = 'true';
    process.env.MALWARE_SCANNER_PROVIDER = 'unknown-provider';

    const scan = await scanUploadForMalware({
      buffer: Buffer.from(PDF_BYTES),
      mimeType: 'application/pdf',
      filename: 'policy.pdf',
      organizationId: 'org-a',
      fileHash: 'hash-a',
    });

    expect(scan).toMatchObject({ status: 'unavailable', provider: 'unknown-provider', required: true });
    expect(shouldBlockUploadForMalwareScan(scan)).toBe(true);
  });

  it('blocks detected and suspicious scanner verdicts before storage', async () => {
    setHttpScannerEnv();
    const supabase = setupSupabaseUploadDocument();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ status: 'suspicious', reason: 'macro-like content' })),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      uploadDocument(
        { organizationId: ENTERPRISE_ORGANIZATION_ID, name: 'Policy', category: 'general', expiresAt: null },
        pdfFile(),
        ENTERPRISE_USER_ID,
      ),
    ).rejects.toThrow('scanner reported unsafe content');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(supabase.upload).not.toHaveBeenCalled();
    expect(supabase.query.insert).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document_upload_rejected',
        metadata: expect.objectContaining({ scanStatus: 'suspicious', scanProvider: 'http', scanRequired: true }),
      }),
    );
  });

  it('recognizes cross-tenant storage paths before issuing signed URLs', async () => {
    const supabase = setupSupabaseDocument(null);

    expect(isDocumentStoragePathInOrganization('org-b/user-a/document.pdf', 'org-a')).toBe(false);
    await expect(createDocumentSignedDownloadUrl('doc-from-org-b')).rejects.toThrow('Document not found');
    expect(supabase.query.in).toHaveBeenCalledWith('organization_id', ['org-a']);
    expect(supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  it('blocks signed downloads without read permission or tenant scope', async () => {
    const supabase = setupSupabaseDocument({
      id: 'doc-a',
      name: 'Policy.pdf',
      storage_path: 'org-a/user-a/policy.pdf',
      organization_id: 'org-a',
    });
    mocks.assertCurrentUserCan.mockRejectedValueOnce(new Error('permission denied'));

    await expect(createDocumentSignedDownloadUrl('doc-a')).rejects.toThrow('permission denied');
    expect(supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  it('creates short-lived signed URLs and treats them as expired after the TTL', async () => {
    const supabase = setupSupabaseDocument({
      id: 'doc-a',
      name: 'Policy.pdf',
      storage_path: 'org-a/user-a/policy.pdf',
      organization_id: 'org-a',
    });

    const result = await createDocumentSignedDownloadUrl('doc-a');

    expect(result).toMatchObject({ signedUrl: 'https://signed.example/document', expiresIn: SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS });
    expect(supabase.createSignedUrl).toHaveBeenCalledWith('org-a/user-a/policy.pdf', SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS, {
      download: 'Policy.pdf',
    });
    expect(
      isSignedUrlExpired({
        issuedAt: '2026-06-21T10:00:00.000Z',
        expiresInSeconds: SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS,
        now: new Date('2026-06-21T10:01:01.000Z'),
      }),
    ).toBe(true);
  });

  it('keeps controlled document storage reads backend-mediated', () => {
    const hardeningMigration = readFileSync(join(process.cwd(), 'supabase/migrations/20260620090000_upload_malware_scan_hardening.sql'), 'utf8');
    const readLockdownMigration = readFileSync(join(process.cwd(), 'supabase/migrations/20260620120000_controlled_document_storage_read_lockdown.sql'), 'utf8');

    expect(hardeningMigration).toContain('No direct controlled document reads');
    expect(hardeningMigration).toContain("bucket_id = 'controlled-documents' and false");
    expect(readLockdownMigration).toContain('drop policy if exists "Members can read controlled documents"');
  });
});
