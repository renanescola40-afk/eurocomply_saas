import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  uploadDocument: vi.fn(),
}));

vi.mock('@/server/actions/documents', () => {
  class DocumentUploadValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DocumentUploadValidationError';
    }
  }

  return {
    DocumentUploadValidationError,
    uploadDocument: mocks.uploadDocument,
  };
});

import { DocumentUploadValidationError } from '@/server/actions/documents';
import { uploadDocumentWithControlledValidation } from '@/server/actions/document-upload-form';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

describe('document upload controlled validation result', () => {
  it.each([
    ['empty file', 'File must not be empty.'],
    ['invalid extension', 'File extension is not allowed.'],
    ['invalid signature', 'File signature does not match the declared file type.'],
  ])('returns a controlled result for %s validation failures', async (_scenario, message) => {
    mocks.uploadDocument.mockRejectedValueOnce(new DocumentUploadValidationError(message));
    const file = new File([], 'policy.pdf', { type: 'application/pdf' });

    await expect(
      uploadDocumentWithControlledValidation(
        {
          organizationId: ORGANIZATION_ID,
          name: 'Policy',
          category: 'policy',
          expiresAt: null,
        },
        file,
      ),
    ).resolves.toEqual({ ok: false, code: 'invalid_upload' });
  });

  it('preserves unexpected failures as sanitized thrown errors', async () => {
    mocks.uploadDocument.mockRejectedValueOnce(new Error('storage unavailable'));
    const file = new File(['%PDF-1.7'], 'policy.pdf', { type: 'application/pdf' });

    await expect(
      uploadDocumentWithControlledValidation(
        {
          organizationId: ORGANIZATION_ID,
          name: 'Policy',
          category: 'policy',
          expiresAt: null,
        },
        file,
      ),
    ).rejects.toThrow('Unable to upload document.');
  });

  it('returns ok for a successful upload', async () => {
    mocks.uploadDocument.mockResolvedValueOnce({ id: 'doc-1' });
    const file = new File(['%PDF-1.7'], 'policy.pdf', { type: 'application/pdf' });

    await expect(
      uploadDocumentWithControlledValidation(
        {
          organizationId: ORGANIZATION_ID,
          name: 'Policy',
          category: 'policy',
          expiresAt: null,
        },
        file,
      ),
    ).resolves.toEqual({ ok: true });
  });
});
