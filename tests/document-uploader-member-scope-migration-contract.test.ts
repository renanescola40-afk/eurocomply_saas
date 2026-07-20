import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260720024500_enforce_document_uploader_member_scope.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('document uploader member-scope migration', () => {
  it('requires a non-null uploader to belong to the document organization', () => {
    expect(migration).toContain('membership.organization_id = new.organization_id');
    expect(migration).toContain('membership.user_id = new.uploaded_by');
    expect(migration).toContain("errcode = '23514'");
  });

  it('preserves nullable uploader attribution', () => {
    expect(migration).toContain('if new.uploaded_by is null then');
    expect(migration).toContain('return new;');
  });

  it('covers inserts and tenant- or actor-changing updates', () => {
    expect(migration).toContain('before insert or update of organization_id, uploaded_by');
    expect(migration).toContain('on public.documents');
  });

  it('hardens the trigger function against caller-controlled name resolution', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      'revoke all on function public.enforce_document_uploader_member_scope() from authenticated;',
    );
  });
});
