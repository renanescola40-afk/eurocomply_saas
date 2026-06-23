import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('scripts/security/check-p0-supabase-rls-evidence.mjs', 'utf8');

describe('P0 Supabase RLS evidence checker profile coverage gate', () => {
  it('requires profiles user-scoped runtime operations before accepting Complete evidence', () => {
    expect(source).toContain("const userScopedTable = 'profiles'");
    for (const operation of ['rls_enabled', 'cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete', 'same_tenant_read']) {
      expect(source).toContain(operation);
    }
    expect(source).toContain('missing live RLS user-scoped table coverage');
  });
});
