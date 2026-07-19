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
    expect(migration).toContain('where system.id = new.ai_system_id');
    expect(migration).toContain(
      'locked_system_organization_id is distinct from new.organization_id',
    );
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('serializes incident validation with concurrent AI system moves', () => {
    expect(migration).toContain('select system.organization_id');
    expect(migration).toContain('into locked_system_organization_id');
    expect(migration).toContain('for share;');
    expect(migration).toContain('if not found');
  });

  it('covers incident inserts and relevant scope-changing updates', () => {
    expect(migration).toContain('before insert or update of organization_id, ai_system_id');
    expect(migration).toContain('on public.ai_incidents');
    expect(migration).toContain('for each row');
  });

  it('prevents organization moves for referenced AI systems', () => {
    expect(migration).toContain('create or replace function public.prevent_referenced_ai_system_scope_move()');
    expect(migration).toContain('before update of organization_id');
    expect(migration).toContain('on public.ai_systems');
    expect(migration).toContain('incident.ai_system_id = old.id');
    expect(migration).toContain('incident.organization_id is distinct from new.organization_id');
    expect(migration).toContain("raise exception 'referenced_ai_system_organization_change_forbidden'");
  });

  it('preserves incidents that do not reference an AI system', () => {
    expect(migration).toContain('if new.ai_system_id is null then');
    expect(migration).toContain('return new;');
  });

  it('does not expose either trigger function for direct execution', () => {
    expect(migration).toContain('revoke all on function public.enforce_ai_incident_system_scope() from public;');
    expect(migration).toContain('revoke all on function public.enforce_ai_incident_system_scope() from anon;');
    expect(migration).toContain('revoke all on function public.enforce_ai_incident_system_scope() from authenticated;');
    expect(migration).toContain('revoke all on function public.prevent_referenced_ai_system_scope_move() from public;');
    expect(migration).toContain('revoke all on function public.prevent_referenced_ai_system_scope_move() from anon;');
    expect(migration).toContain('revoke all on function public.prevent_referenced_ai_system_scope_move() from authenticated;');
  });
});