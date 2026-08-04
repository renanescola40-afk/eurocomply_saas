import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260804230332_move_rls_helpers_to_private_schema.sql',
  'utf8',
).toLowerCase();

const helpers = [
  'is_org_member(uuid)',
  'has_org_role(uuid, text[])',
  'has_org_write_role(uuid)',
  'live_rls_validation_is_org_member(uuid)',
];

describe('private RLS helper schema migration', () => {
  it('creates a non-public schema with explicit role access', () => {
    expect(migration).toContain('create schema if not exists app_private');
    expect(migration).toContain('revoke all on schema app_private from public, anon');
    expect(migration).toContain(
      'grant usage on schema app_private to authenticated, service_role',
    );
  });

  it.each(helpers)('moves public.%s atomically', (signature) => {
    expect(migration).toContain(
      `alter function public.${signature} set schema app_private`,
    );
  });

  it.each(helpers)('does not expose app_private.%s to anonymous callers', (signature) => {
    expect(migration).toContain(
      `revoke all on function app_private.${signature} from public, anon`,
    );
  });

  it('rebinds wrappers to private-qualified helpers', () => {
    expect(migration).toContain('select app_private.has_org_role(');
    expect(migration).toContain('select app_private.is_org_member(target_organization_id)');
  });

  it('does not mutate application rows', () => {
    expect(migration).not.toMatch(/\b(?:insert\s+into|update|delete\s+from|truncate)\b/);
  });
});
