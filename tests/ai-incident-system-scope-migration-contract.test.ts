import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260719125500_enforce_ai_incident_system_scope.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('AI incident system tenant-scope migration', () => {
  it('enforces that linked AI systems belong to the incident organization', () => {
    expect(migration).toContain('create or replace function public.enforce_ai_incident_system_scope()');
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain('system.id = new.ai_system_id');
    expect(migration).toContain('system.organization_id = new.organization_id');
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('covers inserts and relevant scope-changing updates', () => {
    expect(migration).toContain('before insert or update of organization_id, ai_system_id');
    expect(migration).toContain('on public.ai_incidents');
    expect(migration).toContain('for each row');
  });

  it('preserves incidents that do not reference an AI system', () => {
    expect(migration).toContain('if new.ai_system_id is null then');
    expect(migration).toContain('return new;');
  });

  it('does not expose the trigger function for direct execution', () => {
    expect(migration).toContain('revoke all on function public.enforce_ai_incident_system_scope() from public;');
    expect(migration).toContain('revoke all on function public.enforce_ai_incident_system_scope() from anon;');
    expect(migration).toContain('revoke all on function public.enforce_ai_incident_system_scope() from authenticated;');
  });
});
