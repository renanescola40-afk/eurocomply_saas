import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260721180100_annex_iv_package_section_integrity.sql',
  ),
  'utf8',
);

describe('Annex IV package-section integrity migration', () => {
  it('adds an organization and package scoped section identity', () => {
    expect(migration).toContain('ai_annex_iv_sections_org_package_id_unique');
    expect(migration).toContain('unique (organization_id, package_id, id)');
  });

  it('binds every evidence row to a section in the same package', () => {
    expect(migration).toContain('ai_annex_iv_evidence_package_section_fk');
    expect(migration).toContain(
      'foreign key (organization_id, package_id, section_id)',
    );
    expect(migration).toContain(
      'references public.ai_annex_iv_sections(organization_id, package_id, id)',
    );
  });

  it('is safe to replay through named constraint guards', () => {
    expect(migration.match(/if not exists/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migration).toContain("conrelid = 'public.ai_annex_iv_sections'::regclass");
    expect(migration).toContain("conrelid = 'public.ai_annex_iv_evidence'::regclass");
  });
});
