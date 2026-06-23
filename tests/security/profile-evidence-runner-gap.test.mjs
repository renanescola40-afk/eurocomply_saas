import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const runnerSource = readFileSync('scripts/security/run-supabase-live-tenant-isolation-v2.mjs', 'utf8');
const checkerSource = readFileSync('scripts/security/check-p0-supabase-rls-evidence.mjs', 'utf8');

describe('profile evidence runner coverage', () => {
  it('keeps the final checker aligned with runner-owned profile test coverage', () => {
    expect(checkerSource).toContain("const userScopedTable = 'profiles'");
    expect(checkerSource).toContain('cross_tenant_read');
    expect(checkerSource).toContain('cross_tenant_insert');
    expect(checkerSource).toContain('cross_tenant_update');
    expect(checkerSource).toContain('cross_tenant_delete');
    expect(checkerSource).toContain('same_tenant_read');

    expect(runnerSource).not.toContain("['organizations', 'organization_members', 'profiles'].includes(table)");
  });
});
