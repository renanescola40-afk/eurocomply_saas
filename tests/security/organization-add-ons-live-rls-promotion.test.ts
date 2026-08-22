import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260822123538_v19_optimize_organization_add_ons_rls_initplan.sql';

describe('organization add-ons live RLS promotion', () => {
  it('keeps the merged migration tenant-scoped and initplan-optimized', () => {
    const migration = fs.readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('alter policy "organization members can read add-ons"');
    expect(migration).toContain('to authenticated');
    expect(migration).toContain(
      'members.organization_id = organization_add_ons.organization_id',
    );
    expect(migration).toContain('members.user_id = (select auth.uid())');
    expect(migration).not.toContain('members.user_id = auth.uid()');
  });

  it('promotes only through the protected allowlisted live-RLS path', () => {
    const workflow = fs.readFileSync('.github/workflows/supabase-live-rls-validation.yml', 'utf8');

    expect(workflow).toContain('environment: supabase-live-rls-validation');
    expect(workflow).toContain('Apply allowlisted live RLS proof migrations');
    expect(workflow).toContain(migrationPath);
    expect(workflow).toContain('Verify organization add-ons RLS performance boundary');
    expect(workflow).toContain("position('SELECT auth.uid()' in policy_qual) = 0");
    expect(workflow).toContain("has_table_privilege('authenticated', 'public.organization_add_ons', 'SELECT')");
    expect(workflow).toContain("has_table_privilege('anon', 'public.organization_add_ons', 'SELECT')");
    expect(workflow).not.toContain('supabase db push');
    expect(workflow).not.toContain('migration repair');
    expect(workflow).not.toContain('--include-all');
  });
});
