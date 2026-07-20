import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDocumentFromTemplate } from './template-documents';

const mocks = vi.hoisted(() => ({
  assertCurrentUserCan: vi.fn(),
  createAdminClient: vi.fn(),
  createServerGeneratedDocument: vi.fn(),
  enforceDocumentMutationRateLimit: vi.fn(),
  enforceDocumentQuota: vi.fn(),
  reportError: vi.fn(),
  requireCurrentUser: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('@/server/auth/permissions', () => ({
  assertCurrentUserCan: mocks.assertCurrentUserCan,
}));

vi.mock('@/server/actions/documents', () => ({
  createServerGeneratedDocument: mocks.createServerGeneratedDocument,
  enforceDocumentMutationRateLimit: mocks.enforceDocumentMutationRateLimit,
  enforceDocumentQuota: mocks.enforceDocumentQuota,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue({ id: USER_ID });
  mocks.assertCurrentUserCan.mockResolvedValue('owner');
  mocks.enforceDocumentMutationRateLimit.mockResolvedValue(undefined);
  mocks.enforceDocumentQuota.mockResolvedValue(undefined);
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.createAdminClient.mockReturnValue({
    storage: {
      from: vi.fn(() => ({
        upload: mocks.upload,
        remove: mocks.remove,
      })),
    },
  });
});

describe('template document storage compensation', () => {
  it('denies before rendering or storage when mutation controls reject the request', async () => {
    mocks.enforceDocumentMutationRateLimit.mockRejectedValue(new Error('rate limited'));

    await expect(
      createDocumentFromTemplate({
        organizationId: ORGANIZATION_ID,
        templateId: 'gdpr-ropa',
      }),
    ).rejects.toThrow('rate limited');

    expect(mocks.enforceDocumentMutationRateLimit).toHaveBeenCalledWith({
      action: 'template',
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
    });
    expect(mocks.enforceDocumentQuota).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('removes the uploaded object when metadata or audit persistence fails', async () => {
    mocks.createServerGeneratedDocument.mockRejectedValue(new Error('audit unavailable'));

    await expect(
      createDocumentFromTemplate({
        organizationId: ORGANIZATION_ID,
        templateId: 'gdpr-ropa',
      }),
    ).rejects.toThrow('Unable to create template document.');

    expect(mocks.upload).toHaveBeenCalledTimes(1);
    const storagePath = mocks.upload.mock.calls[0][0];
    expect(storagePath).toContain(ORGANIZATION_ID);
    expect(mocks.remove).toHaveBeenCalledWith([storagePath]);
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ area: 'template_document_metadata_create' }),
    );
  });

  it('reports storage compensation failure without exposing the storage path', async () => {
    mocks.createServerGeneratedDocument.mockRejectedValue(new Error('metadata unavailable'));
    mocks.remove.mockResolvedValue({ error: new Error('storage unavailable') });

    await expect(
      createDocumentFromTemplate({
        organizationId: ORGANIZATION_ID,
        templateId: 'gdpr-ropa',
      }),
    ).rejects.toThrow('Unable to create template document.');

    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        area: 'template_document_storage_compensation',
        hasStoragePath: true,
      }),
    );
    const compensationContext = mocks.reportError.mock.calls.find(
      ([, context]) => context.area === 'template_document_storage_compensation',
    )?.[1];
    expect(compensationContext).not.toHaveProperty('storagePath');
  });
});
