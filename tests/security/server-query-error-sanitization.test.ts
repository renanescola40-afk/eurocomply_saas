import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const activeQueryFiles = [
  'src/server/queries/members.ts',
  'src/server/queries/organizations.ts',
  'src/server/queries/risks.ts',
  'src/server/queries/vendors.ts',
  'src/server/queries/compliance-tasks.ts',
];

describe('server query error sanitization', () => {
  it('does not throw raw Supabase/Postgres error messages', () => {
    for (const path of activeQueryFiles) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toContain('throw new Error(error.message)');
      expect(source, path).not.toContain('throw error');
    }
  });

  it('removes unused tenant detail getters that bypassed shared error handling', () => {
    expect(readFileSync('src/server/queries/risks.ts', 'utf8')).not.toContain('getRisk');
    expect(readFileSync('src/server/queries/vendors.ts', 'utf8')).not.toContain('getVendor');
    expect(readFileSync('src/server/queries/compliance-tasks.ts', 'utf8')).not.toContain('getComplianceTask');
    expect(readFileSync('src/server/queries/organizations.ts', 'utf8')).not.toContain('getOrganizationBySlug');
  });

  it('logs only stable provider error codes before safe failures', () => {
    const members = readFileSync('src/server/queries/members.ts', 'utf8');
    const organizations = readFileSync('src/server/queries/organizations.ts', 'utf8');
    expect(members).toContain("code: error.code ?? 'unknown'");
    expect(organizations).toContain("code: error.code ?? 'unknown'");
    expect(members).not.toContain('message: error.message');
    expect(organizations).not.toContain('message: error.message');
  });
});
