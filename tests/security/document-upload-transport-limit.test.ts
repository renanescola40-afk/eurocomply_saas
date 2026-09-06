import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { MAX_UPLOAD_BYTES, validateUploadSecurityFile } from '@/server/security/upload-security';

const nextConfig = readFileSync('next.config.ts', 'utf8');

function largePdfFile(sizeBytes: number) {
  const bytes = new Uint8Array(sizeBytes);
  bytes.set(Buffer.from('%PDF-1.7\n'));
  return new File([bytes], 'large-policy.pdf', { type: 'application/pdf' });
}

describe('document upload transport boundary', () => {
  it('keeps the Server Action transport above the 10 MB application file limit', () => {
    expect(nextConfig).toContain("bodySizeLimit: '12mb'");
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it('allows a valid document larger than the default 1 MB Server Action limit to reach application validation', async () => {
    const file = largePdfFile(2 * 1024 * 1024);

    expect(file.size).toBeGreaterThan(1024 * 1024);
    expect(file.size).toBeLessThanOrEqual(MAX_UPLOAD_BYTES);

    const result = await validateUploadSecurityFile(file, { maxBytes: MAX_UPLOAD_BYTES });
    expect(result.ok).toBe(true);
  });

  it('preserves the 10 MB application-level rejection boundary', async () => {
    const file = largePdfFile(MAX_UPLOAD_BYTES + 1);
    const result = await validateUploadSecurityFile(file, { maxBytes: MAX_UPLOAD_BYTES });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected oversized document to be rejected');
    expect(result.reason).toBe('file_too_large');
  });

  it('rejects an oversized Server Action file before reading its body into memory', async () => {
    const arrayBuffer = vi.fn(async () => {
      throw new Error('oversized_file_must_not_be_buffered');
    });
    const file = {
      name: 'oversized-policy.pdf',
      type: 'application/pdf',
      size: MAX_UPLOAD_BYTES + 1,
      arrayBuffer,
    } as unknown as File;

    const result = await validateUploadSecurityFile(file, { maxBytes: MAX_UPLOAD_BYTES });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected oversized document to be rejected');
    expect(result.reason).toBe('file_too_large');
    expect(result.fileHash).toBeNull();
    expect(result.buffer).toBeNull();
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});
