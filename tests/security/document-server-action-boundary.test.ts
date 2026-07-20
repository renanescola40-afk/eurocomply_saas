import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const documents = readFileSync('src/server/actions/documents.ts', 'utf8');
const templates = readFileSync('src/server/actions/template-documents.ts', 'utf8');

describe('document server action enterprise boundary', () => {
  it('enforces fail-closed distributed throttling and quota before storage', () => {
    expect(documents).toContain("policy: 'upload'");
    expect(documents).toContain("failureMode: 'fail-closed'");
    expect(documents).toContain("route: `server-action:${input.action}Document`");
    expect(documents).toContain('await enforceDocumentQuota(payload.organizationId);');

    const uploadStart = documents.indexOf('export async function uploadDocument');
    const uploadSource = documents.slice(uploadStart, documents.indexOf('export async function deleteDocument'));
    expect(uploadSource.indexOf('await enforceDocumentMutationRateLimit')).toBeLessThan(
      uploadSource.indexOf('await enforceDocumentQuota'),
    );
    expect(uploadSource.indexOf('await enforceDocumentQuota')).toBeLessThan(
      uploadSource.indexOf('validateUploadSecurityFile'),
    );
    expect(uploadSource.indexOf('await enforceDocumentQuota')).toBeLessThan(
      uploadSource.indexOf('.storage.from(DOCUMENT_BUCKET).upload'),
    );
  });

  it('requires durable audit and compensates the exact inserted row', () => {
    expect(documents).toContain('auditPersisted = audit.persisted');
    expect(documents).toContain('if (!auditPersisted)');
    expect(documents).toContain("area: 'document_create_audit_rollback'");
    expect(documents).toContain(".eq('id', data.id)");
    expect(documents).toContain(".eq('organization_id', payload.organizationId)");
    expect(documents).toContain(".eq('uploaded_by', userId)");
    expect(documents).toContain(".eq('storage_path', payload.storagePath)");
    expect(documents).not.toContain(".select('*')");
  });

  it('removes generated storage when downstream metadata creation fails', () => {
    const uploadIndex = templates.indexOf('.upload(storagePath, content');
    expect(templates.indexOf('await enforceDocumentMutationRateLimit')).toBeLessThan(uploadIndex);
    expect(templates.indexOf('await enforceDocumentQuota')).toBeLessThan(uploadIndex);
    expect(templates).toContain('return await createServerGeneratedDocument({');
    expect(templates).toContain('remove([storagePath])');
    expect(templates).toContain("area: 'template_document_storage_compensation'");
    expect(templates).toContain('hasStoragePath: true');
  });
});
