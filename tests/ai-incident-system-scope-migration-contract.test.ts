import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260719125500_enforce_ai_incident_system_scope.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('AI incident system tenant-scope migration', () => {
  it('creates the composite parent key idempotently', () => {
    expect(migration).toContain("conname = 'ai_systems_id_organization_id_key'");
    expect(migration).toContain("conrelid = 'public.ai_systems'::regclass");
    expect(migration).toContain('unique (id, organization_id)');
  });

  it('constrains the incident system and organization as one relationship', () => {
    expect(migration).toContain("conname = 'ai_incidents_system_organization_fkey'");
    expect(migration).toContain("conrelid = 'public.ai_incidents'::regclass");
    expect(migration).toContain('foreign key (ai_system_id, organization_id)');
    expect(migration).toContain('references public.ai_systems (id, organization_id)');
  });

  it('validates existing rows instead of accepting an unverified constraint', () => {
    expect(migration).not.toMatch(/\bnot\s+valid\b/i);
    expect(migration).not.toMatch(/\bvalidate\s+constraint\b/i);
  });

  it('preserves the original single-column SET NULL relationship', () => {
    const source = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260610_ai_incident_register.sql'),
      'utf8',
    );

    expect(source).toContain(
      'ai_system_id uuid references public.ai_systems(id) on delete set null',
    );
    expect(migration).not.toMatch(/drop\s+constraint/i);
  });

  it('does not rely on trigger snapshots for tenant integrity', () => {
    expect(migration).not.toMatch(/create\s+(?:or\s+replace\s+)?function/i);
    expect(migration).not.toMatch(/create\s+trigger/i);
  });
});
