import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260822123538_v19_optimize_organization_add_ons_rls_initplan.sql';
const migrationFilename = migrationPath.replace('supabase/migrations/', '');

describe('organization add-ons governed forward promotion', () => {
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

  it('promotes through the canonical bounded forward chain and proves the live policy read-only afterward', () => {
    const config = JSON.parse(
      fs.readFileSync('config/supabase-forward-reconciliation-v23.json', 'utf8'),
    ) as { migrations: Array<{ filename: string }> };
    const promotion = fs.readFileSync(
      '.github/workflows/supabase-forward-reconciliation-production-promotion.yml',
      'utf8',
    );
    const postconditions = fs.readFileSync(
      'scripts/supabase/verify-forward-reconciliation-postconditions.sql',
      'utf8',
    ).toLowerCase();
    const liveProof = fs.readFileSync('.github/workflows/supabase-live-rls-validation.yml', 'utf8');

    expect(config.migrations.map((item) => item.filename)).toContain(migrationFilename);
    expect(promotion).toContain('Supabase Forward Reconciliation Production Promotion');
    expect(promotion).toContain('verify-forward-reconciliation-postconditions.sql');
    expect(postconditions).toContain("policy.polrelid = 'public.organization_add_ons'::regclass");
    expect(postconditions).toContain("policy.polname = 'organization members can read add-ons'");
    expect(postconditions).toContain('statement-scoped auth initplan');
    expect(liveProof).toContain('validate-supabase-live-promotion-source.mjs');
    expect(liveProof).not.toContain(migrationPath);
    expect(liveProof).not.toContain('db push');
    expect(liveProof).not.toContain('psql ');
    expect(liveProof).not.toContain('--include-all');
  });
});
