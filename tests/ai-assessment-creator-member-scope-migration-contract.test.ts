import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260719165000_enforce_ai_assessment_creator_member_scope.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('AI-assessment creator member-scope migration', () => {
  it('requires a non-null creator to belong to the assessment organization', () => {
    expect(migration).toContain('membership.organization_id = new.organization_id');
    expect(migration).toContain('membership.user_id = new.created_by');
    expect(migration).toContain("errcode = '23514'");
  });

  it('preserves nullable creator attribution', () => {
    expect(migration).toContain('if new.created_by is null then');
    expect(migration).toContain('return new;');
  });

  it('covers inserts and tenant- or actor-changing updates', () => {
    expect(migration).toContain('before insert or update of organization_id, created_by');
    expect(migration).toContain('on public.ai_assessments');
  });

  it('hardens the trigger function against caller-controlled name resolution', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      'revoke all on function public.enforce_ai_assessment_creator_member_scope() from authenticated;',
    );
  });
});
