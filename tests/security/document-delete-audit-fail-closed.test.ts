import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = readFileSync(join(root, 'src/server/actions/documents.ts'), 'utf8');
const deleteAction = source.slice(source.indexOf('export async function deleteDocument'));

describe('controlled document deletion audit boundary', () => {
  it('requires a durable authorization audit before the first destructive mutation', () => {
    const authorizationAudit = deleteAction.indexOf('const authorizationAudit = await logAuditEvent');
    const authorizationGuard = deleteAction.indexOf('if (!authorizationAudit.persisted)');
    const storageDelete = deleteAction.indexOf("storage.from(DOCUMENT_BUCKET).remove([document.storage_path])");
    const metadataDelete = deleteAction.indexOf(".from('documents')\n    .delete()");

    expect(authorizationAudit).toBeGreaterThanOrEqual(0);
    expect(deleteAction).toContain("action: 'document.delete_authorized'");
    expect(authorizationGuard).toBeGreaterThan(authorizationAudit);
    expect(storageDelete).toBeGreaterThan(authorizationGuard);
    expect(metadataDelete).toBeGreaterThan(authorizationGuard);
  });

  it('never reports success when the completion audit is unavailable', () => {
    const completionAudit = deleteAction.indexOf('const completionAudit = await logAuditEvent');
    const completionGuard = deleteAction.indexOf('if (!completionAudit.persisted)');
    const successReturn = deleteAction.indexOf('return deletedDocument');

    expect(completionAudit).toBeGreaterThanOrEqual(0);
    expect(deleteAction).toContain("action: 'document.deleted'");
    expect(completionGuard).toBeGreaterThan(completionAudit);
    expect(successReturn).toBeGreaterThan(completionGuard);
  });
});
