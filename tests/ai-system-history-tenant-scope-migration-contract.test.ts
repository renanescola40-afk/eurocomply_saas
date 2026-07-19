import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260719134500_enforce_ai_system_history_tenant_scope.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('AI-system history tenant-scope migration', () => {
  it('creates the parent composite key required for tenant-scoped references', () => {
    expect(migration).toContain('unique (id, organization_id)');
    expect(migration).toContain("conname = 'ai_systems_id_organization_id_key'");
    expect(migration).toContain("conrelid = 'public.ai_systems'::regclass");
  });

  it('requires history system and organization identifiers to match together', () => {
    expect(migration).toContain('foreign key (ai_system_id, organization_id)');
    expect(migration).toContain('references public.ai_systems (id, organization_id)');
    expect(migration).toContain('on delete cascade');
  });

  it('validates the constraint immediately rather than accepting unverified legacy rows', () => {
    expect(migration).not.toContain('not valid');
    expect(migration).not.toContain('validate constraint');
  });

  it('is guarded against duplicate constraint creation', () => {
    expect(migration).toContain("conname = 'ai_system_history_system_organization_fkey'");
    expect(migration).toContain("conrelid = 'public.ai_system_history'::regclass");
  });
});
