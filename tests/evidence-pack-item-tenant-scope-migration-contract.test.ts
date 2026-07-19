import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260719200000_enforce_evidence_pack_item_tenant_scope.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('evidence-pack item tenant-scope migration', () => {
  it('creates the parent composite key required for tenant-scoped references', () => {
    expect(migration).toContain('unique (id, organization_id)');
    expect(migration).toContain(
      "conname = 'enterprise_evidence_packs_id_organization_id_key'",
    );
    expect(migration).toContain(
      "conrelid = 'public.enterprise_evidence_packs'::regclass",
    );
  });

  it('requires pack and organization identifiers to match together', () => {
    expect(migration).toContain('foreign key (pack_id, organization_id)');
    expect(migration).toContain(
      'references public.enterprise_evidence_packs (id, organization_id)',
    );
    expect(migration).toContain('on delete cascade');
  });

  it('validates the constraint immediately instead of accepting unverified legacy rows', () => {
    expect(migration).not.toContain('not valid');
    expect(migration).not.toContain('validate constraint');
  });

  it('guards both constraints against duplicate creation', () => {
    expect(migration).toContain(
      "conname = 'enterprise_evidence_pack_items_pack_organization_fkey'",
    );
    expect(migration).toContain(
      "conrelid = 'public.enterprise_evidence_pack_items'::regclass",
    );
  });
});
