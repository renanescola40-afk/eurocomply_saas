import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260719224500_enforce_organization_invite_creator_scope.sql',
  ),
  'utf8',
);

describe('organization invite creator member-scope migration', () => {
  it('requires creator membership in the invitation organization', () => {
    expect(migration).toContain('member.organization_id = new.organization_id');
    expect(migration).toContain('member.user_id = new.created_by');
    expect(migration).toContain("errcode = '23514'");
  });

  it('preserves system-created invitations with no creator', () => {
    expect(migration).toContain('if new.created_by is null then');
    expect(migration).toContain('return new;');
  });

  it('covers inserts and only scope-changing updates', () => {
    expect(migration).toContain(
      'before insert or update of organization_id, created_by',
    );
    expect(migration).not.toContain('before insert or update\non');
  });

  it('hardens the trigger function against direct callers and search-path injection', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      'revoke all on function public.enforce_organization_invite_creator_scope() from public',
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_organization_invite_creator_scope() from anon',
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_organization_invite_creator_scope() from authenticated',
    );
  });
});
