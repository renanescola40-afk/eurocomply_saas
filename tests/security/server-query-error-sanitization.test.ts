import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const activeQueryFiles = [
  'src/server/queries/ai-systems.ts',
  'src/server/queries/members.ts',
  'src/server/queries/organizations.ts',
  'src/server/queries/risks.ts',
  'src/server/queries/vendors.ts',
  'src/server/queries/compliance-tasks.ts',
];

const failClosedRegisterFiles = [
  'src/server/queries/risks.ts',
  'src/server/queries/vendors.ts',
  'src/server/queries/compliance-tasks.ts',
];

describe('server query error sanitization', () => {
  it('does not throw raw Supabase/Postgres errors or messages', () => {
    for (const path of activeQueryFiles) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toContain('throw new Error(error.message)');
      expect(source, path).not.toContain('throw error');
      expect(source, path).not.toContain('message: error.message');
    }
  });

  it('removes unused tenant detail getters that bypassed shared error handling', () => {
    expect(readFileSync('src/server/queries/risks.ts', 'utf8')).not.toContain('getRisk');
    expect(readFileSync('src/server/queries/vendors.ts', 'utf8')).not.toContain('getVendor');
    expect(readFileSync('src/server/queries/compliance-tasks.ts', 'utf8')).not.toContain('getComplianceTask');
    expect(readFileSync('src/server/queries/organizations.ts', 'utf8')).not.toContain('getOrganizationBySlug');
  });

  it('logs only stable provider error codes before safe failures', () => {
    for (const path of activeQueryFiles) {
      const source = readFileSync(path, 'utf8');
      if (!source.includes('if (error) {')) continue;
      expect(source, path).toContain("code: error.code ?? 'unknown'");
      expect(source, path).not.toContain('details: error.details');
      expect(source, path).not.toContain('hint: error.hint');
    }
  });

  it('does not represent governance register failures as valid empty datasets', () => {
    for (const path of failClosedRegisterFiles) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).toContain('createAdminClient()');
      expect(source, path).not.toContain('tryCreateAdminClient');

      const errorStart = source.indexOf('if (error) {');
      const successReturn = source.lastIndexOf('return data ?? [];');
      expect(errorStart, path).toBeGreaterThanOrEqual(0);
      expect(successReturn, path).toBeGreaterThan(errorStart);

      const errorBranch = source.slice(errorStart, successReturn);
      expect(errorBranch, path).toContain('throw new Error(');
      expect(errorBranch, path).not.toContain('return [];');
    }
  });
});
