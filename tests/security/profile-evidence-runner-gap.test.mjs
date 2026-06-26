import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const runnerSource = readFileSync('scripts/security/run-supabase-live-tenant-isolation-v2.mjs', 'utf8');
const checkerSource = readFileSync('scripts/security/check-p0-supabase-rls-evidence.mjs', 'utf8');
const requiredProfileOperations = ['cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete', 'same_tenant_read'];

describe('profile evidence runner coverage', () => {
  it('keeps the final checker aligned with runner-owned profile test coverage', () => {
    expect(checkerSource).toContain("const userScopedTable = 'profiles'");
    for (const operation of requiredProfileOperations) {
      expect(checkerSource).toContain(operation);
      expect(runnerSource).toContain(operation);
    }

    expect(runnerSource).toContain('profiles: { seed: { id: userB.id');
    expect(runnerSource).toContain('insert: { id: userAViewer.id');
    expect(runnerSource).toContain('update: { full_name:');
    expect(runnerSource).not.toContain("['organizations', 'organization_members', 'profiles'].includes(table)");
  });
});
