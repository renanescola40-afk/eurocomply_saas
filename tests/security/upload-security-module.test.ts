import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_UPLOAD_BYTES,
  SIGNED_URL_EXPIRES_IN_SECONDS,
  assertTenantScopedStoragePath,
  buildTenantIsolatedUploadStoragePath,
  createMockMalwareScannerProvider,
  isShortLivedSignedUrlExpiry,
  scanUploadForMalware,
  shouldBlockUploadForMalwareScan,
  validateUploadPayload,
} from '@/server/security/upload-security';

const PDF_BYTES = '%PDF-1.7\nbody';

function pdfFile(name = 'policy.pdf') {
  return new File([PDF_BYTES], name, { type: 'application/pdf' });
}

afterEach(() => {
  delete process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS;
  delete process.env.MALWARE_SCANNER_PROVIDER;
  delete process.env.MALWARE_SCANNER_ENDPOINT;
  delete process.env.MALWARE_SCANNER_URL;
  delete process.env.MALWARE_SCANNER_API_KEY;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('upload-security enterprise controls', () => {
  it('accepts a valid document only when extension, MIME and magic number agree', async () => {
    const result = await validateUploadPayload({ file: pdfFile(), maxBytes: MAX_UPLOAD_BYTES });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.fileHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.fileSize).toBe(PDF_BYTES.length);
    expect(result.mimeDetected).toBe('application/pdf');
    expect(result.validation.extension).toBe('pdf');
  });

  it('blocks MIME spoofing when declared MIME does not match detected content', async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const file = new File([pngBytes], 'image.png', { type: 'application/pdf' });

    const result = await validateUploadPayload({ file, maxBytes: MAX_UPLOAD_BYTES });

    expect(result).toMatchObject({ ok: false, reason: 'mime_spoofing', mimeDetected: 'image/png' });
  });

  it('blocks prohibited executable or script extensions before storage', async () => {
    const result = await validateUploadPayload({ file: pdfFile('invoice.pdf.exe'), maxBytes: MAX_UPLOAD_BYTES });

    expect(result).toMatchObject({ ok: false, reason: 'dangerous_extension' });
  });

  it('blocks files whose magic number does not match an allowed document type', async () => {
    const file = new File(['<script>alert(1)</script>'], 'policy.pdf', { type: 'application/pdf' });

    const result = await validateUploadPayload({ file, maxBytes: MAX_UPLOAD_BYTES });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected invalid magic number to be blocked');
    expect(['unsupported_mime_type', 'signature_mismatch']).toContain(result.reason);
  });

  it('blocks path traversal file names before reading into storage paths', async () => {
    const result = await validateUploadPayload({ file: pdfFile('../policy.pdf'), maxBytes: MAX_UPLOAD_BYTES });

    expect(result).toMatchObject({ ok: false, reason: 'path_traversal' });
  });

  it('fails closed when enterprise malware scanning is required and scanner is unavailable', async () => {
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

  it('blocks when a real HTTP malware scanner reports a threat', async () => {
    process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS = 'true';
    process.env.MALWARE_SCANNER_PROVIDER = 'http';
    process.env.MALWARE_SCANNER_ENDPOINT = 'https://scanner.example/scan';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({ status: 'infected', signature: 'EICAR-Test-File' })),
      }),
    );

    const scan = await scanUploadForMalware({
      buffer: Buffer.from(PDF_BYTES),
      mimeType: 'application/pdf',
      filename: 'policy.pdf',
      organizationId: 'org-a',
      fileHash: 'hash-a',
    });

    expect(scan).toMatchObject({ status: 'infected', provider: 'http', required: true });
    expect(shouldBlockUploadForMalwareScan(scan)).toBe(true);
  });

  it('keeps mock malware scanner providers limited to test/development use', async () => {
    process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS = 'true';
    const provider = createMockMalwareScannerProvider({ status: 'clean', required: true });

    const scan = await provider.scan({
      buffer: Buffer.from(PDF_BYTES),
      mimeType: 'application/pdf',
      filename: 'policy.pdf',
      organizationId: 'org-a',
      fileHash: 'hash-a',
    });

    expect(scan).toMatchObject({ status: 'clean', provider: 'mock', required: true });
  });

  it('rejects cross-tenant storage paths and builds tenant-prefixed upload paths', () => {
    const storagePath = buildTenantIsolatedUploadStoragePath({
      organizationId: 'org-a',
      actorUserId: 'user-a',
      extension: 'pdf',
    });

    expect(storagePath).toMatch(/^org-a\/user-a\/[0-9a-f-]+\.pdf$/);
    expect(() => assertTenantScopedStoragePath('org-b/user-a/policy.pdf', 'org-a')).toThrow('Document storage path does not match organization scope');
  });

  it('enforces short-lived signed URL expiry policy', () => {
    expect(SIGNED_URL_EXPIRES_IN_SECONDS).toBeLessThanOrEqual(60);
    expect(isShortLivedSignedUrlExpiry(SIGNED_URL_EXPIRES_IN_SECONDS)).toBe(true);
    expect(isShortLivedSignedUrlExpiry(61)).toBe(false);
    expect(isShortLivedSignedUrlExpiry(0)).toBe(false);
  });
});
