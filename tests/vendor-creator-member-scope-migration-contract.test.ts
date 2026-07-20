import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = new URL(
  '../supabase/migrations/20260719234000_enforce_vendor_creator_member_scope.sql',
  import.meta.url,
);
const migration = readFileSync(migrationPath, 'utf8');

describe('vendor creator member scope migration', () => {
  it('keeps the creator guard tenant-scoped and hardened', () => {
    expect(migration).toMatch(
      /create or replace function public\.enforce_vendor_creator_member_scope\(\)/i,
    );
    expect(migration).toMatch(/security definer/i);
    expect(migration).toMatch(/set search_path = ''/i);
    expect(migration).toMatch(
      /membership\.organization_id = new\.organization_id/i,
    );
    expect(migration).toMatch(/membership\.user_id = new\.created_by/i);
    expect(migration).toMatch(/errcode = '23514'/i);
  });

  it('covers inserts and scope-changing updates', () => {
    expect(migration).toMatch(
      /before insert or update of organization_id, created_by\s+on public\.vendors/i,
    );
    expect(migration).toMatch(
      /execute function public\.enforce_vendor_creator_member_scope\(\)/i,
    );
  });

  it('preserves system attribution and denies direct execution', () => {
    expect(migration).toMatch(/if new\.created_by is null then\s+return new;/i);
    expect(migration).toMatch(
      /revoke all on function public\.enforce_vendor_creator_member_scope\(\) from public;/i,
    );
    expect(migration).toMatch(
      /revoke all on function public\.enforce_vendor_creator_member_scope\(\) from anon;/i,
    );
    expect(migration).toMatch(
      /revoke all on function public\.enforce_vendor_creator_member_scope\(\) from authenticated;/i,
    );
  });
});
