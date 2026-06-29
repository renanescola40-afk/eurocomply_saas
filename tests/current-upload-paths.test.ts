import { describe, expect, it } from 'vitest';
import {
  CONTROLLED_DOCUMENT_STORAGE_BUCKET,
  SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS,
  assertTenantStoragePathInOrganization,
  buildTenantScopedUploadPath,
  isTenantScopedStoragePath,
} from '../src/server/security/upload-security';

describe('current upload path boundaries', () => {
  it('builds organization scoped paths in the controlled bucket', () => {
    const path = buildTenantScopedUploadPath({ organizationId: 'org-a', userId: 'user-a', extension: 'pdf' });

    expect(CONTROLLED_DOCUMENT_STORAGE_BUCKET).toBe('controlled-documents');
    expect(path).toMatch(/^org-a\/user-a\/[a-f0-9-]+\.pdf$/);
    expect(isTenantScopedStoragePath(path, 'org-a')).toBe(true);
    expect(isTenantScopedStoragePath(path, 'org-b')).toBe(false);
  });

  it('rejects cross organization paths before storage access', () => {
    expect(() => assertTenantStoragePathInOrganization('org-b/user-a/file.pdf', 'org-a')).toThrow(
      'Document storage path does not match organization scope',
    );
    expect(() => assertTenantStoragePathInOrganization('../org-b/file.pdf', 'org-a')).toThrow(
      'Document storage path does not match organization scope',
    );
  });

  it('keeps signed URLs short lived', () => {
    expect(SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS).toBeGreaterThan(0);
    expect(SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS).toBeLessThanOrEqual(60);
  });
});
