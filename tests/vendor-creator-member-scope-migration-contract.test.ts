import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationPath = new URL(
  '../supabase/migrations/20260719234000_enforce_vendor_creator_member_scope.sql',
  import.meta.url,
);
const migration = readFileSync(migrationPath, 'utf8');

test('vendor creator guard is tenant-scoped and hardened', () => {
  assert.match(
    migration,
    /create or replace function public\.enforce_vendor_creator_member_scope\(\)/i,
  );
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(
    migration,
    /membership\.organization_id = new\.organization_id/i,
  );
  assert.match(migration, /membership\.user_id = new\.created_by/i);
  assert.match(migration, /errcode = '23514'/i);
});

test('vendor creator guard covers inserts and scope-changing updates', () => {
  assert.match(
    migration,
    /before insert or update of organization_id, created_by\s+on public\.vendors/i,
  );
  assert.match(
    migration,
    /execute function public\.enforce_vendor_creator_member_scope\(\)/i,
  );
});

test('vendor creator guard preserves system attribution and is not directly executable', () => {
  assert.match(migration, /if new\.created_by is null then\s+return new;/i);
  assert.match(
    migration,
    /revoke all on function public\.enforce_vendor_creator_member_scope\(\) from public;/i,
  );
  assert.match(
    migration,
    /revoke all on function public\.enforce_vendor_creator_member_scope\(\) from anon;/i,
  );
  assert.match(
    migration,
    /revoke all on function public\.enforce_vendor_creator_member_scope\(\) from authenticated;/i,
  );
});
