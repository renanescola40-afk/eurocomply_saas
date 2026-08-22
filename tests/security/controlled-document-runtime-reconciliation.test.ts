import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260822123544_v19_reconcile_controlled_document_storage.sql',
  'utf8',
);

describe('controlled document runtime reconciliation', () => {
  it('materializes every column written by the controlled upload route without rewriting legacy rows', () => {
    for (const column of [
      'uploaded_by',
      'storage_path',
      'checksum_sha256',
      'mime_type',
      'size_bytes',
      'scan_status',
      'scan_provider',
      'scan_required',
      'scan_checked_at',
      'file_hash',
      'file_size',
      'mime_detected',
      'upload_security_metadata',
    ]) {
      expect(migration).toContain(`add column if not exists ${column}`);
    }

    expect(migration).not.toMatch(/update\s+public\.documents\s+set/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.documents/i);
  });

  it('keeps legacy rows compatible while enforcing tenant-scoped paths prospectively', () => {
    expect(migration).toContain('documents_storage_path_org_prefix_chk');
    expect(migration).toContain('storage_path is null');
    expect(migration).toContain('organization_id is not null');
    expect(migration).toContain("storage_path like organization_id::text || '/%'");
    expect(migration).toMatch(/documents_storage_path_org_prefix_chk[\s\S]*?not valid/i);
    expect(migration).toContain('documents_scan_status_chk');
  });

  it('restores the uploader membership boundary as a locked-down security-definer trigger', () => {
    expect(migration).toContain('create or replace function public.enforce_document_uploader_member_scope()');
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = pg_catalog');
    expect(migration).toContain('membership.organization_id = new.organization_id');
    expect(migration).toContain('membership.user_id = new.uploaded_by');
    expect(migration).toContain('revoke all on function public.enforce_document_uploader_member_scope() from authenticated');
    expect(migration).toContain('grant execute on function public.enforce_document_uploader_member_scope() to service_role');
    expect(migration).toContain('create trigger enforce_document_uploader_member_scope');
  });

  it('forces document RLS and denies direct authenticated storage access', () => {
    expect(migration).toContain('alter table public.documents enable row level security');
    expect(migration).toContain('alter table public.documents force row level security');
    expect(migration).toContain("'controlled-documents'");
    expect(migration).toContain('false,\n  10485760');

    for (const policy of [
      'No direct controlled document reads',
      'No direct controlled document uploads',
      'No direct controlled document updates',
      'No direct controlled document deletes',
    ]) {
      expect(migration).toContain(`create policy "${policy}"`);
    }

    expect(migration).toContain("bucket_id = 'controlled-documents' and false");
  });

  it('verifies runtime columns, function privileges, trigger, constraints and bucket policy set before commit', () => {
    expect(migration).toContain('runtime_column_count <> 13');
    expect(migration).toContain("has_function_privilege('anon', uploader_function_oid, 'EXECUTE')");
    expect(migration).toContain("has_function_privilege('authenticated', uploader_function_oid, 'EXECUTE')");
    expect(migration).toContain("has_function_privilege('service_role', uploader_function_oid, 'EXECUTE')");
    expect(migration).toContain("setting = 'search_path=pg_catalog'");
    expect(migration).toContain("tgname = 'enforce_document_uploader_member_scope'");
    expect(migration).toContain('policy_count <> 4');
    expect(migration).toContain("notify pgrst, 'reload schema'");
    expect(migration.trim().endsWith('commit;')).toBe(true);
  });
});
