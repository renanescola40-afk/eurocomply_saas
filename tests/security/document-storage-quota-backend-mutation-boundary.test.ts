import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260906004000_billing_document_storage_quota.sql',
  'utf8',
);
const documentActions = readFileSync('src/server/actions/documents.ts', 'utf8');
const approvalRoute = readFileSync('src/app/api/documents/[id]/approval/route.ts', 'utf8');
const controlledStorageMigration = readFileSync(
  'supabase/migrations/20260822123544_v19_reconcile_controlled_document_storage.sql',
  'utf8',
);

describe('document storage quota backend mutation boundary', () => {
  it('revokes direct browser metadata mutations while preserving authenticated reads', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on table public.documents from anon, authenticated;',
    );
    expect(migration).toContain('grant select on table public.documents to authenticated;');
    expect(migration).toContain(
      "has_table_privilege('authenticated', 'public.documents', 'INSERT')",
    );
    expect(migration).toContain(
      "has_table_privilege('authenticated', 'public.documents', 'UPDATE')",
    );
    expect(migration).toContain(
      "has_table_privilege('authenticated', 'public.documents', 'DELETE')",
    );
    expect(migration).toContain('direct browser document metadata mutation privilege survived');
  });

  it('keeps document mutation in reviewed server/admin flows', () => {
    expect(documentActions).toContain('createAdminClient()');
    expect(documentActions).toContain(".from('documents')\n    .insert(");
    expect(documentActions).toContain("storage.from(DOCUMENT_BUCKET).remove");
    expect(approvalRoute).toContain('tryCreateAdminClient()');
    expect(approvalRoute).toContain(".from('documents')\n      .update({ status: nextStatus })");
  });

  it('keeps the real controlled document bucket closed to direct authenticated mutation', () => {
    expect(controlledStorageMigration).toContain('No direct controlled document uploads');
    expect(controlledStorageMigration).toContain('No direct controlled document updates');
    expect(controlledStorageMigration).toContain('No direct controlled document deletes');
    expect(controlledStorageMigration).toContain("bucket_id = 'controlled-documents' and false");
  });
});
