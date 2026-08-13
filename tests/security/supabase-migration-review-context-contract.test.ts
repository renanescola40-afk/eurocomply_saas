import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  analyzeMigrationSql,
  liveState,
} from '../../scripts/supabase/build-migration-review-context.mjs';

const workflow = readFileSync('.github/workflows/supabase-migration-review-context.yml', 'utf8');
const builder = readFileSync('scripts/supabase/build-migration-review-context.mjs', 'utf8');

describe('Supabase migration review context boundary', () => {
  it('remains metadata-only and non-crediting', () => {
    expect(workflow).toContain('permissions:\n  actions: read\n  contents: read');
    expect(workflow).toContain('Catalog matches are reviewer aids only');
    expect(workflow).not.toContain('supabase db push');
    expect(workflow).not.toContain('supabase migration repair');
    expect(builder).toContain('acceptedDecisions: 0');
    expect(builder).toContain('productionWriteAuthorized: false');
    expect(builder).toContain('productionWritePerformed: false');
    expect(builder).not.toContain('recommendation:');
  });

  it('parses DROP POLICY IF EXISTS, quoted names and ALTER POLICY without inventing names', () => {
    const analysis = analyzeMigrationSql(`
      DROP POLICY IF EXISTS "Tenant object read" ON storage.objects;
      ALTER POLICY organization_add_ons_read ON public.organization_add_ons USING (auth.uid() IS NOT NULL);
    `);

    expect(analysis.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'policy',
        schema: 'storage',
        parent: 'objects',
        name: 'Tenant object read',
        operations: ['DROP'],
      }),
      expect.objectContaining({
        kind: 'policy',
        schema: 'public',
        parent: 'organization_add_ons',
        name: 'organization_add_ons_read',
        operations: ['ALTER'],
      }),
    ]));
    expect(analysis.references.some((reference) => reference.name.toLowerCase().startsWith('if exists'))).toBe(false);
  });

  it('does not claim ABSENT for schemas outside the captured catalog boundary', () => {
    const keys = new Set<string>();
    const capturedSchemas = new Set(['public', 'app_private']);

    expect(liveState(
      { kind: 'policy', schema: 'storage', parent: 'objects', name: 'tenant_read' },
      keys,
      capturedSchemas,
    )).toBe('NOT_CAPTURED');
    expect(liveState(
      { kind: 'table', schema: 'public', parent: null, name: 'missing_table' },
      keys,
      capturedSchemas,
    )).toBe('ABSENT');
  });
});