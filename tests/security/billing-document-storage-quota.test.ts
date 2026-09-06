import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260906004000_billing_document_storage_quota.sql',
  'utf8',
);
const uploadRoute = readFileSync('src/app/api/documents/upload/route.ts', 'utf8');
const templateAction = readFileSync('src/server/actions/template-documents.ts', 'utf8');

describe('billing document storage quota', () => {
  it('serializes document count and storage bytes in the same database INSERT boundary', () => {
    expect(migration).toContain('create or replace function app_private.enforce_document_commercial_quota()');
    expect(migration).toContain('pg_advisory_xact_lock(hashtext(new.organization_id::text))');
    expect(migration).toContain('count(*)::bigint');
    expect(migration).toContain('sum(greatest(coalesce(document.size_bytes, 0), coalesce(document.file_size, 0)))');
    expect(migration).toContain('v_storage_bytes + v_new_bytes > v_storage_limit_bytes');
    expect(migration).toContain("message = 'document_storage_quota_exceeded'");
    expect(migration).toContain('before insert on public.documents');
  });

  it('mirrors the advertised 10/100/500 GB paid-plan storage capacities', () => {
    expect(migration).toContain("('starter'::text,      100::bigint,   10737418240::bigint)");
    expect(migration).toContain("('professional'::text, 1000::bigint, 107374182400::bigint)");
    expect(migration).toContain("('business'::text,     10000::bigint, 536870912000::bigint)");
    expect(migration).toContain("('enterprise'::text,   null::bigint, null::bigint)");
  });

  it('keeps browser roles away from the privileged quota function', () => {
    expect(migration).toContain(
      'revoke all on function app_private.enforce_document_commercial_quota() from public, anon, authenticated',
    );
    expect(migration).toContain(
      'grant execute on function app_private.enforce_document_commercial_quota() to service_role',
    );
  });

  it('persists trusted byte size and compensates storage when metadata insertion is rejected', () => {
    expect(uploadRoute).toContain('size_bytes: uploadValidation.fileSize');
    expect(uploadRoute).toContain('file_size: uploadValidation.fileSize');
    expect(uploadRoute).toContain('await storage.remove([storagePath])');

    expect(templateAction).toContain("sizeBytes: Buffer.byteLength(content, 'utf8')");
    expect(templateAction).toContain('remove([storagePath])');
  });
});
